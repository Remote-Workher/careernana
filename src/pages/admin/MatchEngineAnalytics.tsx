import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, TrendingUp, Target, Users } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { useSEO } from "@/components/SEO";

type Assignment = {
  id: string;
  brief_id: string;
  status: string;
  match_score: number | null;
  match_reasons: any;
  created_at: string;
};

const FACTOR_KEYS = ["skill_score", "location_score", "experience_score", "salary_score"] as const;
const FACTOR_LABELS: Record<string, string> = {
  skill_score: "Skills (max 50)",
  location_score: "Location (max 15)",
  experience_score: "Experience (max 20)",
  salary_score: "Salary fit (max 15)",
};
const FACTOR_MAX: Record<string, number> = {
  skill_score: 50,
  location_score: 15,
  experience_score: 20,
  salary_score: 15,
};

export default function MatchEngineAnalytics() {
  useSEO({ title: "Match Engine Analytics — Admin", description: "Score distribution, top factors, and funnel conversion for the Intern Match engine." });
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [rows, setRows] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/admin/login", { replace: true }); return; }
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
      setIsAdmin(!!data);
      setChecking(false);
      if (data) {
        const { data: assignments } = await supabase
          .from("intern_match_assignments")
          .select("id, brief_id, status, match_score, match_reasons, created_at")
          .order("created_at", { ascending: false })
          .limit(1000);
        setRows((assignments as Assignment[]) || []);
        setLoading(false);
      }
    })();
  }, [navigate]);

  const stats = useMemo(() => {
    const total = rows.length;
    const byStatus = rows.reduce<Record<string, number>>((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    }, {});

    // Score distribution buckets (only assignments with a score)
    const scored = rows.filter((r) => typeof r.match_score === "number");
    const buckets = [
      { label: "80–84", min: 80, max: 84, count: 0 },
      { label: "85–89", min: 85, max: 89, count: 0 },
      { label: "90–94", min: 90, max: 94, count: 0 },
      { label: "95–100", min: 95, max: 100, count: 0 },
    ];
    scored.forEach((r) => {
      const s = r.match_score!;
      const b = buckets.find((x) => s >= x.min && s <= x.max);
      if (b) b.count += 1;
    });
    const avgScore = scored.length ? Math.round(scored.reduce((a, r) => a + (r.match_score || 0), 0) / scored.length) : 0;

    // Average factor contribution
    const factorTotals: Record<string, { sum: number; n: number }> = {};
    FACTOR_KEYS.forEach((k) => (factorTotals[k] = { sum: 0, n: 0 }));
    scored.forEach((r) => {
      const reasons = r.match_reasons || {};
      FACTOR_KEYS.forEach((k) => {
        if (typeof reasons[k] === "number") {
          factorTotals[k].sum += reasons[k];
          factorTotals[k].n += 1;
        }
      });
    });
    const factors = FACTOR_KEYS.map((k) => {
      const t = factorTotals[k];
      const avg = t.n ? t.sum / t.n : 0;
      return {
        key: k,
        label: FACTOR_LABELS[k],
        avg: Math.round(avg * 10) / 10,
        pctOfMax: Math.round((avg / FACTOR_MAX[k]) * 100),
      };
    }).sort((a, b) => b.pctOfMax - a.pctOfMax);

    // Funnel
    const shortlisted = total;
    const interested = (byStatus["interested"] || 0) + (byStatus["invited"] || 0) + (byStatus["rejected_by_founder"] || 0);
    const notInterested = byStatus["not_interested"] || 0;
    const invited = byStatus["invited"] || 0;
    const passedByFounder = byStatus["rejected_by_founder"] || 0;
    const pendingFounder = interested - invited - passedByFounder;
    const pendingTalent = shortlisted - interested - notInterested;

    const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);

    return {
      total,
      avgScore,
      buckets,
      factors,
      funnel: {
        shortlisted,
        interested,
        notInterested,
        invited,
        passedByFounder,
        pendingTalent,
        pendingFounder,
        interestedRate: pct(interested, shortlisted),
        invitedRate: pct(invited, interested),
        passedRate: pct(passedByFounder, interested),
      },
    };
  }, [rows]);

  if (checking) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="p-8 max-w-md text-center">
          <h1 className="text-xl font-bold mb-2">Access denied</h1>
          <p className="text-sm text-muted-foreground mb-4">You don't have admin access.</p>
          <Button onClick={() => navigate("/")}>Go home</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <Link to="/admin" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> Back to admin
          </Link>
        </div>
        <header className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Match Engine Analytics</h1>
          <p className="text-muted-foreground text-sm">Score distribution, top contributing factors, and conversion through the Intern Match funnel.</p>
        </header>

        {loading ? (
          <Card className="p-12 text-center text-muted-foreground">Loading…</Card>
        ) : stats.total === 0 ? (
          <Card className="p-12 text-center text-muted-foreground">No shortlist assignments yet.</Card>
        ) : (
          <>
            {/* Top stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4">
                <p className="text-xs text-muted-foreground font-medium mb-1">Total shortlisted</p>
                <p className="text-2xl font-semibold tracking-tight">{stats.total}</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-muted-foreground font-medium mb-1">Avg match score</p>
                <p className="text-2xl font-semibold tracking-tight">{stats.avgScore}<span className="text-base text-muted-foreground">/100</span></p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-muted-foreground font-medium mb-1">Talent interest rate</p>
                <p className="text-2xl font-semibold tracking-tight">{stats.funnel.interestedRate}%</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-muted-foreground font-medium mb-1">Interview invite rate</p>
                <p className="text-2xl font-semibold tracking-tight">{stats.funnel.invitedRate}%</p>
              </Card>
            </div>

            {/* Score distribution */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-primary" />
                <h2 className="text-lg font-semibold">Score distribution</h2>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.buckets}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Top contributing factors */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-4 h-4 text-primary" />
                <h2 className="text-lg font-semibold">Top contributing factors</h2>
              </div>
              <p className="text-xs text-muted-foreground mb-4">Average points earned per assignment, ranked by % of factor's max.</p>
              <div className="space-y-3">
                {stats.factors.map((f) => (
                  <div key={f.key}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium">{f.label}</span>
                      <span className="text-muted-foreground">{f.avg} avg · {f.pctOfMax}% of max</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${f.pctOfMax}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Conversion funnel */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-4 h-4 text-primary" />
                <h2 className="text-lg font-semibold">Conversion funnel</h2>
              </div>
              <div className="space-y-4">
                <FunnelRow label="Shortlisted by engine" count={stats.funnel.shortlisted} pct={100} />
                <FunnelRow label="Talent: I'm interested" count={stats.funnel.interested} pct={stats.funnel.shortlisted ? Math.round((stats.funnel.interested / stats.funnel.shortlisted) * 100) : 0} />
                <FunnelRow label="Founder: Invited to interview" count={stats.funnel.invited} pct={stats.funnel.interested ? Math.round((stats.funnel.invited / stats.funnel.interested) * 100) : 0} variant="success" />
                <FunnelRow label="Founder: Passed" count={stats.funnel.passedByFounder} pct={stats.funnel.interested ? Math.round((stats.funnel.passedByFounder / stats.funnel.interested) * 100) : 0} variant="muted" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-6 border-t">
                <MiniStat label="Not interested" value={stats.funnel.notInterested} />
                <MiniStat label="Pending talent reply" value={stats.funnel.pendingTalent} />
                <MiniStat label="Pending founder action" value={stats.funnel.pendingFounder} />
                <MiniStat label="Talent → Invite rate" value={`${stats.funnel.invitedRate}%`} />
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

function FunnelRow({ label, count, pct, variant = "primary" }: { label: string; count: number; pct: number; variant?: "primary" | "success" | "muted" }) {
  const bar = variant === "success" ? "bg-success" : variant === "muted" ? "bg-muted-foreground/40" : "bg-primary";
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">{count} · {pct}%</span>
      </div>
      <div className="h-3 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${bar}`} style={{ width: `${Math.max(2, pct)}%` }} />
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="text-lg font-semibold tracking-tight">{value}</p>
    </div>
  );
}
