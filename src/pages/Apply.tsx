import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Target,
  FileText,
  Mail,
  MessageSquare,
  DollarSign,
  Copy,
  Check,
  ArrowRight,
  Coins,
  Mic,
  BarChart3,
  GraduationCap,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { requireSignedIn } from "@/lib/require-signed-in";

// ---------- Types ----------
interface MatchData {
  score: number;
  verdict: string;
  why_you_fit: string[];
  gaps: string[];
  compass_says: string;
  interview_heads_up: string;
  matching_skills: string[];
  missing_skills: string[];
}

interface ApplyResult {
  job_title: string;
  company: string;
  match: MatchData;
  resume_bullets: {
    bullets: string[];
    keywords: string[];
    summary_line: string;
  };
  cover_letter: {
    subject: string;
    body: string;
  };
  outreach_email: {
    subject: string;
    body: string;
    ps_tip: string;
  };
  salary: {
    market_range: string;
    for_experience: string;
    vs_target: string;
    vs_target_detail: string;
    jd_salary: string;
    script: string;
    negotiation_tip: string;
    red_flags: string;
  };
}

// ---------- Helpers ----------
function CopyBtn({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
    >
      {copied ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copied" : label || "Copy"}
    </button>
  );
}

const generatingSteps = [
  { icon: Target, label: "Analysing match..." },
  { icon: FileText, label: "Writing resume bullets..." },
  { icon: Mail, label: "Writing cover letter..." },
  { icon: MessageSquare, label: "Writing outreach email..." },
  { icon: DollarSign, label: "Analysing salary..." },
];

const tabs = [
  { key: "match", label: "Match Score", icon: Target },
  { key: "resume", label: "Resume", icon: FileText },
  { key: "cover", label: "Cover Letter", icon: Mail },
  { key: "email", label: "Email", icon: MessageSquare },
  { key: "salary", label: "Salary", icon: DollarSign },
] as const;

type TabKey = typeof tabs[number]["key"];

// ---------- Score color helpers ----------
function scoreColor(score: number) {
  if (score >= 90) return { bg: "bg-success-tint", text: "text-success", ring: "ring-success/30" };
  if (score >= 75) return { bg: "bg-primary-tint", text: "text-primary", ring: "ring-primary/30" };
  if (score >= 60) return { bg: "bg-amber-tint", text: "text-amber", ring: "ring-amber/30" };
  return { bg: "bg-destructive-tint", text: "text-destructive", ring: "ring-destructive/30" };
}

// ========== COMPONENT ==========
export default function ApplyPage() {
  const navigate = useNavigate();
  const [jobText, setJobText] = useState("");
  const [loading, setLoading] = useState(false);
  const [genStep, setGenStep] = useState(0);
  const [result, setResult] = useState<ApplyResult | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("match");
  const [tokens, setTokens] = useState<number | null>(null);

  // Log application form
  const [logForm, setLogForm] = useState({
    role: "",
    company: "",
    recruiterName: "",
    recruiterEmail: "",
    recruiterPhone: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Load tokens
  useState(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("tokens_remaining").eq("user_id", user.id).single();
      if (data) setTokens(data.tokens_remaining);
    })();
  });

  // ---------- Generate ----------
  const handleGenerate = async () => {
    if (jobText.trim().length < 100) {
      toast.error("Please paste at least a few sentences of the job description.");
      return;
    }
    setLoading(true);
    setGenStep(0);
    setResult(null);
    setSaved(false);

    // Animate steps
    const interval = setInterval(() => {
      setGenStep(prev => {
        if (prev < 4) return prev + 1;
        clearInterval(interval);
        return prev;
      });
    }, 1800);

    try {
      const user = await requireSignedIn(navigate, "Sign up to generate your application package.");
      if (!user) return;

      const { data, error } = await supabase.functions.invoke("quick-apply", {
        body: { job_text: jobText },
      });

      clearInterval(interval);
      setGenStep(4);

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.result) {
        setResult(data.result);
        setLogForm(prev => ({
          ...prev,
          role: data.result.job_title || "",
          company: data.result.company || "",
        }));
        setActiveTab("match");
        toast.success("Application package ready!");
      }
    } catch (e: any) {
      clearInterval(interval);
      toast.error(e.message || "Generation failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  // ---------- Save Application ----------
  const handleSave = async () => {
    setSaving(true);
    try {
      const user = await requireSignedIn(navigate, "Sign up to save this application.");
      if (!user) return;

      await supabase.from("applications").insert({
        user_id: user.id,
        job_title: logForm.role,
        company: logForm.company,
        status: "applied",
        applied_date: new Date().toISOString(),
        match_score: result?.match?.score || 0,
        notes: [
          logForm.notes,
          logForm.recruiterName && `Recruiter: ${logForm.recruiterName}`,
          logForm.recruiterEmail && `Email: ${logForm.recruiterEmail}`,
          logForm.recruiterPhone && `Phone: ${logForm.recruiterPhone}`,
        ].filter(Boolean).join("\n"),
      });

      setSaved(true);
      toast.success("Application saved to tracker!");
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  // ---------- Reset ----------
  const handleReset = () => {
    setResult(null);
    setJobText("");
    setSaved(false);
    setGenStep(0);
  };

  // ========== GENERATING STATE ==========
  if (loading) {
    return (
      <div className="max-w-[680px] mx-auto animate-fade-in pt-8">
        <div className="card-surface text-center py-12">
          <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-5">
            <Target className="w-7 h-7 text-primary-foreground animate-pulse" />
          </div>
          <h2 className="text-[18px] font-extrabold text-foreground mb-1">Generating your application package</h2>
          <p className="text-[13px] text-muted-foreground mb-8">This usually takes 15–30 seconds</p>
          <div className="max-w-[320px] mx-auto space-y-3">
            {generatingSteps.map((step, i) => {
              const done = i < genStep;
              const active = i === genStep;
              return (
                <div key={i} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-500 ${done ? "bg-success-tint" : active ? "bg-primary-tint" : "bg-muted/50"}`}>
                  <step.icon className={`w-4 h-4 transition-colors duration-500 ${done ? "text-success" : active ? "text-primary" : "text-muted-foreground/40"}`} />
                  <span className={`text-[13px] font-semibold transition-colors duration-500 ${done ? "text-success" : active ? "text-primary" : "text-muted-foreground/40"}`}>
                    {step.label}
                  </span>
                  {done && <Check className="w-4 h-4 text-success ml-auto" />}
                  {active && <span className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin ml-auto" />}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ========== RESULTS ==========
  if (result) {
    const m = result.match;
    const sc = scoreColor(m?.score || 0);

    return (
      <div className="max-w-[800px] mx-auto animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-[24px] font-black text-foreground tracking-[-0.3px]">{result.job_title}</h1>
            <p className="text-[13px] text-muted-foreground mt-0.5">{result.company}</p>
          </div>
          <button onClick={handleReset} className="text-[13px] font-bold text-primary hover:underline">
            ← Apply to another job
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-muted rounded-2xl p-1">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[12px] font-bold transition-all flex-1 justify-center ${
                activeTab === t.key
                  ? "bg-card text-foreground shadow-card"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="card-surface mb-6">
          {/* MATCH TAB */}
          {activeTab === "match" && m && (
            <div className="space-y-6">
              {/* Score circle */}
              <div className="flex items-center gap-6">
                <div className={`w-24 h-24 rounded-full ${sc.bg} ring-4 ${sc.ring} flex flex-col items-center justify-center shrink-0`}>
                  <span className={`text-[32px] font-black ${sc.text}`}>{m.score}</span>
                </div>
                <div>
                  <span className={`pill ${sc.bg} ${sc.text} mb-2`}>{m.verdict}</span>
                  <p className="text-[14px] font-extrabold text-foreground mt-2">{m.compass_says}</p>
                </div>
              </div>

              {/* Why you fit */}
              <div>
                <p className="label-caps mb-2">✅ WHY YOU FIT THIS ROLE</p>
                <ul className="space-y-1.5">
                  {m.why_you_fit?.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-[13px] text-foreground">
                      <span className="text-success mt-0.5">•</span> {r}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Gaps */}
              <div>
                <p className="label-caps mb-2">⚠️ GAPS TO BE AWARE OF</p>
                <ul className="space-y-1.5">
                  {m.gaps?.map((g, i) => (
                    <li key={i} className="flex items-start gap-2 text-[13px] text-foreground">
                      <span className="text-amber mt-0.5">•</span> {g}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Skills chips */}
              {m.matching_skills?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {m.matching_skills.map((s, i) => (
                    <span key={i} className="pill-green">{s}</span>
                  ))}
                  {m.missing_skills?.map((s, i) => (
                    <span key={i} className="pill bg-destructive-tint text-destructive">{s}</span>
                  ))}
                </div>
              )}

              {/* Interview heads up */}
              {m.interview_heads_up && (
                <div className="bg-muted rounded-xl p-4">
                  <p className="label-caps mb-1">🎤 INTERVIEW HEADS-UP</p>
                  <p className="text-[13px] text-foreground">{m.interview_heads_up}</p>
                </div>
              )}

              {/* Recommendation Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                <div className="rounded-xl p-4 border border-primary-border bg-primary-tint">
                  <p className="text-[13px] font-extrabold text-foreground mb-1">📄 Prepare for interviews</p>
                  <p className="text-[11px] text-muted-foreground mb-3">Top 3 questions they'll ask based on this JD</p>
                  <button onClick={() => navigate("/tools/interview")} className="text-[12px] font-bold text-primary flex items-center gap-1 hover:underline">
                    Prepare answers → 1 token <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
                <div className="rounded-xl p-4 border border-amber/20 bg-amber-tint">
                  <p className="text-[13px] font-extrabold text-foreground mb-1">📊 Is this salary fair?</p>
                  <p className="text-[11px] text-muted-foreground mb-3">Check market rate for this role</p>
                  <button onClick={() => setActiveTab("salary")} className="text-[12px] font-bold text-amber flex items-center gap-1 hover:underline">
                    View salary analysis → Free <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
                <div className="rounded-xl p-4 border border-violet/20 bg-violet-tint">
                  <p className="text-[13px] font-extrabold text-foreground mb-1">🎓 Missing skills?</p>
                  <p className="text-[11px] text-muted-foreground mb-3">{m.missing_skills?.length || 0} skills to close the gap</p>
                  <button onClick={() => navigate("/internships")} className="text-[12px] font-bold text-violet flex items-center gap-1 hover:underline">
                    See internships <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* RESUME TAB */}
          {activeTab === "resume" && result.resume_bullets && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <p className="label-caps">TAILORED RESUME BULLETS</p>
                <CopyBtn text={result.resume_bullets.bullets.join("\n")} label="Copy all" />
              </div>
              <ul className="space-y-3">
                {result.resume_bullets.bullets.map((b, i) => (
                  <li key={i} className="flex items-start gap-3 text-[13px] text-foreground leading-relaxed">
                    <span className="text-primary font-black mt-0.5">{i + 1}</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>

              {result.resume_bullets.keywords?.length > 0 && (
                <div>
                  <p className="label-caps mb-2">KEYWORDS TO ADD</p>
                  <div className="flex flex-wrap gap-1.5">
                    {result.resume_bullets.keywords.map((k, i) => (
                      <span key={i} className="pill-blue">{k}</span>
                    ))}
                  </div>
                </div>
              )}

              {result.resume_bullets.summary_line && (
                <div className="bg-muted rounded-xl p-4">
                  <p className="label-caps mb-1">ADD TO YOUR SUMMARY</p>
                  <p className="text-[13px] text-foreground italic">"{result.resume_bullets.summary_line}"</p>
                </div>
              )}

              <p className="text-[11px] text-muted-foreground">
                These bullets were written using your Brag File wins.{" "}
                <button onClick={() => navigate("/brag-file")} className="text-primary font-bold hover:underline">Add more wins →</button>
              </p>
            </div>
          )}

          {/* COVER LETTER TAB */}
          {activeTab === "cover" && result.cover_letter && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="label-caps">COVER LETTER</p>
                <CopyBtn text={`${result.cover_letter.subject}\n\n${result.cover_letter.body}`} />
              </div>
              <div className="bg-muted rounded-xl px-5 py-3">
                <p className="text-[13px] font-extrabold text-foreground">{result.cover_letter.subject}</p>
              </div>
              <div className="text-[13px] text-foreground leading-[1.8] whitespace-pre-line">
                {result.cover_letter.body}
              </div>
            </div>
          )}

          {/* EMAIL TAB */}
          {activeTab === "email" && result.outreach_email && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="label-caps">OUTREACH EMAIL</p>
                <CopyBtn text={`Subject: ${result.outreach_email.subject}\n\n${result.outreach_email.body}`} />
              </div>
              <div className="bg-muted rounded-xl px-5 py-3">
                <p className="text-[13px] font-extrabold text-foreground">{result.outreach_email.subject}</p>
              </div>
              <div className="text-[13px] text-foreground leading-[1.8] whitespace-pre-line">
                {result.outreach_email.body}
              </div>
              {result.outreach_email.ps_tip && (
                <div className="bg-primary-tint rounded-xl p-4">
                  <p className="label-caps mb-1">P.S. TIP</p>
                  <p className="text-[13px] text-foreground">{result.outreach_email.ps_tip}</p>
                </div>
              )}
              <p className="text-[11px] text-muted-foreground">Address this to the hiring manager by name if you have it.</p>
            </div>
          )}

          {/* SALARY TAB */}
          {activeTab === "salary" && result.salary && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted rounded-xl p-4">
                  <p className="label-caps mb-1">MARKET RANGE</p>
                  <p className="text-[16px] font-black text-foreground">{result.salary.market_range}</p>
                </div>
                <div className="bg-muted rounded-xl p-4">
                  <p className="label-caps mb-1">FOR YOUR EXPERIENCE</p>
                  <p className="text-[16px] font-black text-foreground">{result.salary.for_experience}</p>
                </div>
              </div>

              <div className={`rounded-xl p-4 ${
                result.salary.vs_target?.includes("ABOVE") ? "bg-success-tint" :
                result.salary.vs_target?.includes("AT") ? "bg-primary-tint" : "bg-amber-tint"
              }`}>
                <p className="label-caps mb-1">VS YOUR TARGET</p>
                <p className="text-[14px] font-extrabold text-foreground">
                  {result.salary.vs_target} {result.salary.vs_target_detail}
                </p>
              </div>

              <div>
                <p className="label-caps mb-1">SALARY IN JD</p>
                <p className="text-[13px] text-foreground">{result.salary.jd_salary}</p>
              </div>

              <div className="bg-primary-tint rounded-xl p-5 border border-primary-border">
                <p className="label-caps mb-2">WHAT TO SAY WHEN THEY ASK YOUR SALARY</p>
                <p className="text-[14px] text-foreground font-medium italic leading-relaxed">
                  "{result.salary.script}"
                </p>
                <CopyBtn text={result.salary.script} label="Copy script" />
              </div>

              <div className="bg-muted rounded-xl p-4">
                <p className="label-caps mb-1">NEGOTIATION TIP</p>
                <p className="text-[13px] text-foreground">{result.salary.negotiation_tip}</p>
              </div>

              {result.salary.red_flags && result.salary.red_flags !== "None identified" && (
                <div className="bg-destructive-tint rounded-xl p-4">
                  <p className="label-caps mb-1">🚩 RED FLAGS</p>
                  <p className="text-[13px] text-foreground">{result.salary.red_flags}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Log Application Form */}
        {!saved ? (
          <div className="card-surface">
            <h3 className="text-[15px] font-extrabold text-foreground mb-4">Log this application</h3>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="label-caps mb-1.5 block">Role</label>
                <input value={logForm.role} onChange={e => setLogForm({...logForm, role: e.target.value})}
                  className="w-full px-4 py-2.5 text-[13px] rounded-[13px] border border-border bg-background focus:border-primary focus:outline-none" />
              </div>
              <div>
                <label className="label-caps mb-1.5 block">Company</label>
                <input value={logForm.company} onChange={e => setLogForm({...logForm, company: e.target.value})}
                  className="w-full px-4 py-2.5 text-[13px] rounded-[13px] border border-border bg-background focus:border-primary focus:outline-none" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div>
                <label className="label-caps mb-1.5 block">Recruiter name</label>
                <input value={logForm.recruiterName} onChange={e => setLogForm({...logForm, recruiterName: e.target.value})}
                  placeholder="Optional"
                  className="w-full px-4 py-2.5 text-[13px] rounded-[13px] border border-border bg-background focus:border-primary focus:outline-none" />
              </div>
              <div>
                <label className="label-caps mb-1.5 block">Recruiter email</label>
                <input type="email" value={logForm.recruiterEmail} onChange={e => setLogForm({...logForm, recruiterEmail: e.target.value})}
                  placeholder="Optional"
                  className="w-full px-4 py-2.5 text-[13px] rounded-[13px] border border-border bg-background focus:border-primary focus:outline-none" />
              </div>
              <div>
                <label className="label-caps mb-1.5 block">Recruiter phone</label>
                <input value={logForm.recruiterPhone} onChange={e => setLogForm({...logForm, recruiterPhone: e.target.value})}
                  placeholder="Optional"
                  className="w-full px-4 py-2.5 text-[13px] rounded-[13px] border border-border bg-background focus:border-primary focus:outline-none" />
              </div>
            </div>
            <div className="mb-4">
              <label className="label-caps mb-1.5 block">Notes</label>
              <textarea value={logForm.notes} onChange={e => setLogForm({...logForm, notes: e.target.value})}
                placeholder="Any notes about this application..."
                rows={2}
                className="w-full px-4 py-2.5 text-[13px] rounded-[13px] border border-border bg-background focus:border-primary focus:outline-none resize-none" />
            </div>
            <button
              onClick={handleSave}
              disabled={saving || !logForm.role || !logForm.company}
              className="w-full gradient-primary text-primary-foreground text-[13px] font-bold py-3 rounded-[14px] shadow-button disabled:opacity-40 transition-all"
            >
              {saving ? "Saving..." : "Save to application tracker →"}
            </button>
          </div>
        ) : (
          <div className="card-surface text-center">
            <Check className="w-8 h-8 text-success mx-auto mb-2" />
            <p className="text-[14px] font-extrabold text-foreground mb-1">Application saved!</p>
            <p className="text-[12px] text-muted-foreground mb-4">You can track it in your Applications page.</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => navigate("/applications")} className="text-[12px] font-bold text-primary hover:underline">
                View applications
              </button>
              <button onClick={handleReset} className="text-[12px] font-bold text-primary hover:underline">
                Apply to another job
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ========== INPUT STATE ==========
  return (
    <div className="max-w-[680px] mx-auto animate-fade-in pt-4">
      <h1 className="text-[28px] font-black text-foreground tracking-[-0.5px] mb-1">Apply to a Job</h1>
      <p className="text-[13px] text-muted-foreground mb-8">Paste the full job description. Compass does the rest.</p>

      <div className="card-surface">
        <label className="label-caps mb-3 block">PASTE THE JOB DESCRIPTION</label>
        <textarea
          value={jobText}
          onChange={(e) => setJobText(e.target.value)}
          placeholder={`Paste the full job description here...

Compass will analyse it against your profile and generate:
✦ Match score — should you apply?
✦ 5 tailored resume bullets
✦ Cover letter
✦ Hiring manager outreach email
✦ Salary advice and negotiation script`}
          rows={10}
          className="w-full px-4 py-3 text-[13px] rounded-[13px] border border-border bg-background text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none transition-all leading-relaxed"
        />

        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <Coins className="w-3.5 h-3.5 text-amber" />
            <span>3 tokens per generation · You have <span className="font-bold text-foreground">{tokens ?? "..."}</span> tokens</span>
          </div>
          <span className={`text-[11px] font-bold ${jobText.length >= 100 ? "text-success" : "text-muted-foreground/40"}`}>
            {jobText.length} chars
          </span>
        </div>

        <button
          onClick={handleGenerate}
          disabled={jobText.trim().length < 100}
          className="w-full mt-4 gradient-primary text-primary-foreground text-[14px] font-bold py-3.5 rounded-[14px] shadow-button disabled:opacity-30 disabled:shadow-none transition-all"
        >
          Generate everything → 3 tokens
        </button>
      </div>
    </div>
  );
}
