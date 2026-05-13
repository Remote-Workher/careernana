import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, Users, Globe, Lock } from "lucide-react";
import { useSEO } from "@/components/SEO";

type Registration = {
  id: string;
  created_at: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  is_guest: boolean;
  user_id: string | null;
};

type ProfileLite = { user_id: string; full_name: string | null; email: string | null };

export default function AdminLiveSessionDetail() {
  useSEO({ title: "Live Session — Admin" });
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [session, setSession] = useState<any | null>(null);
  const [regs, setRegs] = useState<Registration[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/admin/login", { replace: true }); return; }
      const { data: role } = await supabase
        .from("user_roles").select("role")
        .eq("user_id", user.id).eq("role", "admin").maybeSingle();
      setAuthorized(!!role);
      setChecking(false);
    })();
  }, [navigate]);

  useEffect(() => {
    if (!authorized || !id) return;
    (async () => {
      setLoading(true);
      const [{ data: s }, { data: r }] = await Promise.all([
        (supabase.from("live_sessions") as any).select("*").eq("id", id).maybeSingle(),
        (supabase.from("live_session_registrations") as any)
          .select("*").eq("session_id", id)
          .order("created_at", { ascending: false }),
      ]);
      setSession(s);
      const list = (r as Registration[]) || [];
      setRegs(list);
      const userIds = list.filter(x => x.user_id).map(x => x.user_id!) as string[];
      if (userIds.length) {
        const { data: profs } = await (supabase.from("profiles") as any)
          .select("user_id, full_name, email").in("user_id", userIds);
        const map: Record<string, ProfileLite> = {};
        (profs || []).forEach((p: ProfileLite) => { map[p.user_id] = p; });
        setProfiles(map);
      }
      setLoading(false);
    })();
  }, [authorized, id]);

  const exportCsv = () => {
    const rows = [["Type", "First name", "Last name", "Email", "Registered at"]];
    regs.forEach(r => {
      if (r.is_guest) {
        rows.push(["Guest", r.first_name || "", r.last_name || "", r.email || "", new Date(r.created_at).toISOString()]);
      } else {
        const p = r.user_id ? profiles[r.user_id] : undefined;
        const name = (p?.full_name || "").trim();
        const [f, ...rest] = name.split(" ");
        rows.push(["Member", f || "", rest.join(" "), p?.email || r.email || "", new Date(r.created_at).toISOString()]);
      }
    });
    const csv = rows.map(r => r.map(c => `"${(c || "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `rsvps-${session?.title?.replace(/\s+/g, "-").toLowerCase() || id}.csv`;
    a.click();
  };

  if (checking) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }
  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="p-8 max-w-md text-center">
          <h1 className="text-xl font-bold mb-2">Access denied</h1>
          <Button onClick={() => navigate("/")}>Go home</Button>
        </Card>
      </div>
    );
  }

  const guestCount = regs.filter(r => r.is_guest).length;
  const memberCount = regs.length - guestCount;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
        <Link to="/admin">
          <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" /> Back to admin</Button>
        </Link>

        <Card className="p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold mb-1">{session?.title || "Live session"}</h1>
              <div className="text-sm text-muted-foreground flex flex-wrap items-center gap-2">
                {session?.starts_at && <span>{new Date(session.starts_at).toLocaleString()}</span>}
                {session?.host && <span>· Host: {session.host}</span>}
                {session?.is_public ? (
                  <Badge variant="secondary" className="gap-1"><Globe className="w-3 h-3" /> Open to everyone</Badge>
                ) : (
                  <Badge variant="outline" className="gap-1"><Lock className="w-3 h-3" /> Members only</Badge>
                )}
              </div>
            </div>
            <Button onClick={exportCsv} disabled={!regs.length}>
              <Download className="w-4 h-4 mr-2" /> Export CSV
            </Button>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2"><Users className="w-4 h-4" /> <strong>{regs.length}</strong> total</div>
            <div>{memberCount} member{memberCount === 1 ? "" : "s"}</div>
            <div>{guestCount} guest{guestCount === 1 ? "" : "s"}</div>
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="font-semibold mb-3">Registrations</h2>
          {loading ? (
            <div className="text-sm text-muted-foreground py-6 text-center">Loading…</div>
          ) : regs.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">No RSVPs yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground border-b">
                  <tr>
                    <th className="py-2 pr-4">Name</th>
                    <th className="py-2 pr-4">Email</th>
                    <th className="py-2 pr-4">Type</th>
                    <th className="py-2">Registered</th>
                  </tr>
                </thead>
                <tbody>
                  {regs.map(r => {
                    const p = r.user_id ? profiles[r.user_id] : undefined;
                    const name = r.is_guest
                      ? `${r.first_name || ""} ${r.last_name || ""}`.trim() || "—"
                      : (p?.full_name || "—");
                    const email = r.is_guest ? (r.email || "—") : (p?.email || r.email || "—");
                    return (
                      <tr key={r.id} className="border-b last:border-0">
                        <td className="py-2 pr-4 font-medium">{name}</td>
                        <td className="py-2 pr-4">{email}</td>
                        <td className="py-2 pr-4">
                          {r.is_guest
                            ? <Badge variant="outline">Guest</Badge>
                            : <Badge>Member</Badge>}
                        </td>
                        <td className="py-2 text-muted-foreground">{new Date(r.created_at).toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
