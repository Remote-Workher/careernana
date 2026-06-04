import React from "react";

export interface ResumeData {
  name?: string;
  email?: string;
  city?: string;
  phone?: string;
  linkedin?: string;
  jobTitle?: string;
  summary: string;
  achievements: string[];
  experience: { title: string; company: string; location: string; startDate: string; endDate: string; bullets: string[] }[];
  certifications: { name: string; issuer: string; year: string }[];
  education?: { degree?: string; school?: string; year?: string; field?: string; honours?: string }[];
  technicalSkills: string[];
  softSkills: string[];
  // Template-specific
  projects?: { name: string; date?: string; bullets: string[] }[];
  leadership?: { role: string; organization: string; date?: string; bullets: string[] }[];
  volunteer?: { role: string; organization: string; date?: string; bullets: string[] }[];
  awards?: string[];
  keyAchievements?: string[];
  coreCompetencies?: string[];
  tools?: string[];
  boardExperience?: { role: string; organization: string; date?: string }[];
  executiveProfile?: string;
  atsScore?: number;
  raw?: string;
}

type TemplateId = "student" | "ats" | "professional" | "executive";

interface ResumePreviewProps {
  data: ResumeData;
  template: string;
  targetRole: string;
  accentColor?: string;
  onEditSection?: (key: "experience" | "education" | "certifications" | "skills") => void;
}

const PLACEHOLDER_RE = /^\s*\(?\s*(not\s+provided|n\/?a|none|tbd|candidate|your\s+name|to\s+be\s+(added|determined)|unknown|—|-|\[.*\])\s*\)?\s*$/i;
const clean = (v?: string | null): string => {
  if (!v) return "";
  const t = String(v).trim();
  if (!t || PLACEHOLDER_RE.test(t)) return "";
  return t;
};

function normalizeTemplate(t: string): TemplateId {
  const v = (t || "").toLowerCase();
  if (v === "student" || v === "student/graduate" || v === "graduate") return "student";
  if (v === "professional") return "professional";
  if (v === "executive" || v === "senior" || v === "leader") return "executive";
  // Legacy values (Classic/Modern/Minimal) all map to ats default
  return "ats";
}

