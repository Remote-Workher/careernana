// Admin payments dashboard — surfaces every Paystack-backed transaction
// across the platform (memberships, coin packs, recruiter add-ons,
// hire-for-me, and product purchases for resources/courses) so admins
// can see revenue, who paid, and the reference for each charge.

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, TrendingUp, Users, ExternalLink, Search, Loader2 } from "lucide-react";

type Row = {
  id: string;
  source: "recruiter_payments" | "product_purchases";
  created_at: string;
  user_id: string;
  amount_naira: number;
  status: string;
  purpose: string;
  reference: string | null;
  detail: string;
  buyer_name?: string;
  buyer_email?: string;
  buyer_kind?: "talent" | "recruiter" | "guest";
};

const STATUS_TINT: Record<string, string> = {
  success: "bg-green-500/15 text-green-600 border-green-500/30",
  paid: "bg-green-500/15 text-green-600 border-green-500/30",
  pending: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  failed: "bg-red-500/15 text-red-600 border-red-500/30",
  refunded: "bg-zinc-500/15 text-zinc-600 border-zinc-500/30",
};

const PURPOSE_LABEL: Record<string, string> = {
  talent_membership: "Membership",
  buy_coins: "AI Coins",
  hire_for_me: "Hire-for-me",
  extra_job_slot: "Extra job slot",
  feature_job: "Feature job",
  boost_job: "Boost job",
  resource: "Resource",
  course: "Course",
};

function fmtNaira(n: number) {
  return `₦${(n || 0).toLocaleString()}`;
}

