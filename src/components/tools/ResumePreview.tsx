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
  onChange?: (next: ResumeData) => void;
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

/**
 * Uncontrolled contentEditable cell. Renders `initial` once and reports the
 * new text on blur. Won't fight the cursor while you type.
 */
const Editable = React.memo(function Editable({
  initial,
  onSave,
  editable,
  style,
  tag = "span",
  multiline = false,
  placeholder,
}: {
  initial: string;
  onSave: (v: string) => void;
  editable: boolean;
  style?: React.CSSProperties;
  tag?: "span" | "p" | "h3" | "li" | "div";
  multiline?: boolean;
  placeholder?: string;
}) {
  const Tag: any = tag;
  if (!editable) return <Tag style={style} dangerouslySetInnerHTML={{ __html: renderInline(initial) }} />;
  return (
    <Tag
      contentEditable
      suppressContentEditableWarning
      spellCheck
      data-placeholder={placeholder}
      onBlur={(e: React.FocusEvent<HTMLElement>) => {
        const v = (e.currentTarget.innerText || "").replace(/\u00a0/g, " ").trim();
        if (v !== initial) onSave(v);
      }}
      onKeyDown={(e: React.KeyboardEvent<HTMLElement>) => {
        if (!multiline && e.key === "Enter") {
          e.preventDefault();
          (e.currentTarget as HTMLElement).blur();
        }
      }}
      style={{
        outline: "none",
        borderRadius: 3,
        padding: "0 2px",
        margin: "0 -2px",
        cursor: "text",
        ...style,
      }}
      // hover/focus background handled via inline events to avoid CSS
      onMouseEnter={(e: any) => (e.currentTarget.style.background = "rgba(224,72,122,0.08)")}
      onMouseLeave={(e: any) => (e.currentTarget.style.background = "transparent")}
      onFocus={(e: any) => (e.currentTarget.style.background = "rgba(224,72,122,0.12)")}
      onBlurCapture={(e: any) => (e.currentTarget.style.background = "transparent")}
      dangerouslySetInnerHTML={{ __html: renderInline(initial || (placeholder ? "" : "")) }}
    />
  );
});

function escapeHtml(s: string) {
  return s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] as string));
}

// Escape HTML then convert markdown bold/italic markers into real tags so
// content like **Adeife** renders bold instead of showing literal asterisks.
function renderInline(s: string) {
  let out = escapeHtml(s || "");
  out = out.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  out = out.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/(^|[^\*])\*(?!\s)([^\*\n]+?)\*(?!\*)/g, "$1<em>$2</em>");
  out = out.replace(/__(.+?)__/g, "<strong>$1</strong>");
  return out;
}

