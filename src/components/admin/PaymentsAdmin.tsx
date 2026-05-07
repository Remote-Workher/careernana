// Admin revenue dashboard — surfaces every Paystack-backed transaction
// across the platform, broken down by source (Subscriptions, AI Coins,
// Resource Shop, HerCademy, etc.). Total revenue is computed live from
// successful Paystack charges stored in our database.

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, TrendingUp, Loader2, ShoppingBag, Coins, GraduationCap, Briefcase, Sparkles } from "lucide-react";

type Row = {
  id: string;
  source_key: string;
  source_label: string;
  created_at: string;
  user_id: string;
  amount_naira: number;
  status: string;
  reference: string | null;
  detail: string;
  buyer_name?: string;
  buyer_email?: string;
};

const SOURCE_META: Record<string, { label: string; icon: any; tint: string }> = {
  subscriptions: { label: "Subscriptions", icon: CreditCard, tint: "bg-primary/15 text-primary" },
  coins: { label: "Coin Purchases", icon: Coins, tint: "bg-amber-500/15 text-amber-600" },
  resource_shop: { label: "Resource Shop", icon: ShoppingBag, tint: "bg-pink-500/15 text-pink-600" },
  hercademy: { label: "HerCademy", icon: GraduationCap, tint: "bg-purple-500/15 text-purple-600" },
  recruiter_addons: { label: "Recruiter Add-ons", icon: Briefcase, tint: "bg-blue-500/15 text-blue-600" },
  other: { label: "Other", icon: Sparkles, tint: "bg-zinc-500/15 text-zinc-600" },
};

function classifyRecruiter(purpose: string): string {
  if (purpose === "talent_membership") return "subscriptions";
  if (purpose === "buy_coins") return "coins";
  if (["hire_for_me", "extra_job_slot", "feature_job", "boost_job"].includes(purpose)) return "recruiter_addons";
  return "other";
}

function classifyProduct(kind: string): string {
  if (kind === "resource") return "resource_shop";
  if (kind === "course") return "hercademy";
  return "other";
}

function fmtNaira(n: number) {
  return `₦${(n || 0).toLocaleString()}`;
}

