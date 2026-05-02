import { useState } from "react";
import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";

export type ExperienceEntry = {
  title: string;
  company: string;
  location?: string;
  startDate: string;
  endDate: string;
  bullets: string;
};

export type CertEntry = {
  name: string;
  issuer: string;
  year: string;
};

export type EducationEntry = {
  school: string;
  degree: string;
  year: string;
};

export type ResumeDetails = {
  experience: ExperienceEntry[];
  certifications: CertEntry[];
  education: EducationEntry[];
  metrics: string;
};

const inputCls =
  "w-full px-2.5 py-2 rounded-lg border border-border bg-card text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors";

export default function ResumeDetailsForm({
  value,
  onChange,
}: {
  value: ResumeDetails;
  onChange: (v: ResumeDetails) => void;
}) {
  const [open, setOpen] = useState(true);

  const addExp = () =>
    onChange({
      ...value,
      experience: [
        ...value.experience,
        { title: "", company: "", location: "", startDate: "", endDate: "", bullets: "" },
      ],
    });
  const updExp = (i: number, patch: Partial<ExperienceEntry>) => {
    const next = [...value.experience];
    next[i] = { ...next[i], ...patch };
    onChange({ ...value, experience: next });
  };
  const rmExp = (i: number) =>
    onChange({ ...value, experience: value.experience.filter((_, idx) => idx !== i) });

  const addCert = () =>
    onChange({
      ...value,
      certifications: [...value.certifications, { name: "", issuer: "", year: "" }],
    });
  const updCert = (i: number, patch: Partial<CertEntry>) => {
    const next = [...value.certifications];
    next[i] = { ...next[i], ...patch };
    onChange({ ...value, certifications: next });
  };
  const rmCert = (i: number) =>
    onChange({ ...value, certifications: value.certifications.filter((_, idx) => idx !== i) });

  const addEdu = () =>
    onChange({
      ...value,
      education: [...value.education, { school: "", degree: "", year: "" }],
    });
  const updEdu = (i: number, patch: Partial<EducationEntry>) => {
    const next = [...value.education];
    next[i] = { ...next[i], ...patch };
    onChange({ ...value, education: next });
  };
  const rmEdu = (i: number) =>
    onChange({ ...value, education: value.education.filter((_, idx) => idx !== i) });

  return (
    <div className="rounded-xl border border-border bg-muted/30">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-left"
      >
        <div>
          <p className="text-[12px] font-bold text-foreground">Your details (jobs, certs, metrics)</p>
          <p className="text-[10px] text-muted-foreground">
            Add real companies & numbers so AI doesn't leave blanks.
          </p>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-4">
          {/* Experience */}
          <div>
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
              {value.experience.map((e, i) => (
                <div key={i} className="rounded-lg border border-border bg-card p-2.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground">Role #{i + 1}</span>
                    <button onClick={() => rmExp(i)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <input className={inputCls} placeholder="Job title (e.g. Product Designer)" value={e.title} onChange={(ev) => updExp(i, { title: ev.target.value })} />
                  <input className={inputCls} placeholder="Company (e.g. Paystack)" value={e.company} onChange={(ev) => updExp(i, { company: ev.target.value })} />
                  <div className="grid grid-cols-2 gap-1.5">
                    <input className={inputCls} placeholder="Start (Jan 2022)" value={e.startDate} onChange={(ev) => updExp(i, { startDate: ev.target.value })} />
                    <input className={inputCls} placeholder="End (Present)" value={e.endDate} onChange={(ev) => updExp(i, { endDate: ev.target.value })} />
                  </div>
                  <input className={inputCls} placeholder="Location (Lagos, Remote)" value={e.location || ""} onChange={(ev) => updExp(i, { location: ev.target.value })} />
                  <textarea
                    className={inputCls + " min-h-[80px] resize-none"}
                    placeholder="Briefly describe what you did in this role — full sentences are fine. AI will turn it into strong, quantified bullet points. (e.g. 'I led the redesign of our checkout, worked with 3 engineers, and onboarding got faster')"
                    value={e.bullets}
                    onChange={(ev) => updExp(i, { bullets: ev.target.value })}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Certifications */}
          <div>
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
                  <input className={inputCls} placeholder="Name (e.g. PMP, Google UX)" value={c.name} onChange={(ev) => updCert(i, { name: ev.target.value })} />
                  <div className="grid grid-cols-2 gap-1.5">
                    <input className={inputCls} placeholder="Issuer" value={c.issuer} onChange={(ev) => updCert(i, { issuer: ev.target.value })} />
                    <input className={inputCls} placeholder="Year" value={c.year} onChange={(ev) => updCert(i, { year: ev.target.value })} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Education */}
          <div>
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
                  <input className={inputCls} placeholder="School (e.g. University of Lagos)" value={ed.school} onChange={(ev) => updEdu(i, { school: ev.target.value })} />
                  <div className="grid grid-cols-2 gap-1.5">
                    <input className={inputCls} placeholder="Degree (BSc Economics)" value={ed.degree} onChange={(ev) => updEdu(i, { degree: ev.target.value })} />
                    <input className={inputCls} placeholder="Year (2020)" value={ed.year} onChange={(ev) => updEdu(i, { year: ev.target.value })} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Metrics free text */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
              Extra metrics & wins (optional)
            </p>
            <textarea
              className={inputCls + " min-h-[60px] resize-none"}
              placeholder="e.g. Managed ₦50M budget, grew newsletter to 12,000 subs, cut onboarding time by 30%"
              value={value.metrics}
              onChange={(ev) => onChange({ ...value, metrics: ev.target.value })}
            />
          </div>
        </div>
      )}
    </div>
  );
}
