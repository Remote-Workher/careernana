import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${token}` } } },
    );

    const { data: { user } } = await sb.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const {
      job_title = "",
      company = "",
      description = "",
      requirements = "",
      employer_email = "",
    } = body || {};

    if (!job_title || !employer_email) {
      return new Response(JSON.stringify({ error: "Missing job details" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Charge 1 coin
    const { data: consumed, error: consumeErr } = await sb.rpc("consume_tokens", { _amount: 1 });
    if (consumeErr) {
      const msg = String(consumeErr.message || "");
      if (msg.includes("profile_not_found")) {
        return new Response(JSON.stringify({ error: "Profile not found" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw consumeErr;
    }

    // Pull sender context
    let profileBlock = "";
    let bragBlock = "";
    let senderName = "";
    try {
      const { data: profile } = await sb
        .from("profiles")
        .select("full_name,job_title,current_role,target_role,bio,skills,linkedin_url,portfolio_url,city,location,email,phone")
        .eq("user_id", user.id)
        .maybeSingle();
      if (profile) {
        senderName = profile.full_name || "";
        const skills = Array.isArray(profile.skills) ? profile.skills.join(", ") : "";
        profileBlock = [
          profile.full_name && `Name: ${profile.full_name}`,
          (profile.current_role || profile.job_title) && `Current role: ${profile.current_role || profile.job_title}`,
          profile.target_role && `Target role: ${profile.target_role}`,
          profile.bio && `Bio: ${profile.bio}`,
          skills && `Skills: ${skills}`,
          profile.linkedin_url && `LinkedIn: ${profile.linkedin_url}`,
          profile.portfolio_url && `Portfolio: ${profile.portfolio_url}`,
          (profile.city || profile.location) && `Location: ${profile.city || profile.location}`,
          profile.email && `Email: ${profile.email}`,
          profile.phone && `Phone: ${profile.phone}`,
        ].filter(Boolean).join("\n");
      }

      const { data: wins } = await sb
        .from("brag_entries")
        .select("title,impact,metric")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);
      if (wins?.length) {
        bragBlock = wins.map((w: any) => `- ${w.title}${w.impact ? ` — ${w.impact}` : ""}${w.metric ? ` (${w.metric})` : ""}`).join("\n");
      }
    } catch { /* ignore */ }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const SYSTEM_PROMPT = `You write job application emails that get replies from Nigerian employers.

Rules:
- Warm, professional, confident — not stiff or generic.
- Open with the role being applied for and ONE specific reason this candidate fits.
- One short paragraph on most relevant experience tied to the JD requirements.
- One short paragraph on what they'd bring + a clear next step.
- Mention that resume/CV is attached.
- 150–220 words.
- No buzzwords. No "I hope this finds you well". No markdown. No asterisks.
- Plain text only. Real newlines between paragraphs.

OUTPUT FORMAT exactly:

Subject: [specific subject line including the role title]

---

Dear Hiring Manager,

[email body with paragraphs separated by blank lines]

Best regards,
[Sender name]
[Email] | [Phone if available]`;

    const userPrompt = `Write an application email for this job:

ROLE: ${job_title}
COMPANY: ${company}
EMPLOYER EMAIL: ${employer_email}

JOB DESCRIPTION:
${(description || "").slice(0, 3000)}

REQUIREMENTS:
${(requirements || "").slice(0, 1500)}

ABOUT THE CANDIDATE (use only what's here, never invent):
${profileBlock || "(no profile data — use bracketed placeholders like [Your most relevant experience])"}

${bragBlock ? `RECENT WINS (use ONE if it directly proves fit for this role):\n${bragBlock}\n` : ""}

Write the email now. Return ONLY the email — no preamble, no explanation, no code fences.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (resp.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again in a moment." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (resp.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!resp.ok) {
      const t = await resp.text();
      console.error("AI gateway error:", resp.status, t);
      throw new Error("AI gateway error");
    }

    const data = await resp.json();
    let raw = data?.choices?.[0]?.message?.content || "";
    raw = raw.replace(/^```[a-z]*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
    raw = raw.replace(/\*\*(.+?)\*\*/g, "$1");

    // Split subject + body
    let subject = `Application — ${job_title}`;
    let emailBody = raw;
    const subjMatch = raw.match(/^Subject:\s*(.+)$/im);
    if (subjMatch) {
      subject = subjMatch[1].trim();
      emailBody = raw
        .replace(/^Subject:.*$/im, "")
        .replace(/^---\s*$/m, "")
        .trim();
    }

    return new Response(
      JSON.stringify({
        subject,
        body: emailBody,
        sender_name: senderName,
        coins_remaining: consumed,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("generate-application-email error:", e);
    return new Response(JSON.stringify({ error: e?.message || "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
