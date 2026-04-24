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
  technicalSkills: string[];
  softSkills: string[];
  atsScore?: number;
  raw?: string;
}

interface ResumePreviewProps {
  data: ResumeData;
  template: string;
  targetRole: string;
}

function SectionLabel({ children, template }: { children: string; template: string }) {
  if (template === "Modern") {
    return (
      <div className="flex items-center gap-0 mb-3 mt-6">
        <div style={{ width: 3, height: 20, background: "#E0487A", borderRadius: 2, marginRight: 12 }} />
        <h3 style={{ fontSize: 13, fontWeight: 800, color: "#0F1724" }}>{children}</h3>
      </div>
    );
  }
  if (template === "Minimal") {
    return (
      <div className="flex items-center gap-0 mb-3 mt-6">
        <div style={{ width: 3, height: 20, background: "#E0487A", borderRadius: 2, marginRight: 10 }} />
        <h3 style={{ fontSize: 12, fontWeight: 800, color: "#0F1724" }}>{children}</h3>
      </div>
    );
  }
  // Classic
  return (
    <div className="mt-6 mb-3">
      <h3 style={{ fontSize: 11, fontWeight: 700, color: "#E0487A", textTransform: "uppercase", letterSpacing: "2px", paddingBottom: 6, borderBottom: "1px solid #EBE6E2" }}>
        {children}
      </h3>
    </div>
  );
}

export default function ResumePreview({ data, template, targetRole }: ResumePreviewProps) {
  if (data.raw && !data.summary) {
    return <div style={{ fontSize: 12.5, color: "#3D4A5C", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{data.raw}</div>;
  }

  const name = data.name || "Your Name";
  const jobTitle = data.jobTitle || targetRole || "Professional";
  const contact = [data.city, data.email, data.linkedin, data.phone].filter(Boolean).join(" · ");

  const bodyStyle: React.CSSProperties = { fontSize: 12.5, color: "#3D4A5C", lineHeight: 1.8 };
  const bulletColor = template === "Minimal" ? undefined : "#E0487A";
  const bulletShape = template === "Modern" ? "square" : template === "Minimal" ? "dash" : "circle";

  const Bullet = ({ text }: { text: string }) => (
    <li className="flex items-start gap-2" style={{ ...bodyStyle, fontSize: template === "Modern" ? 13 : 12.5, lineHeight: template === "Modern" ? 1.75 : 1.8 }}>
      {bulletShape === "dash" ? (
        <span style={{ color: "#8896A8", marginTop: 1, flexShrink: 0 }}>—</span>
      ) : (
        <span style={{
          width: bulletShape === "square" ? 5 : 6,
          height: bulletShape === "square" ? 5 : 6,
          borderRadius: bulletShape === "square" ? 1 : "50%",
          background: bulletColor,
          marginTop: 7,
          flexShrink: 0,
        }} />
      )}
      {text}
    </li>
  );

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: template === "Modern" ? 0 : "36px 40px", fontFamily: "'DM Sans', sans-serif" }}>
      {/* HEADER */}
      {template === "Modern" ? (
        <div style={{
          background: "linear-gradient(135deg, #c73868, #E0487A)",
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
          <div style={{ width: 40, height: 3, background: "#E0487A", borderRadius: 2, marginTop: 8, marginBottom: 4 }} />
          <p style={{ fontSize: 14, color: "#E0487A", marginTop: 4 }}>{jobTitle}</p>
          <p style={{ fontSize: 12, color: "#8896A8", marginTop: 6 }}>{contact}</p>
          <div style={{ height: 1, background: "#EBE6E2", marginTop: 16 }} />
        </div>
      ) : (
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <p style={{ fontSize: 26, fontWeight: 700, color: "#0F1724", textTransform: "uppercase" as const, fontFamily: "Georgia, serif", letterSpacing: 1 }}>{name}</p>
          <p style={{ fontSize: 14, color: "#E0487A", marginTop: 6 }}>{jobTitle}</p>
          <p style={{ fontSize: 12, color: "#8896A8", marginTop: 6 }}>{contact}</p>
          <div style={{ height: 2, background: "#E0487A", marginTop: 14 }} />
        </div>
      )}

      <div style={{ padding: template === "Modern" ? "24px 40px 36px" : 0 }}>
        {/* PROFESSIONAL SUMMARY */}
        {data.summary && (
          <>
            <SectionLabel template={template}>Professional Summary</SectionLabel>
            <p style={bodyStyle}>{data.summary}</p>
          </>
        )}

        {/* KEY ACHIEVEMENTS */}
        {data.achievements?.length > 0 && (
          <>
            <SectionLabel template={template}>Key Achievements</SectionLabel>
            <ul className="space-y-1.5">{data.achievements.map((a, i) => <Bullet key={i} text={a} />)}</ul>
          </>
        )}

        {/* WORK EXPERIENCE */}
        {data.experience?.length > 0 && (
          <>
            <SectionLabel template={template}>Work Experience</SectionLabel>
            <div className="space-y-5">
              {data.experience.map((exp, i) => (
                <div key={i}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "#0F1724" }}>{exp.title}</p>
                      <p style={{ fontSize: 12, color: template === "Minimal" ? "#0F1724" : "#E0487A", fontWeight: template === "Minimal" ? 700 : 400 }}>
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
          </>
        )}

        {/* CERTIFICATIONS */}
        {data.certifications?.length > 0 && (
          <>
            <SectionLabel template={template}>Certifications</SectionLabel>
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
            <SectionLabel template={template}>Core Skills</SectionLabel>
            <div className="flex flex-wrap gap-1.5">
              {data.technicalSkills?.map((s) => (
                <span key={s} style={{
                  padding: "4px 10px",
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 500,
                  ...(template === "Minimal"
                    ? { background: "#fff", border: "1px solid #EBE6E2", color: "#0F1724" }
                    : { background: "#FDF1F5", border: "1px solid #F7CDD9", color: "#E0487A" }),
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
