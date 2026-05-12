// Admin revenue dashboard — pulls live successful transactions directly
// from Paystack, classifies them by source, and visualises the breakdown
// in a pie chart.

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, TrendingUp, Loader2, ShoppingBag, Coins, GraduationCap, Briefcase, Sparkles, AlertCircle } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

type ApiResponse = {
  rows: Row[];
  count: number;
  total_revenue_naira: number;
  total_count: number;
};

type Row = {
  id: string;
  source_key: string;
  source_label: string;
  detail: string;
  amount_naira: number;
  created_at: string;
  buyer_name: string;
  buyer_email: string;
  reference: string;
};

const SOURCE_META: Record<string, { label: string; icon: any; tint: string; color: string }> = {
  subscriptions:    { label: "Subscriptions",     icon: CreditCard,    tint: "bg-primary/15 text-primary",            color: "hsl(var(--primary))" },
  coins:            { label: "Coin Purchases",    icon: Coins,         tint: "bg-amber-500/15 text-amber-600",        color: "#f59e0b" },
  resource_shop:    { label: "Resource Shop",     icon: ShoppingBag,   tint: "bg-pink-500/15 text-pink-600",          color: "#ec4899" },
  hercademy:        { label: "HerCademy",         icon: GraduationCap, tint: "bg-purple-500/15 text-purple-600",      color: "#a855f7" },
  recruiter_addons: { label: "Recruiter Add-ons", icon: Briefcase,     tint: "bg-blue-500/15 text-blue-600",          color: "#3b82f6" },
  other:            { label: "Other",             icon: Sparkles,      tint: "bg-zinc-500/15 text-zinc-600",          color: "#71717a" },
};

function fmtNaira(n: number) {
  return `₦${(n || 0).toLocaleString()}`;
}

type Period = "today" | "month" | "all";