export default function ResumePreview({ data, template, targetRole }: ResumePreviewProps) {
  const tpl = normalizeTemplate(template);
  const isExec = tpl === "executive";
  const fontFamily = "'Open Sans', Arial, sans-serif";
  const nameSize = isExec ? 36 : 34;
  const bodySize = isExec ? 14.5 : 14;
  const lineHeight = 1.25;


  if (data.raw && !clean(data.summary)) {
    return (
      <div style={{ width: 794, margin: "0 auto", padding: "72px", background: "#fff", color: "#000", fontFamily, fontSize: bodySize, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
        {data.raw}
      </div>
    );
  }

  const name = clean(data.name);
  const role = clean(data.jobTitle) || clean(targetRole);
  const contact = [clean(data.city), clean(data.phone), clean(data.email), clean(data.linkedin)].filter(Boolean).join(" | ");

  const SectionHeading = ({ children }: { children: string }) => (
    <h3 style={{
      fontFamily,
      fontSize: 13,
      fontWeight: 700,
      color: "#000",
      textTransform: "uppercase",
      letterSpacing: 0.4,
      margin: "16px 0 5px",
      paddingBottom: 2,
      borderBottom: "1px solid #000",
    }}>{children}</h3>
  );


  const Para = ({ children }: { children: React.ReactNode }) => (
    <p style={{ fontFamily, fontSize: bodySize, color: "#000", lineHeight, margin: "4px 0" }}>{children}</p>
  );

  const Bullets = ({ items }: { items: string[] }) => (
    <ul style={{ margin: "4px 0 0", paddingLeft: 18, listStyle: "disc", color: "#000" }}>
      {items.map((b, i) => (
        <li key={i} style={{ fontFamily, fontSize: bodySize, lineHeight, marginBottom: 2 }}>{b}</li>
      ))}
    </ul>
  );

  const RoleHeader = ({ title, sub, dates, loc }: { title: string; sub?: string; dates?: string; loc?: string }) => (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <span style={{ fontFamily, fontSize: bodySize + 0.5, fontWeight: 700, color: "#000" }}>{title}</span>
        {dates && <span style={{ fontFamily, fontSize: bodySize, color: "#000" }}>{dates}</span>}
      </div>
      {(sub || loc) && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
          <span style={{ fontFamily, fontSize: bodySize, fontStyle: "italic", color: "#000" }}>{sub}</span>
          {loc && <span style={{ fontFamily, fontSize: bodySize, fontStyle: "italic", color: "#000" }}>{loc}</span>}
        </div>
      )}
    </div>
  );

  // ---------- Section renderers ----------
  const summaryLabel = tpl === "executive" ? "Executive Profile" : tpl === "student" ? "Career Objective" : "Professional Summary";
  const renderSummary = () => {
    const text = clean(tpl === "executive" ? (data.executiveProfile || data.summary) : data.summary);
    if (!text) return null;
    return (<><SectionHeading>{summaryLabel}</SectionHeading><Para>{text}</Para></>);
  };

  const renderKeyAchievements = () => {
    const items = (data.keyAchievements && data.keyAchievements.length ? data.keyAchievements : data.achievements || []).map(clean).filter(Boolean);
    if (!items.length) return null;
    return (<><SectionHeading>Key Achievements</SectionHeading><Bullets items={items} /></>);
  };

  const renderCoreCompetencies = () => {
    const items = (data.coreCompetencies || data.technicalSkills || []).map(clean).filter(Boolean);
    if (!items.length) return null;
    return (<><SectionHeading>Core Competencies</SectionHeading><Para>{items.join(" | ")}</Para></>);
  };

  const renderExperience = (label = "Work Experience") => {
    const items = (data.experience || [])
      .map((e) => ({ ...e, title: clean(e.title), company: clean(e.company), location: clean(e.location), startDate: clean(e.startDate), endDate: clean(e.endDate), bullets: (e.bullets || []).map(clean).filter(Boolean) }))
      .filter((e) => e.title || e.company || e.bullets.length);
    if (!items.length) return null;
    return (
      <>
        <SectionHeading>{label}</SectionHeading>
        {items.map((e, i) => (
          <div key={i} style={{ marginBottom: 8 }}>
            <RoleHeader title={e.title} sub={e.company} dates={[e.startDate, e.endDate].filter(Boolean).join(" – ")} loc={e.location} />
            {e.bullets.length > 0 && <Bullets items={e.bullets} />}
          </div>
        ))}
      </>
    );
  };

  const renderProjects = () => {
    const items = (data.projects || []).map((p) => ({ name: clean(p.name), date: clean(p.date), bullets: (p.bullets || []).map(clean).filter(Boolean) })).filter((p) => p.name || p.bullets.length);
    if (!items.length) return null;
    return (
      <>
        <SectionHeading>Academic Projects</SectionHeading>
        {items.map((p, i) => (
          <div key={i} style={{ marginBottom: 8 }}>
            <RoleHeader title={p.name} dates={p.date} />
            {p.bullets.length > 0 && <Bullets items={p.bullets} />}
          </div>
        ))}
      </>
    );
  };

  const renderRoleList = (heading: string, list?: { role: string; organization: string; date?: string; bullets: string[] }[]) => {
    const items = (list || []).map((p) => ({ role: clean(p.role), organization: clean(p.organization), date: clean(p.date), bullets: (p.bullets || []).map(clean).filter(Boolean) })).filter((p) => p.role || p.organization || p.bullets.length);
    if (!items.length) return null;
    return (
      <>
        <SectionHeading>{heading}</SectionHeading>
        {items.map((p, i) => (
          <div key={i} style={{ marginBottom: 8 }}>
            <RoleHeader title={p.role} sub={p.organization} dates={p.date} />
            {p.bullets.length > 0 && <Bullets items={p.bullets} />}
          </div>
        ))}
      </>
    );
  };

  const renderEducation = () => {
    const items = (data.education || []).map((e) => ({ degree: clean(e.degree), school: clean(e.school), year: clean(e.year), field: clean(e.field), honours: clean(e.honours) })).filter((e) => e.degree || e.school || e.field || e.year);
    if (!items.length) return null;
    return (
      <>
        <SectionHeading>Education</SectionHeading>
        {items.map((e, i) => {
          const title = [e.degree, e.field].filter(Boolean).join(" in ");
          return (
            <div key={i} style={{ marginBottom: 6 }}>
              <RoleHeader title={title} sub={[e.school, e.honours].filter(Boolean).join(" — ")} dates={e.year} />
            </div>
          );
        })}
      </>
    );
  };

  const renderSkills = (heading = "Skills") => {
    const tech = (data.technicalSkills || []).map(clean).filter(Boolean);
    const soft = (data.softSkills || []).map(clean).filter(Boolean);
    const all = [...tech, ...soft];
    if (!all.length) return null;
    return (<><SectionHeading>{heading}</SectionHeading><Para>{all.join(" | ")}</Para></>);
  };

  const renderTools = () => {
    const items = (data.tools || []).map(clean).filter(Boolean);
    if (!items.length) return null;
    return (<><SectionHeading>Tools & Technologies</SectionHeading><Para>{items.join(" | ")}</Para></>);
  };

  const renderCertifications = () => {
    const items = (data.certifications || []).map((c) => ({ name: clean(c.name), issuer: clean(c.issuer), year: clean(c.year) })).filter((c) => c.name || c.issuer);
    if (!items.length) return null;
    return (
      <>
        <SectionHeading>Certifications</SectionHeading>
        <ul style={{ margin: "4px 0 0", paddingLeft: 18, listStyle: "disc", color: "#000" }}>
          {items.map((c, i) => (
            <li key={i} style={{ fontFamily, fontSize: bodySize, lineHeight, marginBottom: 2 }}>
              {c.name}{c.issuer ? ` — ${c.issuer}` : ""}{c.year ? ` (${c.year})` : ""}
            </li>
          ))}
        </ul>
      </>
    );
  };

  const renderAwards = () => {
    const items = (data.awards || []).map(clean).filter(Boolean);
    if (!items.length) return null;
    return (<><SectionHeading>Awards</SectionHeading><Bullets items={items} /></>);
  };

  const renderBoardExperience = () => {
    const items = (data.boardExperience || []).map((b) => ({ role: clean(b.role), organization: clean(b.organization), date: clean(b.date) })).filter((b) => b.role || b.organization);
    if (!items.length) return null;
    return (
      <>
        <SectionHeading>Board Experience</SectionHeading>
        {items.map((b, i) => (
          <div key={i} style={{ marginBottom: 4 }}>
            <RoleHeader title={b.role} sub={b.organization} dates={b.date} />
          </div>
        ))}
      </>
    );
  };

  // ---------- Template section orders ----------
  const sections: Record<TemplateId, React.ReactNode[]> = {
    student: [
      renderSummary(),
      renderEducation(),
      renderProjects(),
      renderRoleList("Leadership Experience", data.leadership),
      renderRoleList("Volunteer Experience", data.volunteer),
      renderSkills("Skills"),
      renderCertifications(),
      renderAwards(),
    ],
    ats: [
      renderSummary(),
      renderExperience("Work Experience"),
      renderEducation(),
      renderSkills("Skills"),
      renderCertifications(),
    ],
    professional: [
      renderSummary(),
      renderCoreCompetencies(),
      renderExperience("Professional Experience"),
      renderEducation(),
      renderCertifications(),
      renderTools(),
    ],
    executive: [
      renderSummary(),
      renderKeyAchievements(),
      renderExperience("Professional Experience"),
      renderBoardExperience(),
      renderEducation(),
      renderCertifications(),
      renderSkills("Technical Skills"),
    ],
  };

  return (
    <div style={{ width: 794, minHeight: 1123, margin: "0 auto", padding: "72px", background: "#fff", color: "#000", fontFamily, fontSize: bodySize, lineHeight }}>
      {/* HEADER */}
      <div style={{ marginBottom: 10, textAlign: "center" }}>
        {name ? (
          <p style={{ fontFamily, fontSize: nameSize, fontWeight: 700, color: "#000", letterSpacing: 0.4, margin: 0, textTransform: "uppercase" }}>{name}</p>
        ) : (
          <p style={{ fontFamily, fontSize: 13, color: "#666", margin: 0, fontStyle: "italic" }}>
            (Add your full name in your profile so it appears here.)
          </p>
        )}
        {role && (
          <p style={{ fontFamily, fontSize: isExec ? 15 : 14, fontWeight: 600, color: "#000", margin: "3px 0 0" }}>{role}</p>
        )}
        {contact && (
          <p style={{ fontFamily, fontSize: bodySize, color: "#000", margin: "5px 0 0", lineHeight: 1.3 }}>{contact}</p>
        )}
      </div>


      {sections[tpl].map((node, i) => node ? <React.Fragment key={i}>{node}</React.Fragment> : null)}
    </div>
  );
}
