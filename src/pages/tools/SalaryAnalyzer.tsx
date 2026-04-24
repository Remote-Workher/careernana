import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const salaryData: Record<string, { entry: [number, number]; mid: [number, number]; senior: [number, number]; lead: [number, number] }> = {
  "Product Designer": { entry: [100, 250], mid: [300, 600], senior: [600, 900], lead: [900, 1500] },
  "UX Designer": { entry: [100, 250], mid: [300, 600], senior: [600, 900], lead: [900, 1500] },
  "Product Manager": { entry: [150, 300], mid: [400, 700], senior: [700, 1200], lead: [1200, 2000] },
  "Software Engineer": { entry: [150, 350], mid: [400, 800], senior: [800, 1500], lead: [1500, 3000] },
  "Data Analyst": { entry: [100, 200], mid: [250, 500], senior: [500, 900], lead: [900, 1500] },
  "Marketing Manager": { entry: [80, 200], mid: [200, 450], senior: [450, 800], lead: [800, 1300] },
};

const companyData = [
  { name: "Paystack", tier: "Top tier", min: 600, max: 900 },
  { name: "Flutterwave", tier: "Top tier", min: 500, max: 800 },
  { name: "Andela", tier: "Senior", min: 450, max: 700 },
  { name: "Interswitch", tier: "Mid-senior", min: 400, max: 650 },
  { name: "Kuda", tier: "Mid", min: 350, max: 550 },
  { name: "PiggyVest", tier: "Mid", min: 300, max: 500 },
  { name: "Mono", tier: "Mid", min: 280, max: 480 },
  { name: "Terragon", tier: "Mid", min: 250, max: 450 },
];

const experienceLevels = ["0-2", "3-5", "6-9", "10+"];
const cities = ["Lagos", "Abuja", "Port Harcourt", "Ibadan", "Remote"];
const workTypes = ["Full-time", "Contract", "Freelance"];

function expToKey(exp: string): "entry" | "mid" | "senior" | "lead" {
  if (exp === "0-2") return "entry";
  if (exp === "3-5") return "mid";
  if (exp === "6-9") return "senior";
  return "lead";
}

function expLabel(key: string) {
  return { entry: "Entry (0-2 yrs)", mid: "Mid (3-5 yrs)", senior: "Senior (6-9 yrs)", lead: "Lead (10+ yrs)" }[key] || key;
}

function fmt(n: number) {
  return n >= 1000 ? `₦${(n / 1000).toFixed(1)}M` : `₦${n}K`;
}