export default function PaymentsAdmin() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [purposeFilter, setPurposeFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);

      const [rp, pp] = await Promise.all([
        supabase
          .from("recruiter_payments")
          .select("id, user_id, purpose, amount_kobo, currency, status, paystack_reference, metadata, created_at, paid_at")
          .order("created_at", { ascending: false })
          .limit(500),
        supabase
          .from("product_purchases")
          .select("id, user_id, kind, product_title, amount_naira, currency, status, paystack_reference, metadata, created_at")
          .order("created_at", { ascending: false })
          .limit(500),
      ]);

      const merged: Row[] = [];

      (rp.data || []).forEach((r: any) => {
        merged.push({
          id: r.id,
          source: "recruiter_payments",
          created_at: r.paid_at || r.created_at,
          user_id: r.user_id,
          amount_naira: Math.round((r.amount_kobo || 0) / 100),
          status: r.status,
          purpose: r.purpose,
          reference: r.paystack_reference,
          detail:
            (r.metadata?.plan_name as string) ||
            (r.metadata?.coins ? `${r.metadata.coins} coins` : null) ||
            PURPOSE_LABEL[r.purpose] ||
            r.purpose,
        });
      });

      (pp.data || []).forEach((r: any) => {
        merged.push({
          id: r.id,
          source: "product_purchases",
          created_at: r.created_at,
          user_id: r.user_id,
          amount_naira: r.amount_naira || 0,
          status: r.status,
          purpose: r.kind, // resource | course
          reference: r.paystack_reference,
          detail: r.product_title || PURPOSE_LABEL[r.kind] || r.kind,
        });
      });

      // Decorate with buyer info
      const userIds = [...new Set(merged.map((r) => r.user_id).filter(Boolean))];
      if (userIds.length) {
        const [profiles, recs] = await Promise.all([
          supabase.from("profiles").select("user_id, full_name, email").in("user_id", userIds),
          supabase.from("recruiter_profiles").select("user_id, contact_name, company_name, email").in("user_id", userIds),
        ]);
        const pmap = new Map((profiles.data || []).map((p: any) => [p.user_id, p]));
        const rmap = new Map((recs.data || []).map((r: any) => [r.user_id, r]));
        merged.forEach((row) => {
          const p = pmap.get(row.user_id);
          const r = rmap.get(row.user_id);
          if (p) {
            row.buyer_name = p.full_name || "—";
            row.buyer_email = p.email;
            row.buyer_kind = "talent";
          } else if (r) {
            row.buyer_name = r.company_name || r.contact_name || "—";
            row.buyer_email = r.email;
            row.buyer_kind = "recruiter";
          } else {
            row.buyer_kind = "guest";
            row.buyer_name = "—";
          }
        });
      }

      merged.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
      setRows(merged);
      setLoading(false);
    })();
  }, []);

  const stats = useMemo(() => {
    const paid = rows.filter((r) => ["success", "paid"].includes(r.status));
    const totalRevenue = paid.reduce((a, r) => a + r.amount_naira, 0);
    const uniqueBuyers = new Set(paid.map((r) => r.user_id)).size;
    const monthCutoff = new Date();
    monthCutoff.setDate(1);
    monthCutoff.setHours(0, 0, 0, 0);
    const monthRevenue = paid
      .filter((r) => new Date(r.created_at) >= monthCutoff)
      .reduce((a, r) => a + r.amount_naira, 0);
    return {
      totalRevenue,
      uniqueBuyers,
      monthRevenue,
      txnCount: paid.length,
      pending: rows.filter((r) => r.status === "pending").length,
    };
  }, [rows]);

  const purposes = useMemo(
    () => [...new Set(rows.map((r) => r.purpose))],
    [rows],
  );

  const filtered = rows.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (purposeFilter !== "all" && r.purpose !== purposeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (
        !(r.buyer_name || "").toLowerCase().includes(q) &&
        !(r.buyer_email || "").toLowerCase().includes(q) &&
        !(r.reference || "").toLowerCase().includes(q) &&
        !(r.detail || "").toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });

  const statCards = [
    { label: "Total revenue (paid)", value: fmtNaira(stats.totalRevenue), icon: CreditCard, tint: "bg-green-500/15 text-green-500" },
    { label: "This month", value: fmtNaira(stats.monthRevenue), icon: TrendingUp, tint: "bg-emerald-500/15 text-emerald-500" },
    { label: "Paying customers", value: stats.uniqueBuyers.toLocaleString(), icon: Users, tint: "bg-purple-500/15 text-purple-500" },
    { label: "Successful txns", value: stats.txnCount.toLocaleString(), icon: CreditCard, tint: "bg-blue-500/15 text-blue-500" },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold">Payments</h2>
        <p className="text-[13px] text-muted-foreground mt-0.5">
          Every Paystack transaction across the platform, with buyer details and references.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((s) => (
          <Card key={s.label} className="p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.tint}`}>
              <s.icon className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{s.label}</div>
              <div className="text-lg font-extrabold leading-tight">{s.value}</div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search name, email, reference…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={purposeFilter} onValueChange={setPurposeFilter}>
            <SelectTrigger className="w-[170px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All purposes</SelectItem>
              {purposes.map((p) => (
                <SelectItem key={p} value={p}>{PURPOSE_LABEL[p] || p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">No payments yet.</div>
        ) : (
          <div className="overflow-x-auto -mx-4">
            <table className="w-full text-sm">
              <thead className="border-y border-border bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left py-2 px-3 font-semibold">Date</th>
                  <th className="text-left py-2 px-3 font-semibold">Buyer</th>
                  <th className="text-left py-2 px-3 font-semibold">Item</th>
                  <th className="text-left py-2 px-3 font-semibold">Type</th>
                  <th className="text-right py-2 px-3 font-semibold">Amount</th>
                  <th className="text-left py-2 px-3 font-semibold">Status</th>
                  <th className="text-left py-2 px-3 font-semibold">Reference</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={`${r.source}-${r.id}`} className="border-b border-border/60 hover:bg-muted/20">
                    <td className="py-2 px-3 text-muted-foreground whitespace-nowrap">
                      {new Date(r.created_at).toLocaleDateString()} ·{" "}
                      <span className="text-[11px]">
                        {new Date(r.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <div className="font-semibold">{r.buyer_name || "—"}</div>
                      <div className="text-[11px] text-muted-foreground">{r.buyer_email || "—"}</div>
                    </td>
                    <td className="py-2 px-3 max-w-[260px] truncate">{r.detail}</td>
                    <td className="py-2 px-3">
                      <Badge variant="outline" className="text-[10.5px] font-semibold">
                        {PURPOSE_LABEL[r.purpose] || r.purpose}
                      </Badge>
                    </td>
                    <td className="py-2 px-3 text-right font-bold tabular-nums whitespace-nowrap">{fmtNaira(r.amount_naira)}</td>
                    <td className="py-2 px-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10.5px] font-semibold capitalize ${STATUS_TINT[r.status] || "bg-muted text-foreground"}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      {r.reference ? (
                        <a
                          href={`https://dashboard.paystack.com/#/transactions?reference=${encodeURIComponent(r.reference)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline inline-flex items-center gap-1 text-[12px] font-mono"
                        >
                          {r.reference.slice(0, 18)}…
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground text-[11px]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
