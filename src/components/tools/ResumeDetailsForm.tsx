import { useState } from "react";
import { Plus, Trash2, ChevronDown, ChevronUp, Pencil, X } from "lucide-react";

export type ExperienceEntry = {
  title: string;
  company: string;
  location?: string;
  isRemote?: boolean;
  startDate: string;
  endDate: string;
  isPresent?: boolean;
  responsibilities: string[]; // 3 items
  achievement: string;
  // legacy field — kept so old rows still hydrate
  bullets?: string;
};

export type CertEntry = {
  name: string;
  issuer: string;
  year: string;
};

export type EducationEntry = {
  degreeType?: string; // BSc, MSc, HND, OND, Professional Cert, Bootcamp, Other
  field?: string;      // Field of study
  school: string;
  year: string;
  honours?: string;
  // legacy combined field
  degree?: string;
};

export type ResumeDetails = {
  fullName?: string;
  email?: string;
  phone?: string;
  city?: string;
  linkedin?: string;
  accentColor?: string;
  experience: ExperienceEntry[];
  certifications: CertEntry[];
  education: EducationEntry[];
  skills: string[];
  metrics: string;
};

export const ACCENT_PRESETS = [
  { id: "#E0487A", label: "Pink" },
  { id: "#0F766E", label: "Teal" },
  { id: "#1D4ED8", label: "Blue" },
  { id: "#6B3FA0", label: "Purple" },
  { id: "#D97706", label: "Amber" },
  { id: "#0F1724", label: "Black" },
];

const DEGREE_TYPES = ["BSc", "MSc", "HND", "OND", "Professional Cert", "Bootcamp", "Other"];

const inputCls =
  "w-full px-2.5 py-2 rounded-lg border border-border bg-card text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors";

function emptyExp(): ExperienceEntry {
  return {
    title: "",
    company: "",
    location: "",
    isRemote: false,
    startDate: "",
    endDate: "",
    isPresent: false,
    responsibilities: ["", "", ""],
    achievement: "",
  };
}

function suggestSkillsFor(title: string): string[] {
  const t = (title || "").toLowerCase();
  if (!t) return [];
  if (/(product\s*designer|ux|ui)/.test(t))
    return ["Figma", "User Research", "Prototyping", "Design Systems", "Usability Testing"];
  if (/(product\s*manager|pm\b)/.test(t))
    return ["Roadmapping", "Stakeholder Management", "Agile", "Data Analysis", "User Interviews"];
  if (/(software|engineer|developer|backend|frontend|fullstack)/.test(t))
    return ["JavaScript", "TypeScript", "React", "Node.js", "Git"];
  if (/(data|analyst|scientist)/.test(t))
    return ["SQL", "Python", "Excel", "Power BI", "Data Visualisation"];
  if (/(marketing|growth|content)/.test(t))
    return ["SEO", "Email Marketing", "Google Analytics", "Copywriting", "Campaign Management"];
  if (/(sales|account|business\s*development)/.test(t))
    return ["CRM (HubSpot)", "Pipeline Management", "Negotiation", "Cold Outreach", "Account Growth"];
  if (/(hr|people|talent|recruit)/.test(t))
    return ["Recruiting", "Onboarding", "Employee Relations", "HRIS", "Performance Management"];
  if (/(finance|accountant|account)/.test(t))
    return ["Financial Reporting", "Excel", "Budgeting", "Forecasting", "Reconciliation"];
  if (/(operations|ops|coo)/.test(t))
    return ["Process Improvement", "Vendor Management", "Cross-functional Coordination", "SOPs", "Reporting"];
  return ["Communication", "Project Management", "Problem Solving", "Microsoft Office", "Collaboration"];
}

