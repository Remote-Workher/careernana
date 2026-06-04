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
  return "ats";
}

// Harvard resume style — true Harvard OCS template:
//   serif typeface (Times-style), centered name + contact, full-width ruled
//   section headings in small caps, and a two-column entry block where the
//   institution/company is bold-left and location is right, with italic
//   role and italic dates on the second line.
export default function ResumePreview({ data, template, targetRole }: ResumePreviewProps) {
  const tpl = normalizeTemplate(template);
  const fontFamily = "'Calibri', 'Carlito', Arial, sans-serif";
  const nameSize = 24;
  const bodySize = 10.5;
  const lineHeight = 1.15;


  if (data.raw && !clean(data.summary)) {
    return (
      <div style={{ width: 794, margin: "0 auto", padding: "64px 72px", background: "#fff", color: "#000", fontFamily, fontSize: bodySize, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
        {data.raw}
      </div>
    );
  }

  const name = clean(data.name);
  const role = clean(data.jobTitle) || clean(targetRole);
  const contactParts = [clean(data.city), clean(data.phone), clean(data.email), clean(data.linkedin)].filter(Boolean);

  const SectionHeading = ({ children }: { children: string }) => (
    <h3 style={{
      fontFamily,
      fontSize: 12,
      fontWeight: 700,
      color: "#000",
      textTransform: "uppercase",
      letterSpacing: 1.2,
      margin: "14px 0 4px",
      paddingBottom: 1,
      borderBottom: "0.75px solid #000",
    }}>{children}</h3>
  );

  const Para = ({ children }: { children: React.ReactNode }) => (
    <p style={{ fontFamily, fontSize: bodySize, color: "#000", lineHeight, margin: "4px 0", textAlign: "justify" }}>{children}</p>
  );

  const Bullets = ({ items }: { items: string[] }) => (
    <ul style={{ margin: "2px 0 0", paddingLeft: 18, listStyle: "disc", color: "#000" }}>
      {items.map((b, i) => (
        <li key={i} style={{ fontFamily, fontSize: bodySize, lineHeight, marginBottom: 2 }}>{b}</li>
      ))}
    </ul>
  );

  // Harvard entry block:
  //   primary (bold) | rightTop (regular)
  //   secondary (italic) | rightBottom (italic)
  const EntryHeader = ({ primary, secondary, rightTop, rightBottom }: { primary: string; secondary?: string; rightTop?: string; rightBottom?: string }) => (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <span style={{ fontFamily, fontSize: bodySize, fontWeight: 700, color: "#000" }}>{primary}</span>
        {rightTop && <span style={{ fontFamily, fontSize: bodySize, color: "#000" }}>{rightTop}</span>}
      </div>
      {(secondary || rightBottom) && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
          <span style={{ fontFamily, fontSize: bodySize, fontStyle: "italic", color: "#000" }}>{secondary}</span>
          {rightBottom && <span style={{ fontFamily, fontSize: bodySize, fontStyle: "italic", color: "#000" }}>{rightBottom}</span>}
        </div>
      )}
    </div>
  );

  // ---------- Section renderers ----------
  const summaryLabel = tpl === "executive" ? "Executive Profile" : tpl === "student" ? "Career Objective" : "Summary";
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
    return (<><SectionHeading>Core Competencies</SectionHeading><Para>{items.join(" • ")}</Para></>);
  };

  const renderExperience = (label = "Experience") => {
    const items = (data.experience || [])
      .map((e) => ({ ...e, title: clean(e.title), company: clean(e.company), location: clean(e.location), startDate: clean(e.startDate), endDate: clean(e.endDate), bullets: (e.bullets || []).map(clean).filter(Boolean) }))
      .filter((e) => e.title || e.company || e.bullets.length);
    if (!items.length) return null;
    return (
      <>
        <SectionHeading>{label}</SectionHeading>
        {items.map((e, i) => (
          <div key={i} style={{ marginBottom: 8 }}>
            {/* Harvard pattern: COMPANY bold-left | Location right; Title italic-left | Dates italic-right */}
            <EntryHeader
              primary={e.company || e.title}
              secondary={e.company ? e.title : undefined}
              rightTop={e.location}
              rightBottom={[e.startDate, e.endDate].filter(Boolean).join(" – ")}
            />
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
        <SectionHeading>Projects</SectionHeading>
        {items.map((p, i) => (
          <div key={i} style={{ marginBottom: 8 }}>
            <EntryHeader primary={p.name} rightTop={p.date} />
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
            <EntryHeader primary={p.organization || p.role} secondary={p.organization ? p.role : undefined} rightBottom={p.date} />
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
          const degreeLine = [e.degree, e.field].filter(Boolean).join(" in ");
          const secondary = [degreeLine, e.honours].filter(Boolean).join(" — ");
          return (
            <div key={i} style={{ marginBottom: 6 }}>
              <EntryHeader primary={e.school || degreeLine} secondary={e.school ? secondary : undefined} rightBottom={e.year} />
            </div>
          );
        })}
      </>
    );
  };

  const renderSkills = (heading = "Skills & Interests") => {
    const tech = (data.technicalSkills || []).map(clean).filter(Boolean);
    const soft = (data.softSkills || []).map(clean).filter(Boolean);
    if (!tech.length && !soft.length) return null;
    return (
      <>
        <SectionHeading>{heading}</SectionHeading>
        {tech.length > 0 && (
          <p style={{ fontFamily, fontSize: bodySize, color: "#000", lineHeight, margin: "4px 0" }}>
            <span style={{ fontWeight: 700 }}>Technical: </span>{tech.join(", ")}
          </p>
        )}
        {soft.length > 0 && (
          <p style={{ fontFamily, fontSize: bodySize, color: "#000", lineHeight, margin: "4px 0" }}>
            <span style={{ fontWeight: 700 }}>Other: </span>{soft.join(", ")}
          </p>
        )}
      </>
    );
  };

  const renderTools = () => {
    const items = (data.tools || []).map(clean).filter(Boolean);
    if (!items.length) return null;
    return (<><SectionHeading>Tools & Technologies</SectionHeading><Para>{items.join(" • ")}</Para></>);
  };

  const renderCertifications = () => {
    const items = (data.certifications || []).map((c) => ({ name: clean(c.name), issuer: clean(c.issuer), year: clean(c.year) })).filter((c) => c.name || c.issuer);
    if (!items.length) return null;
    return (
      <>
        <SectionHeading>Certifications</SectionHeading>
        <ul style={{ margin: "2px 0 0", paddingLeft: 18, listStyle: "disc", color: "#000" }}>
          {items.map((c, i) => (
            <li key={i} style={{ fontFamily, fontSize: bodySize, lineHeight, marginBottom: 2 }}>
              {c.name}{c.issuer ? `, ${c.issuer}` : ""}{c.year ? ` (${c.year})` : ""}
            </li>
          ))}
        </ul>
      </>
    );
  };

  const renderAwards = () => {
    const items = (data.awards || []).map(clean).filter(Boolean);
    if (!items.length) return null;
    return (<><SectionHeading>Honors & Awards</SectionHeading><Bullets items={items} /></>);
  };

  const renderBoardExperience = () => {
    const items = (data.boardExperience || []).map((b) => ({ role: clean(b.role), organization: clean(b.organization), date: clean(b.date) })).filter((b) => b.role || b.organization);
    if (!items.length) return null;
    return (
      <>
        <SectionHeading>Board Experience</SectionHeading>
        {items.map((b, i) => (
          <div key={i} style={{ marginBottom: 4 }}>
            <EntryHeader primary={b.organization || b.role} secondary={b.organization ? b.role : undefined} rightBottom={b.date} />
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
      renderSkills("Skills & Interests"),
      renderCertifications(),
      renderAwards(),
    ],
    ats: [
      renderSummary(),
      renderExperience("Experience"),
      renderEducation(),
      renderSkills("Skills & Interests"),
      renderCertifications(),
    ],
    professional: [
      renderSummary(),
      renderCoreCompetencies(),
      renderExperience("Experience"),
      renderEducation(),
      renderCertifications(),
      renderTools(),
    ],
    executive: [
      renderSummary(),
      renderKeyAchievements(),
      renderExperience("Experience"),
      renderBoardExperience(),
      renderEducation(),
      renderCertifications(),
      renderSkills("Skills & Interests"),
    ],
  };

  return (
    <div style={{ width: 794, minHeight: 1123, margin: "0 auto", padding: "64px 72px", background: "#fff", color: "#000", fontFamily, fontSize: bodySize, lineHeight }}>
      {/* HEADER — centered name + centered contact line, Harvard style */}
      <div style={{ textAlign: "center", marginBottom: 4 }}>
        {name ? (
          <p style={{ fontFamily, fontSize: nameSize, fontWeight: 700, color: "#000", letterSpacing: 0.4, margin: 0 }}>{name}</p>
        ) : (
          <p style={{ fontFamily, fontSize: 12, color: "#666", margin: 0, fontStyle: "italic" }}>
            (Add your full name in your profile so it appears here.)
          </p>
        )}
        {role && (
          <p style={{ fontFamily, fontSize: 12, fontStyle: "italic", color: "#000", margin: "2px 0 0" }}>{role}</p>
        )}
        {contactParts.length > 0 && (
          <p style={{ fontFamily, fontSize: bodySize - 0.5, color: "#000", margin: "4px 0 0", lineHeight: 1.2 }}>
            {contactParts.join("  •  ")}
          </p>
        )}
      </div>

      {sections[tpl].map((node, i) => node ? <React.Fragment key={i}>{node}</React.Fragment> : null)}
    </div>
  );
}
