// Generates job description / skills / requirements / benefits using Lovable AI.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Kind = "description" | "skills" | "requirements" | "benefits" | "all";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { kind, title, company, experience_level, work_type, job_type, location, description, skills } =
      await req.json();
    if (!title || typeof title !== "string") {
      return j({ error: "Missing job title" }, 400);
    }
    const which = (kind ?? "all") as Kind;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const sys =
      "You are a senior hiring manager writing a polished, concise remote-friendly job listing for a Nigerian/African talent platform (Remote Workher). Be warm, specific, and avoid corporate fluff. Never invent salary numbers.";

    const ctx = `Role: ${title}
Company: ${company || "(not specified)"}
Job type: ${job_type || "Full-time"}
Work type: ${work_type || "Remote"}
Experience: ${experience_level || "Mid"}
Location: ${location || "Remote"}
Existing description: ${description || "(none)"}
Existing skills: ${(skills || []).join(", ") || "(none)"}`;

    const properties: Record<string, unknown> = {};
    const required: string[] = [];
    if (which === "description" || which === "all") {
      properties.description = {
        type: "string",
        description: "2-3 short paragraphs (~120-180 words) describing the role, ownership and impact.",
      };
      required.push("description");
    }
    if (which === "skills" || which === "all") {
      properties.skills = {
        type: "array",
        items: { type: "string" },
        description: "5-8 concrete required skills, single keywords or 2-word phrases.",
      };
      required.push("skills");
    }
    if (which === "requirements" || which === "all") {
      properties.requirements = {
        type: "string",
        description: "5-7 bullet points (each starting with '• ') of must-haves for the role.",
      };
      required.push("requirements");
    }
    if (which === "benefits" || which === "all") {
      properties.benefits = {
        type: "string",
        description: "4-6 bullet points (each starting with '• ') of perks/benefits typical for this kind of role.",
      };
      required.push("benefits");
    }

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: `${ctx}\n\nGenerate the requested fields.` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_job_content",
              description: "Return generated job listing content.",
              parameters: { type: "object", properties, required, additionalProperties: false },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_job_content" } },
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429) return j({ error: "Rate limited, try again shortly." }, 429);
      if (resp.status === 402) return j({ error: "AI credits exhausted." }, 402);
      const t = await resp.text();
      console.error("AI error", resp.status, t);
      return j({ error: "AI gateway error" }, 500);
    }

    const data = await resp.json();
    const call = data.choices?.[0]?.message?.tool_calls?.[0];
    const args = call?.function?.arguments ? JSON.parse(call.function.arguments) : {};
    return j(args);
  } catch (e) {
    console.error("generate-job-content error:", e);
    return j({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function j(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