export default function SalaryAnalyzer() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("Product Designer");
  const [experience, setExperience] = useState("3-5");
  const [city, setCity] = useState("Lagos");
  const [workType, setWorkType] = useState("Full-time");
  const [analyzed, setAnalyzed] = useState(false);
  const [loading, setLoading] = useState(false);

  const roleData = salaryData[title] || salaryData["Product Designer"];
  const levelKey = expToKey(experience);
  const [minSal, maxSal] = roleData[levelKey];
  const median = Math.round((minSal + maxSal) / 2);

  const handleAnalyze = () => {
    setLoading(true);
    setTimeout(() => { setLoading(false); setAnalyzed(true); }, 1200);
  };

  const maxBar = 3000;

  return (
    <div className="max-w-[1100px] animate-fade-in">
      <button onClick={() => navigate("/tools")} className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground mb-4 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to AI Tools
      </button>

      <h1 className="text-[22px] font-bold text-foreground mb-1">💰 Salary Analyzer</h1>
      <p className="text-[13px] text-muted-foreground mb-6">Know your market value in the Nigerian market</p>

      <div className="flex gap-6">
        {/* Left Panel */}
        <div className="w-[270px] shrink-0">
          <div className="bg-card rounded-[14px] border border-[#E8ECF0] p-5" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <p className="text-[13px] font-bold text-foreground mb-4">Your Details</p>

            <label className="block mb-3">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Job Title</span>
              <input value={title} onChange={(e) => { setTitle(e.target.value); setAnalyzed(false); }} className="w-full mt-1 px-3 py-2.5 rounded-[9px] border border-[#E8ECF0] bg-card text-[13px] text-foreground focus:outline-none focus:border-[#1565C0] transition-colors" />
            </label>

            <label className="block mb-3">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Years of Experience</span>
              <select value={experience} onChange={(e) => { setExperience(e.target.value); setAnalyzed(false); }} className="w-full mt-1 px-3 py-2.5 rounded-[9px] border border-[#E8ECF0] bg-card text-[13px] text-foreground focus:outline-none focus:border-[#1565C0] transition-colors">
                {experienceLevels.map((l) => <option key={l} value={l}>{l} years</option>)}
              </select>
            </label>

            <label className="block mb-3">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">City</span>
              <select value={city} onChange={(e) => { setCity(e.target.value); setAnalyzed(false); }} className="w-full mt-1 px-3 py-2.5 rounded-[9px] border border-[#E8ECF0] bg-card text-[13px] text-foreground focus:outline-none focus:border-[#1565C0] transition-colors">
                {cities.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>

            <label className="block mb-4">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Work Type</span>
              <select value={workType} onChange={(e) => { setWorkType(e.target.value); setAnalyzed(false); }} className="w-full mt-1 px-3 py-2.5 rounded-[9px] border border-[#E8ECF0] bg-card text-[13px] text-foreground focus:outline-none focus:border-[#1565C0] transition-colors">
                {workTypes.map((w) => <option key={w} value={w}>{w}</option>)}
              </select>
            </label>

            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="w-full py-3 rounded-[9px] text-[12px] font-semibold text-white transition-all disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #1565C0, #0288D1)" }}
            >
              {loading ? "Analysing market data..." : "Analyze My Market Value"}
            </button>
          </div>

          {analyzed && (
            <div className="mt-4 rounded-[14px] p-4" style={{ background: "linear-gradient(135deg, #EFF6FF, #E0F2FE)", border: "1px solid #BFDBFE" }}>
              <p className="text-[11px] leading-relaxed text-[#1565C0]">
                💡 <strong>Negotiation tip:</strong> Your Brag File shows quantified results. Use them in negotiation — professionals who present specific impact metrics push offers 15–20% above median.
              </p>
              <button className="mt-2 px-3 py-1.5 rounded-[9px] text-[11px] font-semibold text-[#1565C0] bg-white border border-[#BFDBFE] hover:bg-[#EFF6FF] transition-colors">
                Get negotiation script →
              </button>
            </div>
          )}
        </div>

        {/* Right Panel */}
        <div className="flex-1 space-y-4">
          {!analyzed ? (
            <div className="bg-card rounded-[14px] border border-[#E8ECF0] p-12 text-center" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <p className="text-[36px] mb-3">💰</p>
              <p className="text-[16px] font-bold text-foreground mb-1">Know your market value</p>
              <p className="text-[13px] text-muted-foreground">Fill in your details and click Analyze</p>
            </div>
          ) : (
            <>
              {/* Card 1 — Main Result */}
              <div className="rounded-[14px] p-6 text-white" style={{ background: "linear-gradient(135deg, #1565C0, #0288D1)", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
                <p className="text-[11px] font-semibold uppercase tracking-wider opacity-80 mb-3">
                  {title} · {experience} years · {city}
                </p>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-[11px] opacity-70 mb-1">Market Min</p>
                    <p className="text-[24px] font-bold">{fmt(minSal)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[11px] opacity-70 mb-1">Median</p>
                    <p className="text-[36px] font-bold">{fmt(median)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] opacity-70 mb-1">Market Max</p>
                    <p className="text-[24px] font-bold">{fmt(maxSal)}</p>
                  </div>
                </div>
                <p className="text-[11px] opacity-80">
                  🎯 Your Brag File strength puts you in the top 20% — aim for {fmt(Math.round(minSal * 1.3))}–{fmt(Math.round(median * 1.2))} minimum
                </p>
              </div>

              {/* Card 2 — Salary Bands */}
              <div className="bg-card rounded-[14px] border border-[#E8ECF0] p-5" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <p className="text-[13px] font-bold text-foreground mb-4">Salary bands by experience</p>
                <div className="space-y-3">
                  {(["entry", "mid", "senior", "lead"] as const).map((key) => {
                    const [lo, hi] = roleData[key];
                    const isActive = key === levelKey;
                    return (
                      <div key={key} className="flex items-center gap-3">
                        <div className="w-[140px] shrink-0">
                          <p className="text-[12px] font-semibold text-foreground">
                            {expLabel(key)} {isActive && <span className="text-[#1565C0] text-[10px]">← You</span>}
                          </p>
                          <p className="text-[11px] text-muted-foreground">{fmt(lo)} – {fmt(hi)}</p>
                        </div>
                        <div className="flex-1 h-3 rounded-full bg-[#F5F7FA] overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${(hi / maxBar) * 100}%`,
                              marginLeft: `${(lo / maxBar) * 100}%`,
                              background: isActive ? "linear-gradient(135deg, #1565C0, #0288D1)" : "rgba(21,101,192,0.25)",
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Card 3 — By Company */}
              <div className="bg-card rounded-[14px] border border-[#E8ECF0] p-5" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <p className="text-[13px] font-bold text-foreground mb-4">Salary ranges by company</p>
                <div className="space-y-2">
                  {companyData.map((c) => (
                    <div key={c.name} className="flex items-center gap-3 py-2 border-b border-[#E8ECF0] last:border-0">
                      <div className="w-8 h-8 rounded-[8px] flex items-center justify-center text-[12px] font-bold text-[#1565C0]" style={{ background: "#EFF6FF" }}>
                        {c.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold text-foreground">{c.name}</p>
                        <p className="text-[10px] text-muted-foreground">{c.tier}</p>
                      </div>
                      <p className="text-[12px] font-semibold text-[#1565C0] shrink-0">
                        {fmt(c.min)} – {fmt(c.max)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
