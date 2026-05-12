import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fetchTrackedApplications } from "@/lib/tracked-applications";
import { ArrowLeft, Mail, MapPin, Briefcase, Calendar, Coins, CreditCard, Trophy, FileText, ExternalLink } from "lucide-react";
import { useSEO } from "@/components/SEO";


function Stat({ label, value, sub }: { label: string; value: any; sub?: string }) {
  useSEO({ title: "Talent Overview" });
  return (
    <Card className="p-4">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </Card>
  );
}

function tierBadge(tier?: string | null, paidUntil?: string | null) {
  const active = paidUntil && new Date(paidUntil) > new Date();
  if (tier === "premium" && active) return <Badge className="bg-amber-500/15 text-amber-600 border-0">Premium</Badge>;
  if (tier === "standard" && active) return <Badge className="bg-blue-500/15 text-blue-600 border-0">Standard</Badge>;
  if (tier && tier !== "free" && !active) return <Badge variant="secondary">Expired</Badge>;
  return <Badge variant="secondary">Free</Badge>;
}

export default function TalentOverview() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [apps, setApps] = useState<any[]>([]);
  const [challenges, setChallenges] = useState<any[]>([]);
  const [memPays, setMemPays] = useState<any[]>([]);
  const [prodPays, setProdPays] = useState<any[]>([]);
  const [brags, setBrags] = useState<number>(0);
  const [lastSession, setLastSession] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      setLoading(true);
      const { data: prof } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      setProfile(prof);

      const [a, c, mp, pp, b] = await Promise.all([
        fetchTrackedApplications(userId),
        supabase.from("challenge_progress").select("id, challenge_key, joined_at, completed_at, completed_tasks").eq("user_id", userId).order("joined_at", { ascending: false }),
        supabase.from("talent_payments").select("id, amount_naira, plan_tier, created_at, status").eq("user_id", userId).order("created_at", { ascending: false }),
        supabase.from("product_purchases").select("id, amount_naira, product_type, created_at, status").eq("user_id", userId).order("created_at", { ascending: false }),
        supabase.from("brag_entries").select("id", { count: "exact", head: true }).eq("user_id", userId),
      ]);
      setApps(a || []);
      setChallenges(c.data || []);
      setMemPays(mp.data || []);
      setProdPays(pp.data || []);
      setBrags((b as any).count || 0);
      setLastSession((prof as any)?.updated_at || null);
      setLoading(false);
    })();
  }, [userId]);

  if (loading) return <div className="p-10 text-center text-muted-foreground">Loading talent…</div>;
  if (!profile) return (
    <div className="p-10 text-center">
      <div className="text-muted-foreground mb-4">Talent not found.</div>
      <Button variant="outline" onClick={() => navigate("/admin")}><ArrowLeft className="w-4 h-4 mr-2" /> Back to admin</Button>
    </div>
  );

  const memSpend = memPays.reduce((s, r) => s + (r.amount_naira || 0), 0);
  const prodSpend = prodPays.reduce((s, r) => s + (r.amount_naira || 0), 0);

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
      <div>
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin")} className="mb-2">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to talents
        </Button>
        <Card className="p-6">
          <div className="flex flex-col md:flex-row gap-5 md:items-center">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-20 h-20 rounded-full object-cover" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-primary-tint text-primary text-2xl font-bold flex items-center justify-center">
                {(profile.full_name || profile.email || "?").charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold">{profile.full_name || "—"}</h1>
                {tierBadge(profile.plan_tier, profile.paid_until)}
                {(profile.segments || []).map((seg: string) => (
                  <Badge key={seg} className="bg-primary/15 text-primary border-0 capitalize">
                    {seg.replace(/_/g, " ")}
                  </Badge>
                ))}
              </div>
              <div className="text-sm text-muted-foreground mt-1 flex flex-wrap gap-x-4 gap-y-1">
                <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {profile.email}</span>
                {profile.city && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {profile.city}</span>}
                {(profile.current_role || profile.target_role) && (
                  <span className="flex items-center gap-1"><Briefcase className="w-3.5 h-3.5" /> {profile.current_role || profile.target_role}</span>
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-2 flex flex-wrap gap-x-5 gap-y-1">
                <span><b>Joined:</b> {new Date(profile.created_at).toLocaleDateString()}</span>
                <span><b>Billing:</b> {profile.billing_cycle ? <span className="capitalize">{profile.billing_cycle}</span> : "—"}</span>
                <span><b>Plan started:</b> {profile.paid_from ? new Date(profile.paid_from).toLocaleDateString() : "—"}</span>
                <span><b>Plan ends:</b> {profile.paid_until ? new Date(profile.paid_until).toLocaleDateString() : "—"}</span>
                <span><b>Last activity:</b> {lastSession ? new Date(lastSession).toLocaleDateString() : "—"}</span>
              </div>
            </div>
            {profile.username && (
              <Button variant="outline" asChild>
                <Link to={`/u/${profile.username}`} target="_blank"><ExternalLink className="w-4 h-4 mr-2" /> Public profile</Link>
              </Button>
            )}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Applications" value={apps.length} />
        <Stat label="Challenges joined" value={challenges.length} sub={`${challenges.filter(c => c.completed_at).length} completed`} />
        <Stat label="Brag entries" value={brags} />
        <Stat label="Coins balance" value={profile.tokens_remaining ?? 0} />
        <Stat label="Membership spent" value={`₦${memSpend.toLocaleString()}`} sub={`${memPays.length} payment(s)`} />
        <Stat label="Resources/Courses spent" value={`₦${prodSpend.toLocaleString()}`} sub={`${prodPays.length} purchase(s)`} />
        <Stat label="Total spent" value={`₦${(memSpend + prodSpend).toLocaleString()}`} />
        <Stat label="Plan tier" value={(profile.plan_tier || "free").toUpperCase()} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold flex items-center gap-2"><Briefcase className="w-4 h-4" /> Job applications ({apps.length})</h2>
          </div>
          {apps.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4">No applications yet.</div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {apps.slice(0, 25).map(a => (
                <div key={`${a.source}-${a.id}`} className="flex items-center justify-between text-sm border-b last:border-0 py-2">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{a.job_title}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {a.company} · <span className="capitalize">{a.source}</span>
                    </div>
                  </div>
                  <div className="text-right text-xs">
                    <Badge variant="secondary" className="text-[10px]">{a.status}</Badge>
                    <div className="text-muted-foreground mt-0.5">{new Date(a.applied_date || a.created_at).toLocaleDateString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold flex items-center gap-2"><Trophy className="w-4 h-4" /> Challenges ({challenges.length})</h2>
          </div>
          {challenges.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4">No challenges joined.</div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {challenges.map(c => (
                <div key={c.id} className="flex items-center justify-between text-sm border-b last:border-0 py-2">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{c.challenge_key}</div>
                    <div className="text-xs text-muted-foreground">{(c.completed_tasks || []).length} task(s) done</div>
                  </div>
                  <div className="text-right text-xs">
                    {c.completed_at ? <Badge className="bg-green-500/15 text-green-600 border-0">Completed</Badge> : <Badge variant="secondary">Active</Badge>}
                    <div className="text-muted-foreground mt-0.5">{new Date(c.joined_at).toLocaleDateString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold flex items-center gap-2"><CreditCard className="w-4 h-4" /> Membership payments ({memPays.length})</h2>
          </div>
          {memPays.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4">No membership payments.</div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {memPays.map(p => (
                <div key={p.id} className="flex items-center justify-between text-sm border-b last:border-0 py-2">
                  <div>
                    <div className="font-medium capitalize">{p.plan_tier || "—"}</div>
                    <div className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">₦{(p.amount_naira || 0).toLocaleString()}</div>
                    <Badge variant="secondary" className="text-[10px]">{p.status || "—"}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold flex items-center gap-2"><FileText className="w-4 h-4" /> Resources & courses ({prodPays.length})</h2>
          </div>
          {prodPays.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4">No purchases.</div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {prodPays.map(p => (
                <div key={p.id} className="flex items-center justify-between text-sm border-b last:border-0 py-2">
                  <div>
                    <div className="font-medium capitalize">{p.product_type || "—"}</div>
                    <div className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">₦{(p.amount_naira || 0).toLocaleString()}</div>
                    <Badge variant="secondary" className="text-[10px]">{p.status || "—"}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
