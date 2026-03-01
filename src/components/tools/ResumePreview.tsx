interface ResumeData {
  summary: string;
  achievements: string[];
  experience: { title: string; company: string; location: string; startDate: string; endDate: string; bullets: string[] }[];
  certifications: { name: string; issuer: string; year: string }[];
  technicalSkills: string[];
  softSkills: string[];
  atsScore: number;
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
      <div className="flex items-center gap-2 mb-3 mt-6">
        <div className="w-[3px] h-5 rounded-full" style={{ background: "linear-gradient(135deg, #1565C0, #0288D1)" }} />
        <h3 className="text-[12px] font-bold text-foreground uppercase tracking-wider">{children}</h3>
      </div>
    );
  }
  if (template === "Minimal") {
    return (
      <div className="flex items-center gap-2.5 mb-3 mt-6">
        <div className="w-[3px] h-5 rounded-sm bg-[#1565C0]" />
        <h3 className="text-[12px] font-bold text-foreground pl-1">{children}</h3>
      </div>
    );
  }
  // Classic
  return (
    <div className="mt-6 mb-3">
      <h3 className="text-[11px] font-bold text-[#1565C0] uppercase tracking-[0.12em] pb-1.5 border-b border-[#BFDBFE]">{children}</h3>
    </div>
  );
}

export default function ResumePreview({ data, template, targetRole }: ResumePreviewProps) {
  if (data.raw && !data.summary) {
    return <div className="text-[12.5px] text-foreground leading-[1.8] whitespace-pre-wrap">{data.raw}</div>;
  }

  return (
    <div className="max-w-[700px] mx-auto">
      {/* Header */}
      {template === "Modern" ? (
        <div className="rounded-[10px] px-6 py-5 -mx-2 mb-2 text-white" style={{ background: "linear-gradient(135deg, #1565C0, #0288D1)" }}>
          <p className="text-[26px] font-bold">Amara Okafor</p>
          <p className="text-[14px] opacity-90 mt-0.5">{targetRole || "Product Designer"}</p>
          <p className="text-[11px] opacity-75 mt-1">Lagos, Nigeria · amara@email.com · linkedin.com/in/amara · +234 800 000 0000</p>
        </div>
      ) : template === "Minimal" ? (
        <div className="mb-4">
          <p className="text-[28px] font-bold text-foreground">Amara Okafor</p>
          <div className="w-[40px] h-[3px] rounded-full bg-[#1565C0] mt-2 mb-2" />
          <p className="text-[11px] text-muted-foreground">Lagos, Nigeria · amara@email.com · linkedin.com/in/amara · +234 800 000 0000</p>
        </div>
      ) : (
        <div className="text-center mb-4">
          <p className="text-[26px] font-bold text-foreground tracking-wide" style={{ fontFamily: "Georgia, serif" }}>AMARA OKAFOR</p>
          <p className="text-[14px] text-[#1565C0] mt-1">{targetRole || "Product Designer"}</p>
          <p className="text-[11px] text-muted-foreground mt-1">Lagos, Nigeria · amara@email.com · linkedin.com/in/amara · +234 800 000 0000</p>
          <div className="h-[2px] mt-3" style={{ background: "linear-gradient(135deg, #1565C0, #0288D1)" }} />
        </div>
      )}

      {/* Summary */}
      {data.summary && (
        <>
          <SectionLabel template={template}>Professional Summary</SectionLabel>
          <p className="text-[12.5px] text-foreground leading-[1.8]">{data.summary}</p>
        </>
      )}

      {/* Achievements */}
      {data.achievements?.length > 0 && (
        <>
          <SectionLabel template={template}>Key Achievements</SectionLabel>
          <ul className="space-y-1.5">
            {data.achievements.map((a, i) => (
              <li key={i} className="flex items-start gap-2 text-[12.5px] text-foreground leading-[1.7]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#1565C0] mt-[7px] shrink-0" />
                {a}
              </li>
            ))}
          </ul>
        </>
      )}

      {/* Experience */}
      {data.experience?.length > 0 && (
        <>
          <SectionLabel template={template}>Work Experience</SectionLabel>
          <div className="space-y-4">
            {data.experience.map((exp, i) => (
              <div key={i}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[13px] font-bold text-foreground">{exp.title}</p>
                    <p className="text-[12px] text-[#1565C0]">{exp.company}{exp.location ? ` · ${exp.location}` : ""}</p>
                  </div>
                  <p className="text-[11px] text-muted-foreground shrink-0">{exp.startDate} – {exp.endDate}</p>
                </div>
                <ul className="mt-1.5 space-y-1">
                  {exp.bullets?.map((b, j) => (
                    <li key={j} className="flex items-start gap-2 text-[12px] text-foreground leading-[1.7]">
                      <span className="w-1 h-1 rounded-full bg-muted-foreground mt-[7px] shrink-0" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Certifications */}
      {data.certifications?.length > 0 && (
        <>
          <SectionLabel template={template}>Certifications</SectionLabel>
          <div className="space-y-2">
            {data.certifications.map((c, i) => (
              <div key={i} className="flex items-start justify-between py-1.5" style={{ borderBottom: i < data.certifications.length - 1 ? "1px dashed #E8ECF0" : "none" }}>
                <div>
                  <p className="text-[13px] font-bold text-foreground">{c.name}</p>
                  <p className="text-[11px] text-muted-foreground">{c.issuer}</p>
                </div>
                <p className="text-[11px] text-muted-foreground shrink-0">{c.year}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Skills */}
      {(data.technicalSkills?.length > 0 || data.softSkills?.length > 0) && (
        <>
          <SectionLabel template={template}>Core Skills</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {data.technicalSkills?.map((s) => (
              <span key={s} className="px-2.5 py-1 rounded-full text-[11px] font-medium text-[#1565C0] bg-[#EFF6FF] border border-[#BFDBFE]">{s}</span>
            ))}
            {data.softSkills?.map((s) => (
              <span key={s} className="px-2.5 py-1 rounded-full text-[11px] font-medium text-foreground bg-[#F5F7FA] border border-[#E8ECF0]">{s}</span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
