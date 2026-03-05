import { useState } from "react";
import { Camera, Check, Circle, ExternalLink, MapPin, Pencil, Upload } from "lucide-react";

const completionItems = [
  { label: "Basic Info", pct: 10, done: true },
  { label: "Target Role", pct: 15, done: true },
  { label: "Skills", pct: 20, done: false },
  { label: "Resume", pct: 20, done: true },
  { label: "Portfolio", pct: 15, done: false },
  { label: "Goals", pct: 20, done: false },
];

const suggestedSkills = ["Figma", "User Research", "Wireframing", "Design Systems", "Prototyping", "A/B Testing"];

export default function Profile() {
  const [skills, setSkills] = useState(["Product Design", "UX Research", "Figma", "Design Thinking"]);
  const [skillInput, setSkillInput] = useState("");
  const [openToWork, setOpenToWork] = useState("actively_looking");
  const [workStyle, setWorkStyle] = useState("remote");

  const completion = 55;
  const addSkill = (s: string) => {
    if (s && !skills.includes(s)) setSkills([...skills, s]);
    setSkillInput("");
  };

  return (
    <div className="animate-fade-in space-y-4">
      {/* Header Card */}
      <div className="card-surface p-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-16 h-16 rounded-full gradient-blue-light flex items-center justify-center text-primary-foreground text-xl font-bold">
              AO
            </div>
            <button className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-card border border-border shadow-card flex items-center justify-center">
              <Camera className="w-3 h-3 text-muted-foreground" />
            </button>
            <svg className="absolute -inset-1 w-[72px] h-[72px] -rotate-90" viewBox="0 0 72 72">
              <circle cx="36" cy="36" r="33" fill="none" stroke="hsl(var(--border))" strokeWidth="2.5" />
              <circle cx="36" cy="36" r="33" fill="none" stroke="hsl(var(--primary))" strokeWidth="2.5" strokeDasharray={`${completion * 2.07} 207`} strokeLinecap="round" />
            </svg>
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-foreground">Amara Okafor</h2>
            <p className="text-xs text-muted-foreground">Senior Product Designer</p>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
              <MapPin className="w-2.5 h-2.5" /> Lagos, Nigeria
            </div>
            <p className="text-[10px] text-primary font-semibold mt-0.5">{completion}% complete</p>
          </div>
        </div>

        {/* Completion */}
        <div className="mt-3 pt-3 border-t border-border">
          <div className="grid grid-cols-3 gap-1.5">
            {completionItems.map((item) => (
              <div key={item.label} className={`flex items-center gap-1.5 text-[10px] p-1.5 rounded-lg ${item.done ? "bg-success-light text-success" : "bg-muted text-muted-foreground"}`}>
                {item.done ? <Check className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
                <span className="font-medium truncate">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Basic Info */}
      <MobileSection title="Basic Info" icon="👤">
        <div className="space-y-3">
          <MobileInput label="Full Name" value="Amara Okafor" />
          <MobileInput label="Professional Headline" value="Senior Product Designer" />
          <MobileInput label="Location" value="Lagos, Nigeria" />
          <MobileInput label="LinkedIn" value="linkedin.com/in/amaraokafor" />
          <MobileInput label="Phone" value="+234 801 234 5678" />
        </div>
      </MobileSection>

      {/* Target Role */}
      <MobileSection title="Target Role" icon="🎯">
        <div className="space-y-3">
          <MobileInput label="Target Job Title" value="Senior Product Designer" />
          <div className="grid grid-cols-2 gap-3">
            <MobileInput label="Min Salary" value="₦800K" />
            <MobileInput label="Max Salary" value="₦1.2M" />
          </div>
        </div>

        <div className="mt-3">
          <label className="text-[10px] font-semibold text-foreground mb-1.5 block">Work Style</label>
          <div className="flex gap-1.5 flex-wrap">
            {["remote", "hybrid", "on-site", "flexible"].map((ws) => (
              <button key={ws} onClick={() => setWorkStyle(ws)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-medium capitalize transition-colors ${workStyle === ws ? "gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {ws.replace("-", " ")}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3">
          <label className="text-[10px] font-semibold text-foreground mb-1.5 block">Status</label>
          <div className="flex flex-col gap-1.5">
            {[{ v: "actively_looking", l: "🟢 Actively Looking" }, { v: "casually_exploring", l: "🟡 Exploring" }, { v: "not_looking", l: "🔴 Not Looking" }].map((o) => (
              <button key={o.v} onClick={() => setOpenToWork(o.v)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left ${openToWork === o.v ? "gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {o.l}
              </button>
            ))}
          </div>
        </div>
      </MobileSection>

      {/* Skills */}
      <MobileSection title="Skills" icon="⚡">
        <div className="flex flex-wrap gap-1.5 mb-3">
          {skills.map((s) => (
            <span key={s} className="pill-blue text-[11px] flex items-center gap-1">
              {s}
              <button onClick={() => setSkills(skills.filter((x) => x !== s))} className="text-primary/50 hover:text-primary">&times;</button>
            </span>
          ))}
        </div>
        <input
          value={skillInput}
          onChange={(e) => setSkillInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addSkill(skillInput.trim())}
          placeholder="Type a skill and press Enter"
          className="w-full px-3 py-2.5 text-sm rounded-xl border border-border bg-card focus:border-primary focus:outline-none mb-2"
        />
        <div className="flex flex-wrap gap-1.5">
          {suggestedSkills.filter((s) => !skills.includes(s)).map((s) => (
            <button key={s} onClick={() => addSkill(s)} className="text-[10px] text-primary bg-accent px-2.5 py-1 rounded-full font-medium active:bg-primary active:text-primary-foreground transition-colors">
              + {s}
            </button>
          ))}
        </div>
      </MobileSection>

      {/* Resume */}
      <MobileSection title="Resume" icon="📄">
        <div className="border-2 border-dashed border-border rounded-xl p-6 text-center active:border-primary/30 transition-colors">
          <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-1.5" />
          <p className="text-xs font-medium text-foreground">Upload resume (PDF)</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Tap to browse</p>
        </div>
        <div className="mt-3 p-3 rounded-xl bg-muted">
          <p className="text-xs font-medium text-foreground">Amara_Okafor_Resume.pdf</p>
          <div className="flex items-center justify-between mt-1">
            <p className="text-[10px] text-muted-foreground">Jan 15, 2026</p>
            <span className="pill-blue text-[10px] font-bold">Score: 78</span>
          </div>
        </div>
      </MobileSection>

      {/* Remote WorkHER */}
      <div className="card-surface p-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">💜</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground">Remote WorkHER</p>
            <p className="text-[10px] text-muted-foreground">Join to unlock Pro features</p>
          </div>
          <a href="https://remoteworkher.com" target="_blank" rel="noopener noreferrer" className="gradient-primary text-primary-foreground text-[11px] font-medium px-3 py-1.5 rounded-lg">
            Join
          </a>
        </div>
      </div>
    </div>
  );
}

function MobileSection({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="card-surface p-4">
      <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
        <span>{icon}</span> {title}
      </h2>
      {children}
    </div>
  );
}

function MobileInput({ label, value, placeholder }: { label: string; value: string; placeholder?: string }) {
  return (
    <div>
      <label className="text-[10px] font-semibold text-muted-foreground mb-1 block">{label}</label>
      <input
        defaultValue={value}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 text-sm rounded-xl border border-border bg-card focus:border-primary focus:outline-none"
      />
    </div>
  );
}