export default function PaymentsAdmin() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);

      const [rp, pp] = await Promise.all([
        supabase
          .from("recruiter_payments")
          .select("id, user_id, purpose, amount_kobo, status, paystack_reference, metadata, created_at, paid_at")
          .in("status", ["success", "paid"])
          .order("created_at", { ascending: false })
          .limit(1000),
        supabase
          .from("product_purchases")
          .select("id, user_id, kind, product_title, amount_naira, status, paystack_reference, created_at")
          .in("status", ["success", "paid"])
          .order("created_at", { ascending: false })
          .limit(1000),
      ]);

      const merged: Row[] = [];

      (rp.data || []).forEach((r: any) => {
        const key = classifyRecruiter(r.purpose);
        merged.push({
          id: r.id,
          source_key: key,
          source_label: SOURCE_META[key].label,
          created_at: r.paid_at || r.created_at,
          user_id: r.user_id,
          amount_naira: Math.round((r.amount_kobo || 0) / 100),
          status: r.status,
          reference: r.paystack_reference,
          detail:
            (r.metadata?.plan_name as string) ||
            (r.metadata?.coins ? `${r.metadata.coins} coins` : null) ||
            r.purpose,
        });
      });

      (pp.data || []).forEach((r: any) => {
        const key = classifyProduct(r.kind);
        merged.push({
          id: r.id,
          source_key: key,
          source_label: SOURCE_META[key].label,
          created_at: r.created_at,
          user_id: r.user_id,
          amount_naira: r.amount_naira || 0,
          status: r.status,
          reference: r.paystack_reference,
          detail: r.product_title || r.kind,
        });
      });

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
          } else if (r) {
            row.buyer_name = r.company_name || r.contact_name || "—";
            row.buyer_email = r.email;
          } else {
            row.buyer_name = "—";
          }
        });
      }

      merged.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
      setRows(merged);
      setLoading(false);
    })();
  }, []);

  const { totalRevenue, monthRevenue, bySource } = useMemo(() => {
    const total = rows.reduce((a, r) => a + r.amount_naira, 0);
    const monthCutoff = new Date();
    monthCutoff.setDate(1);
    monthCutoff.setHours(0, 0, 0, 0);
    const month = rows
      .filter((r) => new Date(r.created_at) >= monthCutoff)
      .reduce((a, r) => a + r.amount_naira, 0);

    const grouped = new Map<string, { amount: number; count: number }>();
    Object.keys(SOURCE_META).forEach((k) => grouped.set(k, { amount: 0, count: 0 }));
    rows.forEach((r) => {
      const g = grouped.get(r.source_key) || { amount: 0, count: 0 };
      g.amount += r.amount_naira;
      g.count += 1;
      grouped.set(r.source_key, g);
    });
    return { totalRevenue: total, monthRevenue: month, bySource: grouped };
  }, [rows]);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold">Revenue</h2>
        <p className="text-[13px] text-muted-foreground mt-0.5">
          Live revenue from Paystack across every product and plan. Updates as new sales come in.
        </p>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Card className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-green-500/15 text-green-600">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Total Revenue</div>
                <div className="text-2xl font-extrabold leading-tight">{fmtNaira(totalRevenue)}</div>
                <div className="text-[11px] text-muted-foreground">{rows.length} successful payments</div>
              </div>
            </Card>
            <Card className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-emerald-500/15 text-emerald-600">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">This Month</div>
                <div className="text-2xl font-extrabold leading-tight">{fmtNaira(monthRevenue)}</div>
              </div>
            </Card>
          </div>

          <Card className="p-5">
            <h3 className="text-base font-bold mb-4">Revenue by Source</h3>
            <div className="space-y-3">
              {Array.from(bySource.entries()).map(([key, g]) => {
                const meta = SOURCE_META[key];
                const pct = totalRevenue > 0 ? (g.amount / totalRevenue) * 100 : 0;
                return (
                  <div key={key} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${meta.tint}`}>
                          <meta.icon className="w-4 h-4" />
                        </div>
                        <span className="font-semibold text-sm">{meta.label}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-muted-foreground text-[12px]">{g.count} payments</span>
                        <span className="font-bold tabular-nums">{fmtNaira(g.amount)}</span>
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="text-[11px] text-muted-foreground text-right">{pct.toFixed(1)}% of total</div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-base font-bold mb-4">Recent Payments</h3>
            {rows.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                No payments yet. Revenue will appear here as soon as sales happen on Paystack.
              </div>
            ) : (
              <div className="overflow-x-auto -mx-5">
                <table className="w-full text-sm">
                  <thead className="border-y border-border bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="text-left py-2 px-3 font-semibold">Date</th>
                      <th className="text-left py-2 px-3 font-semibold">Buyer</th>
                      <th className="text-left py-2 px-3 font-semibold">Source</th>
                      <th className="text-left py-2 px-3 font-semibold">Item</th>
                      <th className="text-right py-2 px-3 font-semibold">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 50).map((r) => (
                      <tr key={`${r.source_key}-${r.id}`} className="border-b border-border/60 hover:bg-muted/20">
                        <td className="py-2 px-3 text-muted-foreground whitespace-nowrap text-[12px]">
                          {new Date(r.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-2 px-3">
                          <div className="font-semibold">{r.buyer_name || "—"}</div>
                          <div className="text-[11px] text-muted-foreground">{r.buyer_email || "—"}</div>
                        </td>
                        <td className="py-2 px-3">
                          <Badge variant="outline" className="text-[10.5px] font-semibold">{r.source_label}</Badge>
                        </td>
                        <td className="py-2 px-3 max-w-[260px] truncate text-[12px]">{r.detail}</td>
                        <td className="py-2 px-3 text-right font-bold tabular-nums whitespace-nowrap">{fmtNaira(r.amount_naira)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
