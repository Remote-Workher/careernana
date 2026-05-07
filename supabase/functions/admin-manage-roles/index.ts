import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userData?.user?.id) return json({ error: "Unauthorized" }, 401);
    const callerId = userData.user.id;

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Verify caller is admin
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    // Caller's super-admin status (for gating scope changes)
    const { data: callerScope } = await admin
      .from("admin_scopes")
      .select("is_super")
      .eq("user_id", callerId)
      .maybeSingle();
    const callerIsSuper = !!callerScope?.is_super;

    if (action === "list") {
      const { data: roles } = await admin
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");
      const ids = (roles || []).map((r: any) => r.user_id);
      const { data: scopes } = await admin
        .from("admin_scopes")
        .select("user_id, is_super, sections")
        .in("user_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
      const scopeMap = new Map((scopes || []).map((s: any) => [s.user_id, s]));
      const admins: any[] = [];
      for (const id of ids) {
        const { data: u } = await admin.auth.admin.getUserById(id);
        const s = scopeMap.get(id);
        admins.push({
          user_id: id,
          email: u?.user?.email || null,
          created_at: u?.user?.created_at || null,
          is_super: !!s?.is_super,
          sections: s?.sections || [],
        });
      }
      return json({ admins, caller_is_super: callerIsSuper });
    }

    if (action === "add") {
      if (!callerIsSuper) return json({ error: "Only super admins can add admins." }, 403);
      const email = String(body.email || "").trim().toLowerCase();
      const isSuper = !!body.is_super;
      const sections: string[] = Array.isArray(body.sections) ? body.sections : [];
      if (!email) return json({ error: "Email required" }, 400);

      let foundId: string | null = null;
      let page = 1;
      while (page <= 10) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
        if (error) break;
        const u = data.users.find((x) => (x.email || "").toLowerCase() === email);
        if (u) { foundId = u.id; break; }
        if (data.users.length < 200) break;
        page++;
      }

      let invited = false;
      if (!foundId) {
        // Send invite email so they can set up their account
        const origin = req.headers.get("origin") || req.headers.get("referer") || "";
        const redirectTo = origin ? `${origin.replace(/\/$/, "")}/admin/login` : undefined;
        const { data: inv, error: invErr } = await admin.auth.admin.inviteUserByEmail(email, {
          redirectTo,
          data: { account_type: "admin" },
        });
        if (invErr || !inv?.user?.id) {
          return json({ error: invErr?.message || "Could not send invite" }, 400);
        }
        foundId = inv.user.id;
        invited = true;
      }

      const { error: insErr } = await admin
        .from("user_roles")
        .insert({ user_id: foundId, role: "admin" });
      if (insErr && !String(insErr.message).includes("duplicate")) {
        return json({ error: insErr.message }, 400);
      }
      await admin.from("admin_scopes").upsert({
        user_id: foundId,
        is_super: isSuper,
        sections: isSuper ? [] : sections,
      });
      return json({ ok: true, invited });
    }

    if (action === "update_scope") {
      if (!callerIsSuper) return json({ error: "Only super admins can change scopes." }, 403);
      const userId = String(body.user_id || "");
      const isSuper = !!body.is_super;
      const sections: string[] = Array.isArray(body.sections) ? body.sections : [];
      if (!userId) return json({ error: "user_id required" }, 400);
      if (userId === callerId && !isSuper) {
        return json({ error: "You can't demote yourself from super admin." }, 400);
      }
      const { error } = await admin.from("admin_scopes").upsert({
        user_id: userId,
        is_super: isSuper,
        sections: isSuper ? [] : sections,
      });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    if (action === "send_login_link") {
      if (!callerIsSuper) return json({ error: "Only super admins can send login links." }, 403);
      const email = String(body.email || "").trim().toLowerCase();
      if (!email) return json({ error: "email required" }, 400);

      // Verify recipient is actually an admin
      let targetId: string | null = null;
      let p = 1;
      while (p <= 10) {
        const { data, error } = await admin.auth.admin.listUsers({ page: p, perPage: 200 });
        if (error) break;
        const u = data.users.find((x) => (x.email || "").toLowerCase() === email);
        if (u) { targetId = u.id; break; }
        if (data.users.length < 200) break;
        p++;
      }
      if (!targetId) return json({ error: "No account found for that email." }, 404);
      const { data: isAdmin } = await admin
        .from("user_roles").select("role")
        .eq("user_id", targetId).eq("role", "admin").maybeSingle();
      if (!isAdmin) return json({ error: "That user isn't an admin." }, 400);

      const origin = req.headers.get("origin") || req.headers.get("referer") || "";
      const redirectTo = origin ? `${origin.replace(/\/$/, "")}/admin` : undefined;

      // Send a magic link email via Supabase Auth
      const publicClient = createClient(SUPABASE_URL, ANON);
      const { error } = await publicClient.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false, emailRedirectTo: redirectTo },
      });
      if (error) return json({ ok: false, error: error.message }, 200);
      return json({ ok: true });
    }

    if (action === "remove") {
      if (!callerIsSuper) return json({ error: "Only super admins can remove admins." }, 403);
      const userId = String(body.user_id || "");
      if (!userId) return json({ error: "user_id required" }, 400);
      if (userId === callerId) return json({ error: "You can't remove yourself." }, 400);
      await admin.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
      await admin.from("admin_scopes").delete().eq("user_id", userId);
      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
