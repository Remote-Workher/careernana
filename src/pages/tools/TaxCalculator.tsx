import { useState, useMemo } from "react";
import { ArrowLeft, Calculator, Info, ChevronDown, ChevronUp, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* ─── NTA 2025 PAYE Brackets ─── */
const PAYE_BRACKETS = [
  { limit: 800_000, rate: 0.00, label: "₦0 – ₦800K" },
  { limit: 2_200_000, rate: 0.15, label: "₦800K – ₦3M" },
  { limit: 8_000_000, rate: 0.18, label: "₦3M – ₦11M" },
  { limit: 14_000_000, rate: 0.21, label: "₦11M – ₦25M" },
  { limit: 25_000_000, rate: 0.23, label: "₦25M – ₦50M" },
  { limit: Infinity, rate: 0.25, label: "Above ₦50M" },
];

const PENSION_OPTIONS = [
  { label: "8% (statutory minimum)", value: 0.08 },
  { label: "10%", value: 0.10 },
  { label: "12%", value: 0.12 },
  { label: "15%", value: 0.15 },
];

const NHF_RATE = 0.025;
const RENT_RELIEF_CAP = 500_000;
const MIN_TAX_RATE = 0.01;

interface TaxResult {
  annualGross: number;
  pension: number;
  nhf: number;
  nhis: number;
  rentRelief: number;
  chargeableIncome: number;
  annualTax: number;
  minimumTaxApplied: boolean;
  monthlyGross: number;
  monthlyTax: number;
  monthlyPension: number;
  monthlyNhf: number;
  monthlyNhis: number;
  monthlyNet: number;
  effectiveRate: number;
  bracketBreakdown: { label: string; rate: number; taxable: number; tax: number; active: boolean }[];
}

function calculatePAYE(
  basic: number, housing: number, transport: number, other: number, bonus: number,
  pensionRate: number, nhfEnabled: boolean, nhisAnnual: number, annualRent: number
): TaxResult {
  const annualGross = basic + housing + transport + other + bonus;
  const pensionable = basic + housing + transport;
  const pension = pensionable * pensionRate;
  const nhf = nhfEnabled ? basic * NHF_RATE : 0;
  const nhis = nhisAnnual;
  const rentRelief = annualRent > 0 ? Math.min(annualRent * 0.2, RENT_RELIEF_CAP) : 0;

  const chargeableIncome = Math.max(annualGross - pension - nhf - nhis - rentRelief, 0);

  let tax = 0;
  let remaining = chargeableIncome;
  const bracketBreakdown: TaxResult["bracketBreakdown"]= [];

  for (const bracket of PAYE_BRACKETS) {
    const taxable = Math.min(remaining, bracket.limit);
    const bracketTax = taxable * bracket.rate;
    const active = remaining > 0;
    tax += bracketTax;
    bracketBreakdown.push({ label: bracket.label, rate: bracket.rate, taxable, tax: bracketTax, active });
    remaining -= taxable;
  }

  // Minimum tax rule
  let minimumTaxApplied = false;
  if (chargeableIncome > 800_000) {
    const minTax = annualGross * MIN_TAX_RATE;
    if (tax < minTax) {
      tax = minTax;
      minimumTaxApplied = true;
    }
  }

  const monthlyGross = annualGross / 12;
  const monthlyTax = tax / 12;
  const monthlyPension = pension / 12;
  const monthlyNhf = nhf / 12;
  const monthlyNhis = nhis / 12;
  const monthlyNet = monthlyGross - monthlyTax - monthlyPension - monthlyNhf - monthlyNhis;

  return {
    annualGross, pension, nhf, nhis, rentRelief, chargeableIncome,
    annualTax: tax, minimumTaxApplied,
    monthlyGross, monthlyTax, monthlyPension, monthlyNhf, monthlyNhis, monthlyNet,
    effectiveRate: annualGross > 0 ? (tax / annualGross) * 100 : 0,
    bracketBreakdown,
  };
}

function fmt(n: number) { return n.toLocaleString("en-NG"); }

export default function TaxCalculator() {
  const navigate = useNavigate();
  const [isAnnual, setIsAnnual] = useState(false);

  // Salary inputs (stored as annual internally)
  const [basic, setBasic] = useState("");
  const [housing, setHousing] = useState("");
  const [transport, setTransport] = useState("");
  const [otherAllowances, setOtherAllowances] = useState("");
  const [annualBonus, setAnnualBonus] = useState("");

  // Deduction inputs
  const [pensionRate, setPensionRate] = useState(0.08);
  const [nhfEnabled, setNhfEnabled] = useState(true);
  const [nhisMonthly, setNhisMonthly] = useState("");
  const [annualRent, setAnnualRent] = useState("");
  const [showDeductions, setShowDeductions] = useState(false);

  const [calculated, setCalculated] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [compareBasic, setCompareBasic] = useState("");

  const parseVal = (v: string) => parseFloat(v.replace(/,/g, "")) || 0;
  const multiplier = isAnnual ? 1 : 12;

  const result = useMemo(() => {
    if (!calculated) return null;
    return calculatePAYE(
      parseVal(basic) * multiplier,
      parseVal(housing) * multiplier,
      parseVal(transport) * multiplier,
      parseVal(otherAllowances) * multiplier,
      parseVal(annualBonus), // always annual
      pensionRate, nhfEnabled,
      parseVal(nhisMonthly) * 12,
      parseVal(annualRent)
    );
  }, [calculated, basic, housing, transport, otherAllowances, annualBonus, pensionRate, nhfEnabled, nhisMonthly, annualRent, isAnnual, multiplier]);

  const compareResult = useMemo(() => {
    if (!compareMode || !compareBasic) return null;
    return calculatePAYE(
      parseVal(compareBasic) * multiplier,
      parseVal(housing) * multiplier,
      parseVal(transport) * multiplier,
      parseVal(otherAllowances) * multiplier,
      parseVal(annualBonus),
      pensionRate, nhfEnabled,
      parseVal(nhisMonthly) * 12,
      parseVal(annualRent)
    );
  }, [compareMode, compareBasic, housing, transport, otherAllowances, annualBonus, pensionRate, nhfEnabled, nhisMonthly, annualRent, isAnnual, multiplier]);

  const smartInsight = (r: TaxResult) => {
    if (r.effectiveRate < 5) return { icon: "✅", text: `You're in a low tax bracket. Your ₦${fmt(Math.round(r.monthlyNet))} take-home is strong.`, color: "bg-green-50 border-green-200 text-green-800" };
    if (r.effectiveRate <= 15) return { icon: "💡", text: `Your effective tax rate is ${r.effectiveRate.toFixed(1)}%. You could reduce this with pension top-up or NHF contributions.`, color: "bg-accent border-primary/20 text-primary" };
    return { icon: "⚠️", text: "Consider maximising your pension contributions and NHF to legally reduce your chargeable income.", color: "bg-amber-50 border-amber-200 text-amber-800" };
  };

  return (
    <div className="max-w-[1000px] animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate("/tools")} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Calculator className="w-6 h-6 text-primary" /> Nigeria Tax Calculator
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Based on Nigeria Tax Act 2025 (NTA 2025) — effective January 2026</p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* ─── LEFT PANEL ─── */}
        <div className="col-span-5 space-y-4">
          {/* Mode toggle */}
          <div className="flex gap-2">
            {[false, true].map((annual) => (
              <button
                key={String(annual)}
                onClick={() => setIsAnnual(annual)}
                className={cn(
                  "text-xs px-4 py-2 rounded-full border font-medium transition-colors",
                  isAnnual === annual ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:border-primary/30"
                )}
              >
                {annual ? "Annual" : "Monthly"}
              </button>
            ))}
          </div>

          {/* Salary breakdown */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="text-[13px] font-bold text-foreground">Salary Breakdown ({isAnnual ? "Annual" : "Monthly"})</p>
              <SalaryInput label="Basic Salary (₦)" value={basic} onChange={setBasic} required />
              <SalaryInput label="Housing Allowance (₦)" value={housing} onChange={setHousing} />
              <SalaryInput label="Transport Allowance (₦)" value={transport} onChange={setTransport} />
              <SalaryInput label="Other Allowances (₦)" value={otherAllowances} onChange={setOtherAllowances} />
              <SalaryInput label="Annual Bonus (₦)" value={annualBonus} onChange={setAnnualBonus} helper="Always annual, regardless of toggle" />
            </CardContent>
          </Card>

          {/* Deductions collapsible */}
          <Card>
            <CardContent className="p-4">
              <button onClick={() => setShowDeductions(!showDeductions)} className="w-full flex items-center justify-between text-[13px] font-bold text-foreground">
                Statutory Deductions
                {showDeductions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {showDeductions && (
                <div className="mt-3 space-y-3">
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Employee Pension Rate</label>
                    <select
                      value={pensionRate}
                      onChange={(e) => setPensionRate(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-card focus:border-primary focus:outline-none"
                    >
                      {PENSION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-medium text-muted-foreground">NHF Contribution (2.5% of basic)</label>
                    <button
                      onClick={() => setNhfEnabled(!nhfEnabled)}
                      className={cn("w-10 h-5 rounded-full transition-colors relative", nhfEnabled ? "bg-primary" : "bg-muted")}
                    >
                      <div className={cn("w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform", nhfEnabled ? "left-5" : "left-0.5")} />
                    </button>
                  </div>

                  <SalaryInput label="NHIS Monthly (₦)" value={nhisMonthly} onChange={setNhisMonthly} helper="Optional — enter your monthly contribution" />

                  <SalaryInput label="Annual Rent Paid (₦)" value={annualRent} onChange={setAnnualRent} helper="Relief = 20% of rent, capped at ₦500,000" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Calculate button */}
          <Button className="w-full gradient-primary text-primary-foreground" size="lg" onClick={() => setCalculated(true)}>
            Calculate My Tax
          </Button>

          {/* Info box */}
          <div className="bg-accent rounded-xl p-3 flex items-start gap-2">
            <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <p className="text-[11px] text-primary leading-relaxed">
              <strong>NTA 2025:</strong> The old CRA is abolished. Rent Relief replaces it (max ₦500,000/year). Workers earning ₦800K or less annually pay zero tax.
            </p>
          </div>
        </div>

        {/* ─── RIGHT PANEL ─── */}
        <div className="col-span-7 space-y-4">
          {!result ? (
            <div className="border border-dashed border-border rounded-xl p-16 text-center">
              <Calculator className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground">Enter your salary details</p>
              <p className="text-xs text-muted-foreground mt-1">Results will appear here after you click 'Calculate My Tax'</p>
            </div>
          ) : (
            <>
              {/* Hero card */}
              <div className="gradient-primary rounded-xl p-5 text-primary-foreground">
                <p className="text-xs font-medium opacity-80">Monthly Net Take-Home</p>
                <p className="text-4xl font-bold mt-1">₦{fmt(Math.round(result.monthlyNet))}</p>
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <MiniStat label="Gross Monthly" value={`₦${fmt(Math.round(result.monthlyGross))}`} />
                  <MiniStat label="Monthly PAYE" value={`₦${fmt(Math.round(result.monthlyTax))}`} className="text-red-200" />
                  <MiniStat label="Effective Rate" value={`${result.effectiveRate.toFixed(1)}%`} />
                </div>
                {result.minimumTaxApplied && (
                  <p className="text-[10px] mt-3 opacity-80 bg-white/10 rounded px-2 py-1 inline-block">ℹ️ Minimum tax rule (1% of gross) applied — your calculated PAYE was lower.</p>
                )}
              </div>

              {/* Breakdown table */}
              <Card>
                <CardContent className="p-4">
                  <p className="text-[13px] font-bold text-foreground mb-3">Monthly & Annual Breakdown</p>
                  <div className="text-xs">
                    <div className="grid grid-cols-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide pb-2 border-b border-border">
                      <span>Item</span><span className="text-right">Monthly</span><span className="text-right">Annual</span>
                    </div>
                    <BreakdownRow label="Gross Income" monthly={result.monthlyGross} annual={result.annualGross} bold highlight />
                    <BreakdownRow label={`Employee Pension (${(pensionRate * 100).toFixed(0)}%)`} monthly={-result.monthlyPension} annual={-result.pension} negative />
                    {nhfEnabled && <BreakdownRow label="NHF (2.5%)" monthly={-result.monthlyNhf} annual={-result.nhf} negative />}
                    {result.nhis > 0 && <BreakdownRow label="NHIS" monthly={-result.monthlyNhis} annual={-result.nhis} negative />}
                    {result.rentRelief > 0 && <BreakdownRow label="Rent Relief" monthly={-result.rentRelief / 12} annual={-result.rentRelief} negative />}
                    <BreakdownRow label="Chargeable Income" monthly={result.chargeableIncome / 12} annual={result.chargeableIncome} bold highlight />
                    <BreakdownRow label="PAYE Tax" monthly={-result.monthlyTax} annual={-result.annualTax} negative />
                    <BreakdownRow label="Net Take-Home" monthly={result.monthlyNet} annual={result.monthlyNet * 12} bold highlight />
                  </div>
                </CardContent>
              </Card>

              {/* Tax band breakdown */}
              <Card>
                <CardContent className="p-4">
                  <p className="text-[13px] font-bold text-foreground mb-3">How your tax was calculated</p>
                  <div className="space-y-2">
                    {result.bracketBreakdown.map((b, i) => {
                      const maxTaxable = PAYE_BRACKETS[i].limit === Infinity ? result.chargeableIncome : PAYE_BRACKETS[i].limit;
                      const fillPct = maxTaxable > 0 ? Math.min((b.taxable / maxTaxable) * 100, 100) : 0;
                      return (
                        <div key={i} className={cn("p-2.5 rounded-lg border text-xs transition-colors", b.active && b.taxable > 0 ? "bg-accent/50 border-primary/20" : "bg-muted/30 border-border opacity-60")}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-medium text-foreground">{b.label} at {(b.rate * 100).toFixed(0)}%</span>
                            <span className="font-bold text-foreground">₦{fmt(Math.round(b.tax))}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${fillPct}%` }} />
                            </div>
                            <span className="text-[10px] text-muted-foreground w-20 text-right">₦{fmt(Math.round(b.taxable))} taxed</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Smart insight */}
              {(() => {
                const insight = smartInsight(result);
                return (
                  <div className={cn("rounded-xl p-4 border flex items-start gap-2.5", insight.color)}>
                    <span className="text-lg">{insight.icon}</span>
                    <div>
                      <p className="text-xs font-medium leading-relaxed">{insight.text}</p>
                      <button onClick={() => navigate("/tools/salary")} className="text-[11px] font-semibold mt-2 flex items-center gap-1 hover:underline">
                        Want to negotiate a higher salary? Check the Salary Analyzer <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Compare */}
              {!compareMode ? (
                <button onClick={() => setCompareMode(true)} className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
                  Compare with another offer <ArrowRight className="w-3 h-3" />
                </button>
              ) : (
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <p className="text-[13px] font-bold text-foreground">Compare with another offer</p>
                    <SalaryInput label={`Other offer Basic Salary (₦ ${isAnnual ? "annual" : "monthly"})`} value={compareBasic} onChange={setCompareBasic} />
                    {compareResult && (
                      <div className="grid grid-cols-2 gap-3 mt-2">
                        <CompareCard label="Current Offer" net={result.monthlyNet} tax={result.monthlyTax} rate={result.effectiveRate} />
                        <CompareCard label="Other Offer" net={compareResult.monthlyNet} tax={compareResult.monthlyTax} rate={compareResult.effectiveRate} highlight />
                      </div>
                    )}
                    <button onClick={() => { setCompareMode(false); setCompareBasic(""); }} className="text-[10px] text-muted-foreground hover:text-foreground">Close comparison</button>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Sub-components ─── */

function SalaryInput({ label, value, onChange, helper, required }: { label: string; value: string; onChange: (v: string) => void; helper?: string; required?: boolean }) {
  return (
    <div>
      <label className="text-[11px] font-medium text-muted-foreground mb-1 block">{label}{required && <span className="text-destructive"> *</span>}</label>
      <Input placeholder="0" value={value} onChange={(e) => onChange(e.target.value)} className="text-sm" />
      {helper && <p className="text-[10px] text-muted-foreground mt-0.5">{helper}</p>}
    </div>
  );
}

function MiniStat({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div>
      <p className="text-[10px] opacity-70">{label}</p>
      <p className={cn("text-sm font-bold mt-0.5", className)}>{value}</p>
    </div>
  );
}

function BreakdownRow({ label, monthly, annual, negative, bold, highlight }: {
  label: string; monthly: number; annual: number; negative?: boolean; bold?: boolean; highlight?: boolean;
}) {
  return (
    <div className={cn("grid grid-cols-3 py-2 border-b border-border/50 last:border-0", highlight && "bg-accent/30 -mx-4 px-4 rounded")}>
      <span className={cn(bold ? "font-bold text-foreground" : "text-muted-foreground")}>{label}</span>
      <span className={cn("text-right font-medium", negative ? "text-destructive" : bold ? "text-foreground font-bold" : "text-foreground")}>
        {negative ? "−" : ""}₦{fmt(Math.round(Math.abs(monthly)))}
      </span>
      <span className={cn("text-right font-medium", negative ? "text-destructive" : bold ? "text-foreground font-bold" : "text-foreground")}>
        {negative ? "−" : ""}₦{fmt(Math.round(Math.abs(annual)))}
      </span>
    </div>
  );
}

function CompareCard({ label, net, tax, rate, highlight }: { label: string; net: number; tax: number; rate: number; highlight?: boolean }) {
  return (
    <div className={cn("rounded-xl border p-3 text-center", highlight ? "bg-accent/50 border-primary/30" : "bg-card border-border")}>
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-lg font-bold text-foreground mt-1">₦{fmt(Math.round(net))}</p>
      <p className="text-[10px] text-muted-foreground">PAYE: ₦{fmt(Math.round(tax))} · Rate: {rate.toFixed(1)}%</p>
    </div>
  );
}