export default function ResumePreview({ data, template, targetRole, onChange }: ResumePreviewProps) {
  const tpl = normalizeTemplate(template);
  const isExec = tpl === "executive";
  const fontFamily = "'Open Sans', Arial, sans-serif";
  const nameSize = isExec ? 32 : 30;
  const bodySize = isExec ? 13 : 12.5;
  const lineHeight = 1.25;
  const editable = !!onChange;

  // Remount editable nodes when the underlying resume identity changes
  // (e.g., user regenerates). We key by a hash of the structural fields.
  const remountKey = React.useMemo(
    () => JSON.stringify({ n: data.name, t: data.jobTitle, e: (data.experience || []).length, s: (data.summary || "").length }),
    // intentionally narrow — text edits via onBlur shouldn't remount
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data.name, data.jobTitle, (data.experience || []).length]
  );

  const update = (patch: Partial<ResumeData>) => onChange?.({ ...data, ...patch });
  const updateExp = (i: number, patch: Partial<ResumeData["experience"][number]>) =>
    onChange?.({ ...data, experience: data.experience.map((e, idx) => (idx === i ? { ...e, ...patch } : e)) });
  const updateExpBullet = (i: number, bi: number, v: string) =>
    updateExp(i, { bullets: data.experience[i].bullets.map((b, k) => (k === bi ? v : b)) });
  const updateEdu = (i: number, patch: Partial<NonNullable<ResumeData["education"]>[number]>) =>
    onChange?.({ ...data, education: (data.education || []).map((e, idx) => (idx === i ? { ...e, ...patch } : e)) });
  const updateArr = (key: keyof ResumeData, i: number, v: string) => {
    const arr = ((data as any)[key] || []).slice();
    arr[i] = v;
    onChange?.({ ...data, [key]: arr } as ResumeData);
  };

  if (data.raw && !clean(data.summary)) {
    return (
      <div style={{ width: 794, margin: "0 auto", padding: "72px", background: "#fff", color: "#000", fontFamily, fontSize: bodySize, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
        {data.raw}
      </div>
    );
  }

  const name = clean(data.name);
  const role = clean(data.jobTitle) || clean(targetRole);
  const city = clean(data.city);
  const phone = clean(data.phone);
  const email = clean(data.email);
  const linkedin = clean(data.linkedin);

  const SectionHeading = ({ children }: { children: string }) => (
    <h3 style={{
      fontFamily,
      fontSize: 14,
      fontWeight: 700,
      color: "#000",
      textTransform: "uppercase",
      letterSpacing: 0.4,
      margin: "16px 0 5px",
      paddingBottom: 2,
      borderBottom: "1px solid #000",
    }}>{children}</h3>
  );

  const RoleHeader = ({
    title, sub, dates, loc,
    onTitle, onSub, onDates, onLoc,
  }: {
    title: string; sub?: string; dates?: string; loc?: string;
    onTitle?: (v: string) => void; onSub?: (v: string) => void; onDates?: (v: string) => void; onLoc?: (v: string) => void;
  }) => (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <Editable editable={editable && !!onTitle} initial={title} onSave={(v) => onTitle?.(v)} style={{ fontFamily, fontSize: bodySize + 0.5, fontWeight: 700, color: "#000" }} />
        {(dates !== undefined) && (
          <Editable editable={editable && !!onDates} initial={dates || ""} onSave={(v) => onDates?.(v)} style={{ fontFamily, fontSize: bodySize, color: "#000" }} placeholder="Dates" />
        )}
      </div>
      {(sub !== undefined || loc !== undefined) && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
          <Editable editable={editable && !!onSub} initial={sub || ""} onSave={(v) => onSub?.(v)} style={{ fontFamily, fontSize: bodySize, fontStyle: "italic", color: "#000" }} placeholder="Organization" />
          {(loc !== undefined) && (
            <Editable editable={editable && !!onLoc} initial={loc || ""} onSave={(v) => onLoc?.(v)} style={{ fontFamily, fontSize: bodySize, fontStyle: "italic", color: "#000" }} placeholder="Location" />
          )}
        </div>
      )}
    </div>
  );

  const BulletList = ({
    items, onItem,
  }: {
    items: string[]; onItem?: (i: number, v: string) => void;
  }) => (
    <ul style={{ margin: "4px 0 0", paddingLeft: 18, listStyle: "disc", color: "#000" }}>
      {items.map((b, i) => (
        <Editable
          key={i}
          tag="li"
          editable={editable && !!onItem}
          initial={b}
          onSave={(v) => onItem?.(i, v)}
          multiline
          style={{ fontFamily, fontSize: bodySize, lineHeight, marginBottom: 2 }}
        />
      ))}
    </ul>
  );

  const Para = ({ value, onSave, multiline = true }: { value: string; onSave?: (v: string) => void; multiline?: boolean }) => (
    <Editable
      tag="p"
      editable={editable && !!onSave}
      initial={value}
      onSave={(v) => onSave?.(v)}
      multiline={multiline}
      style={{ fontFamily, fontSize: bodySize, color: "#000", lineHeight, margin: "4px 0" }}
    />
  );

  // ---------- Section renderers ----------
  const summaryLabel = tpl === "executive" ? "Executive Profile" : tpl === "student" ? "Career Objective" : "Professional Summary";
  const renderSummary = () => {
    const isExecField = tpl === "executive";
    const text = isExecField ? (data.executiveProfile || data.summary || "") : (data.summary || "");
    if (!editable && !clean(text)) return null;
    return (
      <>
        <SectionHeading>{summaryLabel}</SectionHeading>
        <Para value={text} onSave={(v) => update(isExecField ? { executiveProfile: v } : { summary: v })} />
      </>
    );
  };

  const renderKeyAchievements = () => {
    const items = (data.keyAchievements?.length ? data.keyAchievements : data.achievements) || [];
    if (!editable && !items.filter(clean).length) return null;
    return (
      <>
        <SectionHeading>Key Achievements</SectionHeading>
        <BulletList items={items} onItem={(i, v) => updateArr(data.keyAchievements?.length ? "keyAchievements" : "achievements", i, v)} />
      </>
    );
  };

  const renderCoreCompetencies = () => {
    const items = (data.coreCompetencies || data.technicalSkills || []);
    if (!editable && !items.filter(clean).length) return null;
    const key = data.coreCompetencies ? "coreCompetencies" : "technicalSkills";
    return (
      <>
        <SectionHeading>Core Competencies</SectionHeading>
        <Editable
          tag="p"
          editable={editable}
          initial={items.join(" | ")}
          onSave={(v) => update({ [key]: v.split("|").map((s) => s.trim()).filter(Boolean) } as any)}
          style={{ fontFamily, fontSize: bodySize, color: "#000", lineHeight, margin: "4px 0" }}
        />
      </>
    );
  };

  const renderExperience = (label = "Work Experience") => {
    const items = data.experience || [];
    if (!editable && !items.length) return null;
    return (
      <>
        <SectionHeading>{label}</SectionHeading>
        {items.map((e, i) => (
          <div key={i} style={{ marginBottom: 8 }}>
            <RoleHeader
              title={e.title || ""}
              sub={e.company || ""}
              loc={e.location || ""}
              dates={[e.startDate, e.endDate].filter(Boolean).join(" – ")}
              onTitle={(v) => updateExp(i, { title: v })}
              onSub={(v) => updateExp(i, { company: v })}
              onLoc={(v) => updateExp(i, { location: v })}
              onDates={(v) => {
                const [start = "", end = ""] = v.split(/\s*[–-]\s*/);
                updateExp(i, { startDate: start, endDate: end });
              }}
            />
            <BulletList items={e.bullets || []} onItem={(bi, v) => updateExpBullet(i, bi, v)} />
          </div>
        ))}
      </>
    );
  };

  const renderRoleList = (heading: string, listKey: "leadership" | "volunteer") => {
    const list = data[listKey] || [];
    if (!editable && !list.length) return null;
    const updRole = (i: number, patch: any) =>
      onChange?.({ ...data, [listKey]: list.map((p, idx) => (idx === i ? { ...p, ...patch } : p)) } as ResumeData);
    return (
      <>
        <SectionHeading>{heading}</SectionHeading>
        {list.map((p, i) => (
          <div key={i} style={{ marginBottom: 8 }}>
            <RoleHeader
              title={p.role || ""}
              sub={p.organization || ""}
              dates={p.date || ""}
              onTitle={(v) => updRole(i, { role: v })}
              onSub={(v) => updRole(i, { organization: v })}
              onDates={(v) => updRole(i, { date: v })}
            />
            <BulletList items={p.bullets || []} onItem={(bi, v) => updRole(i, { bullets: p.bullets.map((b, k) => (k === bi ? v : b)) })} />
          </div>
        ))}
      </>
    );
  };

  const renderProjects = () => {
    const list = data.projects || [];
    if (!editable && !list.length) return null;
    const upd = (i: number, patch: any) =>
      onChange?.({ ...data, projects: list.map((p, idx) => (idx === i ? { ...p, ...patch } : p)) });
    return (
      <>
        <SectionHeading>Academic Projects</SectionHeading>
        {list.map((p, i) => (
          <div key={i} style={{ marginBottom: 8 }}>
            <RoleHeader
              title={p.name || ""}
              dates={p.date || ""}
              onTitle={(v) => upd(i, { name: v })}
              onDates={(v) => upd(i, { date: v })}
            />
            <BulletList items={p.bullets || []} onItem={(bi, v) => upd(i, { bullets: p.bullets.map((b, k) => (k === bi ? v : b)) })} />
          </div>
        ))}
      </>
    );
  };

  const renderEducation = () => {
    const items = data.education || [];
    if (!editable && !items.length) return null;
    return (
      <>
        <SectionHeading>Education</SectionHeading>
        {items.map((e, i) => (
          <div key={i} style={{ marginBottom: 6 }}>
            <RoleHeader
              title={[e.degree, e.field].filter(Boolean).join(" in ") || ""}
              sub={[e.school, e.honours].filter(Boolean).join(" — ") || ""}
              dates={e.year || ""}
              onTitle={(v) => {
                const [degree = "", field = ""] = v.split(/\s+in\s+/i);
                updateEdu(i, { degree, field: field || e.field });
              }}
              onSub={(v) => {
                const [school = "", honours = ""] = v.split(/\s*—\s*/);
                updateEdu(i, { school, honours: honours || undefined });
              }}
              onDates={(v) => updateEdu(i, { year: v })}
            />
          </div>
        ))}
      </>
    );
  };

  const renderSkills = (heading = "Skills") => {
    const tech = data.technicalSkills || [];
    const soft = data.softSkills || [];
    const all = [...tech, ...soft];
    if (!editable && !all.filter(clean).length) return null;
    return (
      <>
        <SectionHeading>{heading}</SectionHeading>
        <Editable
          tag="p"
          editable={editable}
          initial={all.join(" | ")}
          onSave={(v) => {
            const parts = v.split("|").map((s) => s.trim()).filter(Boolean);
            // Preserve split: first N go to technical, rest to soft
            const nTech = Math.min(parts.length, tech.length || parts.length);
            update({ technicalSkills: parts.slice(0, nTech), softSkills: parts.slice(nTech) });
          }}
          style={{ fontFamily, fontSize: bodySize, color: "#000", lineHeight, margin: "4px 0" }}
        />
      </>
    );
  };

  const renderTools = () => {
    const items = data.tools || [];
    if (!editable && !items.filter(clean).length) return null;
    return (
      <>
        <SectionHeading>Tools & Technologies</SectionHeading>
        <Editable
          tag="p"
          editable={editable}
          initial={items.join(" | ")}
          onSave={(v) => update({ tools: v.split("|").map((s) => s.trim()).filter(Boolean) })}
          style={{ fontFamily, fontSize: bodySize, color: "#000", lineHeight, margin: "4px 0" }}
        />
      </>
    );
  };

  const renderCertifications = () => {
    const items = data.certifications || [];
    if (!editable && !items.length) return null;
    const upd = (i: number, patch: any) =>
      onChange?.({ ...data, certifications: items.map((c, idx) => (idx === i ? { ...c, ...patch } : c)) });
    return (
      <>
        <SectionHeading>Certifications</SectionHeading>
        <ul style={{ margin: "4px 0 0", paddingLeft: 18, listStyle: "disc", color: "#000" }}>
          {items.map((c, i) => (
            <li key={i} style={{ fontFamily, fontSize: bodySize, lineHeight, marginBottom: 2 }}>
              <Editable editable={editable} initial={c.name || ""} onSave={(v) => upd(i, { name: v })} placeholder="Certification" />
              {(c.issuer || editable) && (
                <>
                  {" — "}
                  <Editable editable={editable} initial={c.issuer || ""} onSave={(v) => upd(i, { issuer: v })} placeholder="Issuer" />
                </>
              )}
              {(c.year || editable) && (
                <>
                  {" ("}
                  <Editable editable={editable} initial={c.year || ""} onSave={(v) => upd(i, { year: v })} placeholder="Year" />
                  {")"}
                </>
              )}
            </li>
          ))}
        </ul>
      </>
    );
  };

  const renderAwards = () => {
    const items = data.awards || [];
    if (!editable && !items.filter(clean).length) return null;
    return (
      <>
        <SectionHeading>Awards</SectionHeading>
        <BulletList items={items} onItem={(i, v) => updateArr("awards", i, v)} />
      </>
    );
  };

  const renderBoardExperience = () => {
    const items = data.boardExperience || [];
    if (!editable && !items.length) return null;
    const upd = (i: number, patch: any) =>
      onChange?.({ ...data, boardExperience: items.map((b, idx) => (idx === i ? { ...b, ...patch } : b)) });
    return (
      <>
        <SectionHeading>Board Experience</SectionHeading>
        {items.map((b, i) => (
          <div key={i} style={{ marginBottom: 4 }}>
            <RoleHeader
              title={b.role || ""}
              sub={b.organization || ""}
              dates={b.date || ""}
              onTitle={(v) => upd(i, { role: v })}
              onSub={(v) => upd(i, { organization: v })}
              onDates={(v) => upd(i, { date: v })}
            />
          </div>
        ))}
      </>
    );
  };

  const sections: Record<TemplateId, React.ReactNode[]> = {
    student: [
      renderSummary(),
      renderEducation(),
      renderProjects(),
      renderRoleList("Leadership Experience", "leadership"),
      renderRoleList("Volunteer Experience", "volunteer"),
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
    <div
      key={remountKey}
      style={{ width: 794, minHeight: 1123, margin: "0 auto", padding: "72px", background: "#fff", color: "#000", fontFamily, fontSize: bodySize, lineHeight }}
    >
      {/* HEADER */}
      <div style={{ marginBottom: 10, textAlign: "center" }}>
        {(name || editable) ? (
          <Editable
            tag="p"
            editable={editable}
            initial={name}
            onSave={(v) => update({ name: v })}
            placeholder="Your name"
            style={{ fontFamily, fontSize: nameSize, fontWeight: 700, color: "#000", letterSpacing: 0.4, margin: 0, textTransform: "uppercase" }}
          />
        ) : (
          <p style={{ fontFamily, fontSize: 13, color: "#666", margin: 0, fontStyle: "italic" }}>
            (Add your full name in your profile so it appears here.)
          </p>
        )}
        {(role || editable) && (
          <Editable
            tag="p"
            editable={editable}
            initial={role}
            onSave={(v) => update({ jobTitle: v })}
            placeholder="Job title"
            style={{ fontFamily, fontSize: isExec ? 16 : 15, fontWeight: 600, color: "#000", margin: "3px 0 0" }}
          />
        )}
        {/* Contact line — render each field separately so they stay editable */}
        <p style={{ fontFamily, fontSize: bodySize, color: "#000", margin: "5px 0 0", lineHeight: 1.3 }}>
          <Editable editable={editable} initial={city} onSave={(v) => update({ city: v })} placeholder="City" />
          {" | "}
          <Editable editable={editable} initial={phone} onSave={(v) => update({ phone: v })} placeholder="Phone" />
          {" | "}
          <Editable editable={editable} initial={email} onSave={(v) => update({ email: v })} placeholder="Email" />
          {" | "}
          <Editable editable={editable} initial={linkedin} onSave={(v) => update({ linkedin: v })} placeholder="LinkedIn" />
        </p>
      </div>

      {sections[tpl].map((node, i) => node ? <React.Fragment key={i}>{node}</React.Fragment> : null)}
    </div>
  );
}