export default function PaymentsAdmin() {
  const [rows, setRows] = useState<Row[]>([]);
  const [apiTotal, setApiTotal] = useState<number>(0);
  const [apiTotalCount, setApiTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>("all");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase.functions.invoke<ApiResponse>("paystack-revenue", { body: {} });
      if (error || (data as any)?.error) {
        setError(error?.message || (data as any)?.error || "Failed to load Paystack revenue");
        setLoading(false);
        return;
      }
      setRows(data?.rows || []);
      setApiTotal(data?.total_revenue_naira || 0);
      setApiTotalCount(data?.total_count || 0);
      setLoading(false);
    })();
  }, []);

  const CORE_SOURCES = ["subscriptions", "coins", "resource_shop"];

  // Period totals (always computed across all rows so cards show all three)
  const { todayRevenue, todayCount, monthRevenue, monthCount, allRevenue, allCount } = useMemo(() => {
    const dayCutoff = new Date(); dayCutoff.setHours(0, 0, 0, 0);
    const monthCutoff = new Date(); monthCutoff.setDate(1); monthCutoff.setHours(0, 0, 0, 0);
    const core = rows.filter((r) => CORE_SOURCES.includes(r.source_key));
    const day = core.filter((r) => new Date(r.created_at) >= dayCutoff);
    const month = core.filter((r) => new Date(r.created_at) >= monthCutoff);
    return {
      todayRevenue: day.reduce((a, r) => a + r.amount_naira, 0),
      todayCount: day.length,
      monthRevenue: month.reduce((a, r) => a + r.amount_naira, 0),
      monthCount: month.length,
      allRevenue: core.reduce((a, r) => a + r.amount_naira, 0),
      allCount: core.length,
    };
  }, [rows]);

  // Filtered rows by selected period (drives breakdown + recent table)
  const filteredRows = useMemo(() => {
    if (period === "all") return rows;
    const cutoff = new Date();
    if (period === "today") cutoff.setHours(0, 0, 0, 0);
    else { cutoff.setDate(1); cutoff.setHours(0, 0, 0, 0); }
    return rows.filter((r) => new Date(r.created_at) >= cutoff);
  }, [rows, period]);

  const { totalRevenue, bySource, pieData } = useMemo(() => {
    const total = filteredRows.reduce((a, r) => a + r.amount_naira, 0);
    const grouped = new Map<string, { amount: number; count: number }>();
    Object.keys(SOURCE_META).forEach((k) => grouped.set(k, { amount: 0, count: 0 }));
    filteredRows.forEach((r) => {
      const g = grouped.get(r.source_key) || { amount: 0, count: 0 };
      g.amount += r.amount_naira;
      g.count += 1;
      grouped.set(r.source_key, g);
    });
    const pie = Array.from(grouped.entries())
      .filter(([, g]) => g.amount > 0)
      .map(([key, g]) => ({
        name: SOURCE_META[key].label,
        value: g.amount,
        color: SOURCE_META[key].color,
      }));
    return { totalRevenue: total, bySource: grouped, pieData: pie };
  }, [filteredRows]);

  const periodLabel = period === "today" ? "today" : period === "month" ? "this month" : "all time";

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold">Revenue</h2>
        <p className="text-[13px] text-muted-foreground mt-0.5">
          Live data from Paystack. Pulls the most recent successful charges and breaks them down by product.
        </p>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <Card className="p-5 flex items-start gap-3 border-destructive/30 bg-destructive/5">
          <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-sm">Couldn't reach Paystack</div>
            <div className="text-[12px] text-muted-foreground mt-1">{error}</div>
          </div>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {([
              { key: "today" as Period, label: "Today", revenue: todayRevenue, count: todayCount, icon: TrendingUp, tint: "bg-amber-500/15 text-amber-600" },
              { key: "month" as Period, label: "This Month", revenue: monthRevenue, count: monthCount, icon: TrendingUp, tint: "bg-emerald-500/15 text-emerald-600" },
              { key: "all" as Period, label: "All Time", revenue: allRevenue, count: allCount, icon: CreditCard, tint: "bg-green-500/15 text-green-600" },
            ]).map((c) => {
              const active = period === c.key;
              return (
                <button
                  key={c.key}
                  onClick={() => setPeriod(c.key)}
                  className={`text-left transition ${active ? "ring-2 ring-primary rounded-xl" : ""}`}
                >
                  <Card className="p-5 flex items-center gap-4 h-full">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${c.tint}`}>
                      <c.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{c.label}</div>
                      <div className="text-2xl font-extrabold leading-tight">{fmtNaira(c.revenue)}</div>
                      <div className="text-[11px] text-muted-foreground">{c.count.toLocaleString()} payments</div>
                    </div>
                  </Card>
                </button>
              );
            })}
          </div>

          <Card className="p-5">
            <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
              <h3 className="text-base font-bold">Revenue by Source</h3>
              <Badge variant="outline" className="text-[10.5px] font-semibold capitalize">{periodLabel}</Badge>
            </div>
            <p className="text-[12px] text-muted-foreground mb-4">Visual split of every Paystack charge by what was sold.</p>

            {pieData.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                No revenue {periodLabel}.
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={110}
                        paddingAngle={2}
                      >
                        {pieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v: number) => fmtNaira(v)}
                        contentStyle={{ borderRadius: 8, fontSize: 12 }}
                      />
                      <Legend
                        verticalAlign="bottom"
                        iconType="circle"
                        wrapperStyle={{ fontSize: 12 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-3">
                  {Array.from(bySource.entries())
                    .filter(([, g]) => g.amount > 0)
                    .sort((a, b) => b[1].amount - a[1].amount)
                    .map(([key, g]) => {
                      const meta = SOURCE_META[key];
                      const pct = totalRevenue > 0 ? (g.amount / totalRevenue) * 100 : 0;
                      return (
                        <div key={key} className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${meta.tint} shrink-0`}>
                            <meta.icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-sm truncate">{meta.label}</span>
                              <span className="font-bold tabular-nums text-sm">{fmtNaira(g.amount)}</span>
                            </div>
                            <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                              <span>{g.count} payments</span>
                              <span>{pct.toFixed(1)}%</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h3 className="text-base font-bold">Recent Payments</h3>
              <Badge variant="outline" className="text-[10.5px] font-semibold capitalize">{periodLabel}</Badge>
            </div>
            {filteredRows.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                No payments {periodLabel}.
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
                    {filteredRows.slice(0, 50).map((r) => (
                      <tr key={r.id} className="border-b border-border/60 hover:bg-muted/20">
                        <td className="py-2 px-3 text-muted-foreground whitespace-nowrap text-[12px]">
                          {new Date(r.created_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
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
