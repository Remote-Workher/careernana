import React from "react";
import { Pencil } from "lucide-react";

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
  atsScore?: number;
  raw?: string;
}

type SectionKey = "experience" | "education" | "certifications" | "skills";

interface ResumePreviewProps {
  data: ResumeData;
  template: string;
  targetRole: string;
  accentColor?: string;
  onEditSection?: (key: SectionKey) => void;
}

function SectionLabel({
  children,
  template,
  accent,
  onEdit,
}: {
  children: string;
  template: string;
  accent: string;
  onEdit?: () => void;
}) {
  const pencil = onEdit ? (
    <button
      type="button"
      onClick={onEdit}
      data-no-print="true"
      className="ml-2 p-0.5 rounded text-muted-foreground hover:text-primary print:hidden"
      title="Edit this section"
      aria-label="Edit this section"
    >
      <Pencil className="w-3 h-3" />
    </button>
  ) : null;
  if (template === "Modern") {
    return (
      <div className="flex items-center gap-0 mb-3 mt-6">
        <div style={{ width: 3, height: 20, background: accent, borderRadius: 2, marginRight: 12 }} />
        <h3 style={{ fontSize: 13, fontWeight: 800, color: "#0F1724" }}>{children}</h3>
        {pencil}
      </div>
    );
  }
  if (template === "Minimal") {
    return (
      <div className="flex items-center gap-0 mb-3 mt-6">
        <div style={{ width: 3, height: 20, background: accent, borderRadius: 2, marginRight: 10 }} />
        <h3 style={{ fontSize: 12, fontWeight: 800, color: "#0F1724" }}>{children}</h3>
        {pencil}
      </div>
    );
  }
  // Classic
  return (
    <div className="mt-6 mb-3 flex items-end justify-between">
      <h3 style={{ fontSize: 11, fontWeight: 700, color: accent, textTransform: "uppercase", letterSpacing: "2px", paddingBottom: 6, borderBottom: "1px solid #EBE6E2", flex: 1 }}>
        {children}
      </h3>
      {pencil}
    </div>
  );
}

function EmptyCard({ section, onEdit }: { section: string; onEdit?: () => void }) {
  return (
    <div
      onClick={onEdit}
      style={{
        background: "rgba(224, 72, 122, 0.06)",
        border: "1px dashed rgba(224, 72, 122, 0.4)",
        borderRadius: 10,
        padding: "12px 14px",
        cursor: onEdit ? "pointer" : "default",
        fontSize: 12,
        color: "#7a3552",
      }}
    >
      You didn't add {section} — click Edit to add it
    </div>
  );
}

// Strip AI placeholder strings (e.g. "Not provided", "N/A", "TBD") from any rendered field.
const PLACEHOLDER_RE = /^\s*\(?\s*(not\s+provided|n\/?a|none|tbd|to\s+be\s+(added|determined)|unknown|—|-)\s*\)?\s*$/i;
const clean = (v?: string | null): string => {
  if (!v) return "";
  const t = String(v).trim();
  if (!t) return "";
  if (PLACEHOLDER_RE.test(t)) return "";
  return t;
};