export default function ResumeDetailsForm({
  value,
  onChange,
  targetRoleHint,
}: {
  value: ResumeDetails;
  onChange: (v: ResumeDetails) => void;
  targetRoleHint?: string;
}) {
  const [open, setOpen] = useState(true);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [skillDraft, setSkillDraft] = useState("");

  // ---- Experience helpers
  const addExp = () => {
    const next = [...value.experience, emptyExp()];
    onChange({ ...value, experience: next });
    setEditingIdx(next.length - 1);
  };
  const updExp = (i: number, patch: Partial<ExperienceEntry>) => {
    const next = [...value.experience];
    next[i] = { ...next[i], ...patch };
    onChange({ ...value, experience: next });
  };
  const updResp = (i: number, j: number, val: string) => {
    const next = [...value.experience];
    const r = [...(next[i].responsibilities || ["", "", ""])];
    r[j] = val;
    next[i] = { ...next[i], responsibilities: r };
    onChange({ ...value, experience: next });
  };
  const rmExp = (i: number) => {
    onChange({ ...value, experience: value.experience.filter((_, idx) => idx !== i) });
    if (editingIdx === i) setEditingIdx(null);
  };

  // ---- Certs
  const addCert = () =>
    onChange({ ...value, certifications: [...value.certifications, { name: "", issuer: "", year: "" }] });
  const updCert = (i: number, patch: Partial<CertEntry>) => {
    const next = [...value.certifications];
    next[i] = { ...next[i], ...patch };
    onChange({ ...value, certifications: next });
  };
  const rmCert = (i: number) =>
    onChange({ ...value, certifications: value.certifications.filter((_, idx) => idx !== i) });

  // ---- Education
  const addEdu = () =>
    onChange({
      ...value,
      education: [
        ...value.education,
        { degreeType: "BSc", field: "", school: "", year: "", honours: "" },
      ],
    });
  const updEdu = (i: number, patch: Partial<EducationEntry>) => {
    const next = [...value.education];
    next[i] = { ...next[i], ...patch };
    onChange({ ...value, education: next });
  };
  const rmEdu = (i: number) =>
    onChange({ ...value, education: value.education.filter((_, idx) => idx !== i) });

  // ---- Skills
  const skills = value.skills || [];
  const addSkill = (raw: string) => {
    const s = raw.trim();
    if (!s) return;
    if (skills.some((x) => x.toLowerCase() === s.toLowerCase())) return;
    onChange({ ...value, skills: [...skills, s] });
  };
  const rmSkill = (s: string) =>
    onChange({ ...value, skills: skills.filter((x) => x !== s) });

  const suggested = suggestSkillsFor(targetRoleHint || value.experience[0]?.title || "");
  const suggestedFiltered = suggested.filter(
    (s) => !skills.some((x) => x.toLowerCase() === s.toLowerCase())
  );

  return (
    <div className="rounded-xl border border-border bg-muted/30">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-left"
      >
        <div>
          <p className="text-[12px] font-bold text-foreground">Your details (jobs, education, skills)</p>
          <p className="text-[10px] text-muted-foreground">
            Be specific — AI rewrites it into a powerful resume.
          </p>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-4">
          {/* Contact info */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Contact info</p>
            <div className="space-y-1.5">
              <input className={inputCls} placeholder="Full name" value={value.fullName || ""} onChange={(ev) => onChange({ ...value, fullName: ev.target.value })} />
              <div className="grid grid-cols-2 gap-1.5">
                <input className={inputCls} placeholder="Email" value={value.email || ""} onChange={(ev) => onChange({ ...value, email: ev.target.value })} />
                <input className={inputCls} placeholder="Phone (e.g. +234 80…)" value={value.phone || ""} onChange={(ev) => onChange({ ...value, phone: ev.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <input className={inputCls} placeholder="City (e.g. Lagos)" value={value.city || ""} onChange={(ev) => onChange({ ...value, city: ev.target.value })} />
                <input className={inputCls} placeholder="LinkedIn URL" value={value.linkedin || ""} onChange={(ev) => onChange({ ...value, linkedin: ev.target.value })} />
              </div>
            </div>
          </div>

          {/* Accent color */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Accent color</p>
            <div className="flex items-center gap-2 flex-wrap">
              {ACCENT_PRESETS.map((c) => {
                const active = (value.accentColor || "#E0487A").toLowerCase() === c.id.toLowerCase();
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => onChange({ ...value, accentColor: c.id })}
                    title={c.label}
                    aria-label={c.label}
                    className={`w-7 h-7 rounded-full border-2 transition-all ${active ? "border-foreground scale-110" : "border-border hover:scale-105"}`}
                    style={{ background: c.id }}
                  />
                );
              })}
              <input
                type="color"
                value={value.accentColor || "#E0487A"}
                onChange={(ev) => onChange({ ...value, accentColor: ev.target.value })}
                className="w-7 h-7 rounded-full border border-border bg-transparent cursor-pointer"
                title="Custom color"
              />
            </div>
          </div>

          {/* WORK EXPERIENCE */}
          <div data-section="experience">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Work Experience</p>
              <button onClick={addExp} className="text-[11px] font-bold text-primary flex items-center gap-1">
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>
            <div className="space-y-2">
              {value.experience.length === 0 && (
                <p className="text-[11px] text-muted-foreground italic">No roles added yet.</p>
              )}
              {value.experience.map((e, i) => {
                const isEditing = editingIdx === i;
                if (!isEditing) {
                  return (
                    <div key={i} className="rounded-lg border border-border bg-card p-2.5 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[12px] font-bold text-foreground truncate">
                          {e.title || "Untitled role"} {e.company ? <span className="text-muted-foreground font-normal">· {e.company}</span> : null}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {(e.startDate || "?")}{e.endDate || e.isPresent ? ` – ${e.isPresent ? "Present" : e.endDate}` : ""}
                          {e.location || e.isRemote ? ` · ${e.isRemote ? "Remote" : e.location}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => setEditingIdx(i)} className="p-1 text-muted-foreground hover:text-primary" title="Edit">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => rmExp(i)} className="p-1 text-muted-foreground hover:text-destructive" title="Delete">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                }
                const resp = e.responsibilities && e.responsibilities.length === 3
                  ? e.responsibilities
                  : ["", "", ""];
                return (
                  <div key={i} className="rounded-lg border border-primary/40 bg-card p-2.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase text-primary">Editing role #{i + 1}</span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setEditingIdx(null)} className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-primary text-primary-foreground">
                          Done
                        </button>
                        <button onClick={() => rmExp(i)} className="p-1 text-muted-foreground hover:text-destructive" title="Delete">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <input className={inputCls} placeholder="Job title (e.g. Product Designer)" value={e.title} onChange={(ev) => updExp(i, { title: ev.target.value })} />
                    <input className={inputCls} placeholder="Company name (e.g. Paystack)" value={e.company} onChange={(ev) => updExp(i, { company: ev.target.value })} />
                    <div className="grid grid-cols-2 gap-1.5">
                      <input className={inputCls} placeholder="Start (e.g. Jan 2022)" value={e.startDate} onChange={(ev) => updExp(i, { startDate: ev.target.value })} />
                      <input
                        className={inputCls + (e.isPresent ? " opacity-50" : "")}
                        placeholder="End (e.g. Dec 2024)"
                        value={e.isPresent ? "Present" : e.endDate}
                        disabled={!!e.isPresent}
                        onChange={(ev) => updExp(i, { endDate: ev.target.value })}
                      />
                    </div>
                    <label className="flex items-center gap-2 text-[11px] text-foreground">
                      <input type="checkbox" checked={!!e.isPresent} onChange={(ev) => updExp(i, { isPresent: ev.target.checked, endDate: ev.target.checked ? "Present" : "" })} />
                      Present (still in this role)
                    </label>
                    <div className="grid grid-cols-1 gap-1.5">
                      <input
                        className={inputCls + (e.isRemote ? " opacity-50" : "")}
                        placeholder="Location (e.g. Lagos)"
                        value={e.isRemote ? "Remote" : (e.location || "")}
                        disabled={!!e.isRemote}
                        onChange={(ev) => updExp(i, { location: ev.target.value })}
                      />
                      <label className="flex items-center gap-2 text-[11px] text-foreground">
                        <input type="checkbox" checked={!!e.isRemote} onChange={(ev) => updExp(i, { isRemote: ev.target.checked, location: ev.target.checked ? "Remote" : "" })} />
                        Remote
                      </label>
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-[11px] font-bold text-foreground">What did you do in this role?</p>
                      {resp.map((r, j) => (
                        <textarea
                          key={j}
                          className={inputCls + " min-h-[44px] resize-none"}
                          placeholder={`Key responsibility #${j + 1} — rough is fine`}
                          value={r}
                          onChange={(ev) => updResp(i, j, ev.target.value)}
                        />
                      ))}
                    </div>

                    <div>
                      <p className="text-[11px] font-bold text-foreground mb-1">What's your biggest achievement here?</p>
                      <p className="text-[10px] text-muted-foreground mb-1">Even rough is fine — e.g. I grew the team, I launched a product, I increased sales</p>
                      <textarea
                        className={inputCls + " min-h-[60px] resize-none"}
                        placeholder="Your biggest win in this role"
                        value={e.achievement}
                        onChange={(ev) => updExp(i, { achievement: ev.target.value })}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* EDUCATION */}
          <div data-section="education">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Education</p>
              <button onClick={addEdu} className="text-[11px] font-bold text-primary flex items-center gap-1">
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>
            <div className="space-y-2">
              {value.education.length === 0 && (
                <p className="text-[11px] text-muted-foreground italic">No education added.</p>
              )}
              {value.education.map((ed, i) => (
                <div key={i} className="rounded-lg border border-border bg-card p-2.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground">School #{i + 1}</span>
                    <button onClick={() => rmEdu(i)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <select
                      className={inputCls}
                      value={ed.degreeType || "BSc"}
                      onChange={(ev) => updEdu(i, { degreeType: ev.target.value })}
                    >
                      {DEGREE_TYPES.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <input className={inputCls} placeholder="Field of study" value={ed.field || ""} onChange={(ev) => updEdu(i, { field: ev.target.value })} />
                  </div>
                  <input className={inputCls} placeholder="Institution name" value={ed.school} onChange={(ev) => updEdu(i, { school: ev.target.value })} />
                  <div className="grid grid-cols-2 gap-1.5">
                    <input className={inputCls} placeholder="Year graduated" value={ed.year} onChange={(ev) => updEdu(i, { year: ev.target.value })} />
                    <input className={inputCls} placeholder="Honours / coursework (optional)" value={ed.honours || ""} onChange={(ev) => updEdu(i, { honours: ev.target.value })} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CERTIFICATIONS */}
          <div data-section="certifications">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Certifications</p>
              <button onClick={addCert} className="text-[11px] font-bold text-primary flex items-center gap-1">
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>
            <div className="space-y-2">
              {value.certifications.length === 0 && (
                <p className="text-[11px] text-muted-foreground italic">No certifications added.</p>
              )}
              {value.certifications.map((c, i) => (
                <div key={i} className="rounded-lg border border-border bg-card p-2.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground">Cert #{i + 1}</span>
                    <button onClick={() => rmCert(i)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <input className={inputCls} placeholder="Certification name" value={c.name} onChange={(ev) => updCert(i, { name: ev.target.value })} />
                  <div className="grid grid-cols-2 gap-1.5">
                    <input className={inputCls} placeholder="Issuing body (Google, HubSpot…)" value={c.issuer} onChange={(ev) => updCert(i, { issuer: ev.target.value })} />
                    <input className={inputCls} placeholder="Year obtained" value={c.year} onChange={(ev) => updCert(i, { year: ev.target.value })} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SKILLS */}
          <div data-section="skills">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Skills</p>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {skills.length === 0 && (
                <p className="text-[11px] text-muted-foreground italic">No skills added yet.</p>
              )}
              {skills.map((s) => (
                <span key={s} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-[11px] font-medium">
                  {s}
                  <button onClick={() => rmSkill(s)} className="hover:text-destructive" aria-label={`Remove ${s}`}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <input
              className={inputCls}
              placeholder="Type a skill and press Enter"
              value={skillDraft}
              onChange={(ev) => setSkillDraft(ev.target.value)}
              onKeyDown={(ev) => {
                if (ev.key === "Enter" || ev.key === ",") {
                  ev.preventDefault();
                  addSkill(skillDraft);
                  setSkillDraft("");
                }
              }}
            />
            {suggestedFiltered.length > 0 && (
              <div className="mt-2">
                <p className="text-[10px] text-muted-foreground mb-1">Suggested for you:</p>
                <div className="flex flex-wrap gap-1.5">
                  {suggestedFiltered.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => addSkill(s)}
                      className="px-2 py-1 rounded-full bg-card border border-border text-[11px] text-foreground hover:border-primary/40 hover:text-primary"
                    >
                      + {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Extra context */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
              Paste any extra achievements, numbers, or context here
            </p>
            <textarea
              className={inputCls + " min-h-[80px] resize-none"}
              placeholder="e.g. Managed ₦50M budget · Grew newsletter to 12,000 subscribers · Reduced onboarding time by 30% · Won Employee of the Year 2023 · Spoke at 3 industry events"
              value={value.metrics}
              onChange={(ev) => onChange({ ...value, metrics: ev.target.value })}
            />
          </div>
        </div>
      )}
    </div>
  );
}
