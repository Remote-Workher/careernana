import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_LOGO_BYTES = 4 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp", "image/svg+xml"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "not_authenticated" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: userData, error: userError } = await admin.auth.getUser(token);
    const user = userData?.user;
    if (userError || !user) return json({ error: "not_authenticated" }, 401);

    const { data: recruiter } = await admin
      .from("recruiter_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!recruiter) return json({ error: "recruiter_profile_required" }, 403);

    const body = await req.json();
    const fileName = String(body?.fileName || "logo.png");
    const contentType = String(body?.contentType || "").toLowerCase();
    const base64 = String(body?.base64 || "");

    if (!ALLOWED_TYPES.has(contentType)) return json({ error: "invalid_file_type" }, 400);
    if (!base64) return json({ error: "missing_file" }, 400);

    const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
    if (bytes.byteLength > MAX_LOGO_BYTES) return json({ error: "file_too_large" }, 400);

    const rawExt = (fileName.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
    const ext = rawExt === "jpeg" ? "jpg" : rawExt || "png";
    const path = `${user.id}/logo-${Date.now()}.${ext}`;

    const { error: uploadError } = await admin.storage
      .from("company-logos")
      .upload(path, bytes, { contentType, upsert: false, cacheControl: "3600" });
    if (uploadError) return json({ error: uploadError.message }, 500);

    const { data } = admin.storage.from("company-logos").getPublicUrl(path);
    return json({ publicUrl: data.publicUrl });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "upload_failed" }, 500);
  }
});

function json(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}