export default function ResumePreview({ data, template, targetRole, accentColor, onEditSection }: ResumePreviewProps) {
  const accent = accentColor || "#E0487A";
  // Lighten accent for tinted backgrounds (skill chips). 18% mix with white.
  const accentTint = `${accent}1F`; // ~12% alpha hex suffix
  const accentBorder = `${accent}55`;
  if (data.raw && !clean(data.summary)) {
    return <div style={{ fontSize: 12.5, color: "#3D4A5C", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{data.raw}</div>;
  }

  const name = clean(data.name) || "Your Name";
  const jobTitle = clean(data.jobTitle) || clean(targetRole) || "Professional";
  const contact = [clean(data.city), clean(data.email), clean(data.linkedin), clean(data.phone)].filter(Boolean).join(" · ");

  const bodyStyle: React.CSSProperties = { fontSize: 12.5, color: "#3D4A5C", lineHeight: 1.8 };
  const bulletColor = template === "Minimal" ? "#8896A8" : accent;
  const bulletGlyph = template === "Modern" ? "▪" : template === "Minimal" ? "—" : "•";

  const Bullet = ({ text }: { text: string }) => {
    const fs = template === "Modern" ? 13 : 12.5;
    const lh = template === "Modern" ? 1.75 : 1.8;
    return (
      <li className="flex items-baseline" style={{ ...bodyStyle, fontSize: fs, lineHeight: lh, gap: 8 }}>
        <span
          aria-hidden
          style={{
            color: bulletColor,
            fontSize: fs,
            lineHeight: lh,
            flexShrink: 0,
            display: "inline-block",
            width: 10,
            textAlign: "center",
          }}
        >
          {bulletGlyph}
        </span>
        <span style={{ flex: 1 }}>{text}</span>
      </li>
    );
  };

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: template === "Modern" ? 0 : "36px 40px", fontFamily: "'DM Sans', sans-serif" }}>
      {/* HEADER */}
      {template === "Modern" ? (
        <div style={{
          background: `linear-gradient(135deg, ${accent}, ${accent})`,
          padding: "48px 40px",
          margin: "-24px -24px 0 -24px",
          borderRadius: "10px 10px 0 0",
        }}>
          <p style={{ fontSize: 26, fontWeight: 900, color: "#fff", letterSpacing: -0.5 }}>{name}</p>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.8)", marginTop: 4 }}>{jobTitle}</p>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", marginTop: 6 }}>{contact}</p>
        </div>
      ) : template === "Minimal" ? (
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 28, fontWeight: 900, color: "#0F1724" }}>{name}</p>
          <div style={{ width: 40, height: 3, background: accent, borderRadius: 2, marginTop: 8, marginBottom: 4 }} />
          <p style={{ fontSize: 14, color: accent, marginTop: 4 }}>{jobTitle}</p>
          <p style={{ fontSize: 12, color: "#8896A8", marginTop: 6 }}>{contact}</p>
          <div style={{ height: 1, background: "#EBE6E2", marginTop: 16 }} />
        </div>
      ) : (
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <p style={{ fontSize: 26, fontWeight: 700, color: "#0F1724", textTransform: "uppercase" as const, fontFamily: "Georgia, serif", letterSpacing: 1 }}>{name}</p>
          <p style={{ fontSize: 14, color: accent, marginTop: 6 }}>{jobTitle}</p>
          <p style={{ fontSize: 12, color: "#8896A8", marginTop: 6 }}>{contact}</p>
          <div style={{ height: 2, background: accent, marginTop: 14 }} />
        </div>
      )}

      <div style={{ padding: template === "Modern" ? "24px 40px 36px" : 0 }}>
        {/* PROFESSIONAL SUMMARY */}
        {data.summary && (
          <>
            <SectionLabel template={template} accent={accent}>Professional Summary</SectionLabel>
            <p style={bodyStyle}>{data.summary}</p>
          </>
        )}

        {/* KEY ACHIEVEMENTS */}
        {data.achievements?.length > 0 && (
          <>
            <SectionLabel template={template} accent={accent}>Key Achievements</SectionLabel>
            <ul className="space-y-1.5">{data.achievements.map((a, i) => <Bullet key={i} text={a} />)}</ul>
          </>
        )}

        {/* WORK EXPERIENCE */}
        <SectionLabel template={template} accent={accent} onEdit={onEditSection ? () => onEditSection("experience") : undefined}>Work Experience</SectionLabel>
        {data.experience?.length > 0 ? (
          <div className="space-y-5">
            {data.experience.map((exp, i) => (
              <div key={i}>
                <div className="flex items-start justify-between">
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "#0F1724" }}>{exp.title}</p>
                    <p style={{ fontSize: 12, color: template === "Minimal" ? "#0F1724" : accent, fontWeight: template === "Minimal" ? 700 : 400 }}>
                      {exp.company}{exp.location ? <span style={{ color: "#8896A8" }}> · {exp.location}</span> : ""}
                    </p>
                  </div>
                  <p style={{ fontSize: 11, color: "#8896A8", flexShrink: 0, fontStyle: template === "Minimal" ? "italic" : "normal" }}>
                    {exp.startDate} – {exp.endDate}
                  </p>
                </div>
                <ul className="mt-2 space-y-1">{exp.bullets?.map((b, j) => <Bullet key={j} text={b} />)}</ul>
              </div>
            ))}
          </div>
        ) : (
          <EmptyCard section="work experience" onEdit={onEditSection ? () => onEditSection("experience") : undefined} />
        )}

        {/* EDUCATION */}
        <SectionLabel template={template} accent={accent} onEdit={onEditSection ? () => onEditSection("education") : undefined}>Education</SectionLabel>
        {data.education && data.education.length > 0 ? (
          <div className="space-y-2">
            {data.education.map((ed, i) => (
              <div key={i} className="flex items-start justify-between">
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#0F1724" }}>
                    {ed.degree || ""}{ed.field ? ` · ${ed.field}` : ""}
                  </p>
                  <p style={{ fontSize: 11, color: "#8896A8" }}>{ed.school}{ed.honours ? ` · ${ed.honours}` : ""}</p>
                </div>
                <p style={{ fontSize: 11, color: "#8896A8", flexShrink: 0 }}>{ed.year}</p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyCard section="education" onEdit={onEditSection ? () => onEditSection("education") : undefined} />
        )}

        {/* CERTIFICATIONS */}
        {data.certifications?.length > 0 && (
          <>
            <SectionLabel template={template} accent={accent} onEdit={onEditSection ? () => onEditSection("certifications") : undefined}>Certifications</SectionLabel>
            <div>
              {data.certifications.map((c, i) => (
                <div key={i} className="flex items-start justify-between py-2" style={{
                  borderBottom: template === "Modern" ? "none" : i < data.certifications.length - 1 ? "1px dashed #EBE6E2" : "none",
                }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "#0F1724" }}>{c.name}</p>
                    <p style={{ fontSize: 11, color: "#8896A8" }}>{c.issuer}</p>
                  </div>
                  <p style={{ fontSize: 11, color: "#8896A8", flexShrink: 0 }}>{c.year}</p>
                </div>
              ))}
            </div>
          </>
        )}

        {/* CORE SKILLS */}
        {(data.technicalSkills?.length > 0 || data.softSkills?.length > 0) && (
          <>
            <SectionLabel template={template} accent={accent} onEdit={onEditSection ? () => onEditSection("skills") : undefined}>Core Skills</SectionLabel>
            <div className="flex flex-wrap gap-1.5">
              {data.technicalSkills?.map((s) => (
                <span key={s} style={{
                  padding: "4px 10px",
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 500,
                  ...(template === "Minimal"
                    ? { background: "#fff", border: "1px solid #EBE6E2", color: "#0F1724" }
                    : { background: accentTint, border: `1px solid ${accentBorder}`, color: accent }),
                }}>{s}</span>
              ))}
              {data.softSkills?.map((s) => (
                <span key={s} style={{
                  padding: "4px 10px",
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 500,
                  background: template === "Minimal" ? "#fff" : "#F5F7FA",
                  border: `1px solid ${template === "Minimal" ? "#EBE6E2" : "#EBE6E2"}`,
                  color: "#0F1724",
                }}>{s}</span>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
