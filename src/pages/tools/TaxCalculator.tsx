import { useState, useMemo } from "react";
import { ArrowLeft, Calculator, Info } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const PAYE_BRACKETS = [
  { limit: 800_000, rate: 0.00 },
  { limit: 800_000, rate: 0.07 },
  { limit: 1_600_000, rate: 0.11 },
  { limit: 3_200_000, rate: 0.15 },
  { limit: 6_400_000, rate: 0.19 },
  { limit: 12_800_000, rate: 0.21 },
  { limit: Infinity, rate: 0.25 },
];

const PENSION_RATE = 0.08;
const NHF_RATE = 0.025;

function calculatePAYE(annualGross: number) {
  const pension = annualGross * PENSION_RATE;
  const nhf = annualGross * NHF_RATE;
  const taxableIncome = Math.max(annualGross - pension - nhf, 0);

  let tax = 0;
  let remaining = taxableIncome;
  const bracketBreakdown: { range: string; rate: number; tax: number }[] = [];
  let floor = 0;

  for (const bracket of PAYE_BRACKETS) {
    if (remaining <= 0) break;
    const taxable = Math.min(remaining, bracket.limit);
    const bracketTax = taxable * bracket.rate;
    tax += bracketTax;
    bracketBreakdown.push({
      range: bracket.limit === Infinity ? `Above ₦${fmt(floor)}` : `₦${fmt(floor + 1)} – ₦${fmt(floor + bracket.limit)}`,
      rate: bracket.rate,
      tax: bracketTax,
    });
    remaining -= taxable;
    floor += bracket.limit === Infinity ? 0 : bracket.limit;
  }

  const monthlyTax = tax / 12;
  const monthlyPension = pension / 12;
  const monthlyNhf = nhf / 12;
  const monthlyGross = annualGross / 12;
  const monthlyNet = monthlyGross - monthlyTax - monthlyPension - monthlyNhf;

  return {
    annualGross,
    pension,
    nhf,
    totalDeductions: pension + nhf,
    taxableIncome,
    annualTax: tax,
    monthlyGross,
    monthlyTax,
    monthlyPension,
    monthlyNhf,
    monthlyNet,
    effectiveRate: annualGross > 0 ? (tax / annualGross) * 100 : 0,
    bracketBreakdown,
  };
}

function fmt(n: number) {
  return n.toLocaleString("en-NG");
}

export default function TaxCalculator() {
  const navigate = useNavigate();
  const [salary, setSalary] = useState("");
  const [isAnnual, setIsAnnual] = useState(false);

  const annualGross = useMemo(() => {
    const val = parseFloat(salary.replace(/,/g, "")) || 0;
    return isAnnual ? val : val * 12;
  }, [salary, isAnnual]);

  const result = useMemo(() => calculatePAYE(annualGross), [annualGross]);

  return (
    <div className="max-w-[860px] animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate("/dashboard/tools")} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Calculator className="w-6 h-6 text-primary" /> Nigerian Tax Calculator
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Calculate your take-home pay using 2026 PAYE brackets (Nigeria Tax Act 2025)</p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Input */}
        <div className="col-span-5 space-y-4">
          <div>
            <label className="text-[13px] font-semibold text-foreground mb-1.5 block">Gross Salary (₦)</label>
            <Input
              placeholder="e.g. 500,000"
              value={salary}
              onChange={(e) => setSalary(e.target.value)}
              className="text-lg font-medium"
            />
            <div className="flex mt-2 gap-2">
              {[false, true].map((annual) => (
                <button
                  key={String(annual)}
                  onClick={() => setIsAnnual(annual)}
                  className={cn(
                    "text-xs px-3 py-1.5 rounded-full border font-medium transition-colors",
                    isAnnual === annual ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:border-primary/30"
                  )}
                >
                  {annual ? "Annual" : "Monthly"}
                </button>
              ))}
            </div>
          </div>

          {/* Deductions summary */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="text-[13px] font-bold text-foreground">Monthly Deductions</p>
              <Row label="Gross Salary" value={result.monthlyGross} />
              <Row label="Pension (8%)" value={-result.monthlyPension} negative />
              <Row label="NHF (2.5%)" value={-result.monthlyNhf} negative />
              <Row label="PAYE Tax" value={-result.monthlyTax} negative />
              <div className="border-t border-border pt-2">
                <Row label="Net Take-Home" value={result.monthlyNet} bold />
              </div>
            </CardContent>
          </Card>

          <div className="flex items-start gap-2 text-[11px] text-muted-foreground">
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <p>Based on Nigeria Tax Act 2025 (effective Jan 1, 2026). First ₦800,000 is tax-free. Includes Pension (8%) and NHF (2.5%) deductions.</p>
          </div>
        </div>

        {/* Results */}
        <div className="col-span-7 space-y-4">
          {/* Highlight cards */}
          <div className="grid grid-cols-3 gap-3">
            <HighlightCard label="Monthly Net" value={`₦${fmt(Math.round(result.monthlyNet))}`} sub="Take-home pay" />
            <HighlightCard label="Annual Tax" value={`₦${fmt(Math.round(result.annualTax))}`} sub="Total PAYE" />
            <HighlightCard label="Effective Rate" value={`${result.effectiveRate.toFixed(1)}%`} sub="Of gross income" />
          </div>

          {/* Bracket breakdown */}
          <Card>
            <CardContent className="p-4">
              <p className="text-[13px] font-bold text-foreground mb-3">PAYE Bracket Breakdown</p>
              <div className="space-y-2">
                <div className="grid grid-cols-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide pb-1 border-b border-border">
                  <span>Income Range</span>
                  <span className="text-center">Rate</span>
                  <span className="text-right">Tax</span>
                </div>
                {result.bracketBreakdown.length === 0 && (
                  <p className="text-xs text-muted-foreground py-3 text-center">Enter a salary to see breakdown</p>
                )}
                {result.bracketBreakdown.map((b, i) => (
                  <div key={i} className="grid grid-cols-3 text-xs py-1.5">
                    <span className="text-foreground">{b.range}</span>
                    <span className="text-center text-muted-foreground">{(b.rate * 100).toFixed(0)}%</span>
                    <span className="text-right font-medium text-foreground">₦{fmt(Math.round(b.tax))}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Annual summary */}
          <Card>
            <CardContent className="p-4 space-y-2">
              <p className="text-[13px] font-bold text-foreground">Annual Summary</p>
              <Row label="Gross Income" value={result.annualGross} />
              <Row label="Statutory Deductions" value={result.totalDeductions} />
              <Row label="Taxable Income" value={result.taxableIncome} />
              <Row label="Total Pension" value={result.pension} />
              <Row label="Total NHF" value={result.nhf} />
              <Row label="Total PAYE Tax" value={result.annualTax} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, negative, bold }: { label: string; value: number; negative?: boolean; bold?: boolean }) {
  return (
    <div className="flex justify-between text-xs">
      <span className={cn(bold ? "font-bold text-foreground" : "text-muted-foreground")}>{label}</span>
      <span className={cn("font-medium", bold ? "text-foreground text-sm" : negative ? "text-destructive" : "text-foreground")}>
        {negative ? "−" : ""}₦{fmt(Math.round(Math.abs(value)))}
      </span>
    </div>
  );
}

function HighlightCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <Card>
      <CardContent className="p-3.5 text-center">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-lg font-bold text-foreground mt-1">{value}</p>
        <p className="text-[10px] text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  );
}
