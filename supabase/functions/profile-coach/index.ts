import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const authHeader = req.headers.get("authorization") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) throw new Error("Unauthorized");

    // Pull profile context
    const { data: profile } = await supabase
      .from("profiles")
      .select("target_roles, target_role, skills, career_goal, target_salary_min, location, city, work_preference, years_experience, current_role, resume_file_name")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!profile) throw new Error("Profile not found");

    // Try latest parsed resume content (from resume_versions)
    const { data: latestResume } = await supabase
      .from("resume_versions")
      .select("generated_content")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const targetRoles = (profile.target_roles ?? []) as string[];
    const skills = (profile.skills ?? []) as string[];
    const role = targetRoles[0] || profile.target_role || profile.current_role || "professional role";
    const salary = profile.target_salary_min ? `₦${profile.target_salary_min.toLocaleString()}+ /mo` : "not set";
    const goal = profile.career_goal || "Not provided";
    const loc = profile.location || profile.city || "Nigeria";
    const resumeSnippet = (latestResume?.generated_content || "").slice(0, 3000);

    const systemPrompt = `You are Remote Workher AI, a career coach for Nigerian/African women using Remote Workher.
You help users sharpen their profile so they get hired faster.
Tone: warm, sharp, execution-first. No fluff. Naira (₦) for money. Today's market context: Nigeria 2026.`;

    const userPrompt = `User profile context:
- Target role: ${role}${targetRoles.length > 1 ? ` (also: ${targetRoles.slice(1).join(", ")})` : ""}
- Target salary: ${salary}
- Career goal: ${goal}
- Location: ${loc}
- Current skills listed: ${skills.length ? skills.join(", ") : "(none yet)"}
- Resume on file: ${profile.resume_file_name ? "Yes" : "No"}
${resumeSnippet ? `- Resume excerpt:\n${resumeSnippet}\n` : ""}

Generate:
1) suggestedSkills — up to 8 skills she should add to her profile to win the target role at the target salary in Nigeria. Exclude any she already has. Be specific (e.g. "SQL", "Stakeholder Management", "Figma Auto Layout") not generic ("teamwork").
2) tasks — 3 to 5 short, concrete next actions to make her profile + resume + applications stronger. Each: { title (≤8 words, verb-led), why (1 sentence, plain English), action (one of: "update_resume" | "apply_jobs" | "add_skill" | "set_salary" | "add_brag" | "edit_profile") }.
3) recommendedRoles — 3 to 5 specific job titles she should be applying to right now in Nigeria, given her resume + goal. Mix realistic and stretch.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "profile_suggestions",
              description: "Return profile coaching suggestions",
              parameters: {
                type: "object",
                properties: {
                  suggestedSkills: { type: "array", items: { type: "string" }, maxItems: 8 },
                  tasks: {
                    type: "array",
                    maxItems: 5,
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        why: { type: "string" },
                        action: {
                          type: "string",
                          enum: ["update_resume", "apply_jobs", "add_skill", "set_salary", "add_brag", "edit_profile"],
                        },
                      },
                      required: ["title", "why", "action"],
                      additionalProperties: false,
                    },
                  },
                  recommendedRoles: { type: "array", items: { type: "string" }, maxItems: 5 },
                },
                required: ["suggestedSkills", "tasks", "recommendedRoles"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "profile_suggestions" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const call = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!call) throw new Error("No suggestions returned");
    const args = JSON.parse(call.function.arguments);

    return new Response(JSON.stringify(args), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("profile-coach error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
