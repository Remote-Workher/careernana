import { useState } from "react";
import { Camera, Check, Circle, ExternalLink, MapPin, Pencil, Upload } from "lucide-react";

const completionItems = [
  { label: "Basic Info", pct: 10, done: true },
  { label: "Target Role", pct: 15, done: true },
  { label: "Skills", pct: 20, done: false },
  { label: "Resume Uploaded", pct: 20, done: true },
  { label: "Portfolio", pct: 15, done: false },
  { label: "Career Goals", pct: 20, done: false },
];

const suggestedSkills = ["Figma", "User Research", "Wireframing", "Design Systems", "Prototyping", "A/B Testing", "Sketch", "Adobe XD"];

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
    <div className="max-w-[900px] animate-fade-in">
      {/* Header Card */}
      <div className="card-surface p-6 mb-6">
        <div className="flex items-start gap-6">
          {/* Avatar */}
          <div className="relative">
            <div className="w-20 h-20 rounded-full gradient-blue-light flex items-center justify-center text-primary-foreground text-2xl font-bold">
              AO
            </div>
            <button className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-card border border-border shadow-card flex items-center justify-center">
              <Camera className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
            {/* Completion ring */}
            <svg className="absolute -inset-1.5 w-[92px] h-[92px] -rotate-90" viewBox="0 0 92 92">
              <circle cx="46" cy="46" r="42" fill="none" stroke="hsl(var(--border))" strokeWidth="3" />
              <circle cx="46" cy="46" r="42" fill="none" stroke="hsl(var(--primary))" strokeWidth="3" strokeDasharray={`${completion * 2.64} 264`} strokeLinecap="round" />
            </svg>
          </div>

          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">Amara Okafor</h1>
            <p className="text-sm text-muted-foreground">Senior Product Designer</p>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
              <MapPin className="w-3 h-3" /> Lagos, Nigeria
            </div>
            <p className="text-xs text-primary font-medium mt-1">{completion}% profile complete</p>
          </div>

          <button className="gradient-primary text-primary-foreground text-sm font-medium px-4 py-2 rounded-lg flex items-center gap-1.5">
            <Pencil className="w-3.5 h-3.5" /> Edit Profile
          </button>
        </div>

        {/* Completion Checklist */}
        <div className="mt-5 pt-5 border-t border-border">
          <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Profile Completion</p>
          <div className="grid grid-cols-3 gap-2">
            {completionItems.map((item) => (
              <div key={item.label} className={`flex items-center gap-2 text-xs p-2 rounded-lg ${item.done ? "bg-success-light text-success" : "bg-muted text-muted-foreground"}`}>
                {item.done ? <Check className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />}
                <span className="font-medium">{item.label}</span>
                <span className="ml-auto opacity-70">+{item.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Section 1: Basic Info */}
      <SectionCard title="Basic Info" icon="👤">
        <div className="grid grid-cols-2 gap-4">
          <InputField label="Full Name" value="Amara Okafor" />
          <InputField label="Professional Headline" value="Senior Product Designer" />
          <InputField label="Location" value="Lagos, Nigeria" />
          <InputField label="LinkedIn URL" value="linkedin.com/in/amaraokafor" icon={<ExternalLink className="w-3.5 h-3.5" />} />
          <InputField label="Personal Website" value="" placeholder="your-portfolio.com" />
          <InputField label="Phone Number" value="+234 801 234 5678" />
        </div>
      </SectionCard>

      {/* Section 2: Target Role */}
      <SectionCard title="Target Role" icon="🎯">
        <div className="grid grid-cols-2 gap-4">
          <InputField label="Job Title You're Looking For" value="Senior Product Designer" />
          <div />
          <InputField label="Minimum Salary (₦/month)" value="₦800,000" />
          <InputField label="Maximum Salary (₦/month)" value="₦1,200,000" />
        </div>

        <div className="mt-4">
          <label className="text-xs font-medium text-foreground mb-2 block">Preferred Work Style</label>
          <div className="flex gap-2">
            {["remote", "hybrid", "on-site", "flexible"].map((ws) => (
              <button key={ws} onClick={() => setWorkStyle(ws)}
                className={`px-4 py-2 rounded-lg text-xs font-medium capitalize transition-colors ${workStyle === ws ? "gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-border"}`}>
                {ws.replace("-", " ")}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <label className="text-xs font-medium text-foreground mb-2 block">Open to Work Status</label>
          <div className="flex gap-2">
            {[{ v: "actively_looking", l: "🟢 Actively Looking" }, { v: "casually_exploring", l: "🟡 Casually Exploring" }, { v: "not_looking", l: "🔴 Not Looking" }].map((o) => (
              <button key={o.v} onClick={() => setOpenToWork(o.v)}
                className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${openToWork === o.v ? "gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-border"}`}>
                {o.l}
              </button>
            ))}
          </div>
        </div>
      </SectionCard>

      {/* Section 3: Skills */}
      <SectionCard title="Skills" icon="⚡">
        <div className="flex flex-wrap gap-2 mb-3">
          {skills.map((s) => (
            <span key={s} className="pill-blue flex items-center gap-1.5">
              {s}
              <button onClick={() => setSkills(skills.filter((x) => x !== s))} className="text-primary/50 hover:text-primary text-sm leading-none">&times;</button>
            </span>
          ))}
        </div>
        <div className="flex gap-2 mb-4">
          <input
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addSkill(skillInput.trim())}
            placeholder="Type a skill and press Enter"
            className="flex-1 px-3 py-2 text-sm rounded-[9px] border border-border bg-card focus:border-primary focus:outline-none transition-colors"
          />
        </div>
        <p className="text-xs text-muted-foreground mb-2">Suggested based on your target role:</p>
        <div className="flex flex-wrap gap-1.5">
          {suggestedSkills.filter((s) => !skills.includes(s)).map((s) => (
            <button key={s} onClick={() => addSkill(s)} className="pill text-xs text-primary bg-accent hover:bg-primary hover:text-primary-foreground transition-colors">
              + {s}
            </button>
          ))}
        </div>
      </SectionCard>

      {/* Section 4: Resume */}
      <SectionCard title="Resume" icon="📄">
        <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/30 transition-colors cursor-pointer">
          <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm font-medium text-foreground">Drag & drop your resume (PDF)</p>
          <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
        </div>
        <div className="mt-4 p-3 rounded-xl bg-muted flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Amara_Okafor_Resume.pdf</p>
            <p className="text-xs text-muted-foreground">Uploaded Jan 15, 2026</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="pill-blue text-[11px] font-bold">AI Score: 78/100</span>
            <button className="text-xs text-primary font-medium hover:underline">Optimize with AI →</button>
          </div>
        </div>
      </SectionCard>

      {/* Section 5: Portfolio */}
      <SectionCard title="Portfolio" icon="🎨">
        <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/30 transition-colors cursor-pointer">
          <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm font-medium text-foreground">Upload work samples (PDF, images)</p>
          <p className="text-xs text-muted-foreground mt-1">or add links below</p>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <InputField label="Portfolio URL" value="" placeholder="your-portfolio.com" />
          <InputField label="Case Study Link" value="" placeholder="https://..." />
        </div>
      </SectionCard>

      {/* Section 6: Career Goals */}
      <SectionCard title="Career Goals" icon="🎯">
        <label className="text-xs font-medium text-foreground mb-1.5 block">What do you want to achieve in the next 90 days?</label>
        <textarea className="w-full px-3 py-2.5 text-sm rounded-[9px] border border-border bg-card focus:border-primary focus:outline-none resize-none h-24 transition-colors" defaultValue="Land a senior product designer role at a top Nigerian fintech company with a salary of ₦1M+/month." />
        <div className="grid grid-cols-3 gap-4 mt-4">
          <InputField label="Current Salary (₦/month)" value="₦600,000" />
          <InputField label="Target Salary (₦/month)" value="₦1,000,000" />
          <InputField label="Years of Experience" value="5" />
        </div>
        <div className="grid grid-cols-3 gap-4 mt-4">
          <InputField label="Degree" value="B.Sc. Computer Science" />
          <InputField label="Institution" value="University of Lagos" />
          <InputField label="Year" value="2020" />
        </div>
      </SectionCard>

      {/* Section 7: Remote WorkHER */}
      <div className="card-surface p-5 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">💜</span>
            <div>
              <p className="text-sm font-semibold text-foreground">Remote WorkHER Membership</p>
              <p className="text-xs text-muted-foreground">Not a member — Join Remote WorkHER to unlock Pro features</p>
            </div>
          </div>
          <a href="https://remoteworkher.com" target="_blank" rel="noopener noreferrer" className="gradient-primary text-primary-foreground text-xs font-medium px-4 py-2 rounded-lg hover:opacity-90 transition-opacity">
            Join Remote WorkHER
          </a>
        </div>
      </div>
    </div>
  );
}

function SectionCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="card-surface p-5 mb-5">
      <h2 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
        <span>{icon}</span> {title}
      </h2>
      {children}
    </div>
  );
}

function InputField({ label, value, placeholder, icon }: { label: string; value: string; placeholder?: string; icon?: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium text-foreground mb-1.5 block">{label}</label>
      <div className="relative">
        <input
          defaultValue={value}
          placeholder={placeholder}
          className="w-full px-3 py-2 text-sm rounded-[9px] border border-border bg-card focus:border-primary focus:outline-none transition-colors"
        />
        {icon && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</span>}
      </div>
    </div>
  );
}
