import { useState } from "react";
import { ArrowRight, ArrowLeft, Check, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface OnboardingData {
  jobSearchStatus: string;
  currentRole: string;
  currentSalaryRange: string;
  targetRole: string;
  targetSalaryRange: string;
  timeline: string;
  workPreference: string[];
  struggles: string[];
  skills: string[];
  location: string;
}

const statusOptions = [
  { value: "employed_looking", icon: "💼", label: "I have a job and want a better one" },
  { value: "active_search", icon: "🔍", label: "I'm actively job searching" },
  { value: "student", icon: "🎓", label: "I'm a student / recent grad" },
  { value: "freelancer", icon: "💻", label: "I'm a freelancer looking for more clients" },
  { value: "career_switch", icon: "🔄", label: "I want to change careers entirely" },
  { value: "exploring", icon: "🌱", label: "I'm exploring — not sure yet" },
];

const salaryRanges = [
  "I'm not earning yet",
  "Below ₦100K/month",
  "₦100K - ₦300K/month",
  "₦300K - ₦500K/month",
  "₦500K - ₦1M/month",
  "Above ₦1M/month",
  "I prefer not to say",
];

const timelineOptions = [
  { value: "3_months", label: "In the next 3 months", sub: "urgent" },
  { value: "6_months", label: "In 6 months", sub: "focused" },
  { value: "1_year", label: "In the next year", sub: "steady" },
  { value: "exploring", label: "Just exploring for now", sub: "" },
];

const workPrefOptions = ["Remote", "Hybrid", "On-site", "Doesn't matter"];

const struggleOptions = [
  { icon: "📨", label: "I apply to loads of jobs but get no responses" },
  { icon: "💰", label: "I'm underpaid and don't know how to negotiate" },
  { icon: "🔄", label: "I want to switch careers but don't know how" },
  { icon: "👤", label: "No one knows who I am professionally" },
  { icon: "📝", label: "My resume doesn't reflect how good I actually am" },
  { icon: "🤝", label: "I don't have a professional network" },
  { icon: "🎤", label: "Interviews make me nervous" },
  { icon: "📚", label: "I need to learn new skills but don't know where to start" },
  { icon: "📊", label: "I don't know my market value" },
];

const locationOptions = ["Lagos", "Abuja", "Port Harcourt", "Ibadan", "Other Nigeria", "Outside Nigeria"];

const roleSuggestions = ["Product Manager", "UX Designer", "Data Analyst", "Marketing Manager", "Software Engineer", "Product Marketing Manager", "Content Strategist", "Business Analyst"];

function computePersona(data: OnboardingData): string {
  if (data.jobSearchStatus === "student") return "starter";
  if (data.jobSearchStatus === "career_switch") return "switcher";
  if (data.jobSearchStatus === "freelancer") return "freelancer";
  if (data.jobSearchStatus === "exploring") return "explorer";
  if (data.jobSearchStatus === "employed_looking") return "climber";
  return "climber";
}

export default function OnboardingWizard({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    jobSearchStatus: "",
    currentRole: "",
    currentSalaryRange: "",
    targetRole: "",
    targetSalaryRange: "",
    timeline: "",
    workPreference: [],
    struggles: [],
    skills: [],
    location: "",
  });
  const [skillInput, setSkillInput] = useState("");

  const update = (field: keyof OnboardingData, value: any) => setData((d) => ({ ...d, [field]: value }));

  const toggleArray = (field: "workPreference" | "struggles", value: string) => {
    setData((d) => {
      const arr = d[field] as string[];
      return { ...d, [field]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value] };
    });
  };

  const addSkill = (s: string) => {
    if (s && !data.skills.includes(s)) update("skills", [...data.skills, s]);
    setSkillInput("");
  };

  const canProceed = () => {
    if (step === 1) return data.jobSearchStatus && data.currentRole;
    if (step === 2) return data.targetRole;
    if (step === 3) return data.struggles.length > 0;
    return true;
  };

  const persona = computePersona(data);
  const personaLabels: Record<string, { icon: string; label: string; desc: string }> = {
    climber: { icon: "🧗", label: "The Climber", desc: "You know your field — now you want more." },
    switcher: { icon: "🔄", label: "The Switcher", desc: "New direction, new energy. Let's bridge the gap." },
    starter: { icon: "🌱", label: "The Starter", desc: "Building your foundation. Every expert started here." },
    explorer: { icon: "🧭", label: "The Explorer", desc: "Figuring it out is the first step. We'll explore together." },
    freelancer: { icon: "💻", label: "The Freelancer", desc: "More clients, better rates. Let's grow your business." },
  };

  const handleComplete = async () => {
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("profiles")
        .update({
          current_role: data.currentRole,
          current_salary_range: data.currentSalaryRange,
          target_role: data.targetRole,
          target_salary_min: 0,
          career_goal: `Get ${data.targetRole} within ${data.timeline}`,
          struggle_areas: data.struggles,
          job_search_status: data.jobSearchStatus,
          onboarding_completed: true,
          career_persona: persona,
          work_preference: data.workPreference,
          skills: data.skills,
          location: data.location,
        } as any)
        .eq("user_id", userData.user.id);

      if (error) throw error;
      toast.success("Welcome to Compass! 🧭");
      onComplete();
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl border shadow-elevated w-full max-w-[640px] max-h-[90vh] overflow-y-auto">
        {/* Progress */}
        <div className="p-6 pb-0">
          <div className="flex items-center gap-1 mb-6">
            {[1, 2, 3, 4, 5].map((s) => (
              <div key={s} className={`flex-1 h-1.5 rounded-full transition-colors ${s <= step ? "bg-primary" : "bg-muted"}`} />
            ))}
          </div>
        </div>

        <div className="px-6 pb-6">
          {/* STEP 1 */}
          {step === 1 && (
            <div className="animate-fade-in">
              <h2 className="text-xl font-bold text-foreground mb-1">Let's get to know you 👋</h2>
              <p className="text-sm text-muted-foreground mb-6">Takes 2 minutes. Makes everything you see 10× more relevant.</p>

              <label className="text-xs font-semibold text-foreground mb-2 block">What best describes you right now?</label>
              <div className="grid grid-cols-2 gap-2 mb-5">
                {statusOptions.map((o) => (
                  <button key={o.value} onClick={() => update("jobSearchStatus", o.value)}
                    className={`text-left p-3 rounded-xl border text-sm transition-all ${data.jobSearchStatus === o.value ? "border-primary bg-accent" : "border-border hover:border-primary/20"}`}>
                    <span className="mr-2">{o.icon}</span>{o.label}
                  </button>
                ))}
              </div>

              <label className="text-xs font-semibold text-foreground mb-1.5 block">What's your current role?</label>
              <input value={data.currentRole} onChange={(e) => update("currentRole", e.target.value)}
                placeholder="e.g. Virtual Assistant, Software Engineer, Student"
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-border bg-card focus:border-primary focus:outline-none mb-5" />

              <label className="text-xs font-semibold text-foreground mb-1.5 block">What's your monthly income range?</label>
              <div className="grid grid-cols-2 gap-1.5">
                {salaryRanges.map((r) => (
                  <button key={r} onClick={() => update("currentSalaryRange", r)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${data.currentSalaryRange === r ? "gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-border"}`}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="animate-fade-in">
              <h2 className="text-xl font-bold text-foreground mb-1">What's the goal? 🎯</h2>
              <p className="text-sm text-muted-foreground mb-6">Tell us where you want to go.</p>

              <label className="text-xs font-semibold text-foreground mb-1.5 block">What role are you aiming for?</label>
              <input value={data.targetRole} onChange={(e) => update("targetRole", e.target.value)}
                placeholder="e.g. Product Manager, UX Designer"
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-border bg-card focus:border-primary focus:outline-none mb-2" />
              <div className="flex flex-wrap gap-1.5 mb-5">
                {roleSuggestions.filter((r) => r !== data.targetRole).slice(0, 6).map((r) => (
                  <button key={r} onClick={() => update("targetRole", r)}
                    className="pill text-[10px] text-primary bg-accent hover:bg-primary hover:text-primary-foreground transition-colors">
                    {r}
                  </button>
                ))}
              </div>

              <label className="text-xs font-semibold text-foreground mb-1.5 block">What income are you targeting?</label>
              <div className="grid grid-cols-2 gap-1.5 mb-5">
                {salaryRanges.filter((r) => r !== "I prefer not to say" && r !== "I'm not earning yet").map((r) => (
                  <button key={r} onClick={() => update("targetSalaryRange", r)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${data.targetSalaryRange === r ? "gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-border"}`}>
                    {r}
                  </button>
                ))}
              </div>

              <label className="text-xs font-semibold text-foreground mb-1.5 block">When do you want to get there?</label>
              <div className="grid grid-cols-2 gap-2 mb-5">
                {timelineOptions.map((t) => (
                  <button key={t.value} onClick={() => update("timeline", t.value)}
                    className={`text-left p-3 rounded-xl border text-sm transition-all ${data.timeline === t.value ? "border-primary bg-accent" : "border-border hover:border-primary/20"}`}>
                    {t.label} {t.sub && <span className="text-[10px] text-muted-foreground ml-1">({t.sub})</span>}
                  </button>
                ))}
              </div>

              <label className="text-xs font-semibold text-foreground mb-1.5 block">Work preference</label>
              <div className="flex gap-2">
                {workPrefOptions.map((w) => (
                  <button key={w} onClick={() => toggleArray("workPreference", w)}
                    className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${data.workPreference.includes(w) ? "gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-border"}`}>
                    {w}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="animate-fade-in">
              <h2 className="text-xl font-bold text-foreground mb-1">What's your biggest challenge? 💬</h2>
              <p className="text-sm text-muted-foreground mb-6">Be honest — this helps us focus your plan.</p>
              <div className="space-y-2">
                {struggleOptions.map((s) => (
                  <button key={s.label} onClick={() => toggleArray("struggles", s.label)}
                    className={`w-full text-left p-3 rounded-xl border text-sm transition-all flex items-center gap-3 ${data.struggles.includes(s.label) ? "border-primary bg-accent" : "border-border hover:border-primary/20"}`}>
                    <span>{s.icon}</span>
                    <span className="flex-1">{s.label}</span>
                    {data.struggles.includes(s.label) && <Check className="w-4 h-4 text-primary" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 4 */}
          {step === 4 && (
            <div className="animate-fade-in">
              <h2 className="text-xl font-bold text-foreground mb-1">Speed things up ⚡</h2>
              <p className="text-sm text-muted-foreground mb-6">Add your skills and location.</p>

              <label className="text-xs font-semibold text-foreground mb-1.5 block">Your key skills</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {data.skills.map((s) => (
                  <span key={s} className="pill-blue flex items-center gap-1.5">
                    {s}
                    <button onClick={() => update("skills", data.skills.filter((x) => x !== s))} className="text-primary/50 hover:text-primary">&times;</button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2 mb-2">
                <input value={skillInput} onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addSkill(skillInput.trim())}
                  placeholder="Type a skill and press Enter"
                  className="flex-1 px-3 py-2 text-sm rounded-xl border border-border bg-card focus:border-primary focus:outline-none" />
              </div>
              <div className="flex flex-wrap gap-1.5 mb-6">
                {roleSuggestions.filter((r) => !data.skills.includes(r)).map((r) => (
                  <button key={r} onClick={() => addSkill(r)}
                    className="pill text-[10px] text-primary bg-accent hover:bg-primary hover:text-primary-foreground transition-colors">+ {r}</button>
                ))}
              </div>

              <label className="text-xs font-semibold text-foreground mb-1.5 block">Where are you based?</label>
              <div className="grid grid-cols-3 gap-2">
                {locationOptions.map((l) => (
                  <button key={l} onClick={() => update("location", l)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${data.location === l ? "gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-border"}`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 5 */}
          {step === 5 && (
            <div className="animate-fade-in">
              <h2 className="text-xl font-bold text-foreground mb-1">Your Compass is ready 🧭</h2>
              <p className="text-sm text-muted-foreground mb-6">Here's what we've personalized for you.</p>

              {/* Persona badge */}
              <div className="gradient-primary rounded-xl p-4 text-primary-foreground mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{personaLabels[persona]?.icon}</span>
                  <div>
                    <p className="text-sm font-bold">{personaLabels[persona]?.label}</p>
                    <p className="text-xs opacity-80">{personaLabels[persona]?.desc}</p>
                  </div>
                </div>
              </div>

              {/* Preview cards */}
              <div className="space-y-3">
                <div className="card-surface p-4">
                  <p className="text-sm font-semibold text-foreground mb-1">🗺️ Your 90-Day Plan</p>
                  <p className="text-xs text-muted-foreground">Getting from {data.currentRole || "where you are"} to {data.targetRole || "your target role"}</p>
                </div>
                <div className="card-surface p-4">
                  <p className="text-sm font-semibold text-foreground mb-1">💼 Job Matches</p>
                  <p className="text-xs text-muted-foreground">We'll find jobs matched to your skills and goals</p>
                </div>
                <div className="card-surface p-4">
                  <p className="text-sm font-semibold text-foreground mb-1">📊 Income Gap</p>
                  <p className="text-xs text-muted-foreground">{data.currentSalaryRange || "Current"} → {data.targetSalaryRange || "Target"}</p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
            {step > 1 ? (
              <Button variant="ghost" size="sm" onClick={() => setStep(step - 1)}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Back
              </Button>
            ) : <div />}

            {step < 5 ? (
              <Button size="sm" onClick={() => setStep(step + 1)} disabled={!canProceed()} className="gradient-primary text-primary-foreground">
                Continue <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button size="sm" onClick={handleComplete} disabled={saving} className="gradient-primary text-primary-foreground">
                {saving ? "Setting up..." : "Go to my dashboard →"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
