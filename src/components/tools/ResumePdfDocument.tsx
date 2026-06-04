import React from "react";
import { Document, Page, Text, View, StyleSheet, Font, Link } from "@react-pdf/renderer";
import type { ResumeData } from "./ResumePreview";

// Register Carlito (Calibri-metric) and Caladea (Cambria-metric) — both libre fonts
// metrically identical to the Microsoft originals, so the PDF matches Word output.
let fontsRegistered = false;
function ensureFonts() {
  if (fontsRegistered) return;
  try {
    Font.register({
      family: "Carlito",
      fonts: [
        { src: "https://cdn.jsdelivr.net/fontsource/fonts/carlito@latest/latin-400-normal.ttf", fontWeight: 400 },
        { src: "https://cdn.jsdelivr.net/fontsource/fonts/carlito@latest/latin-700-normal.ttf", fontWeight: 700 },
        { src: "https://cdn.jsdelivr.net/fontsource/fonts/carlito@latest/latin-400-italic.ttf", fontWeight: 400, fontStyle: "italic" },
      ],
    });
    Font.register({
      family: "Caladea",
      fonts: [
        { src: "https://cdn.jsdelivr.net/fontsource/fonts/caladea@latest/latin-400-normal.ttf", fontWeight: 400 },
        { src: "https://cdn.jsdelivr.net/fontsource/fonts/caladea@latest/latin-700-normal.ttf", fontWeight: 700 },
        { src: "https://cdn.jsdelivr.net/fontsource/fonts/caladea@latest/latin-400-italic.ttf", fontWeight: 400, fontStyle: "italic" },
      ],
    });
    Font.registerHyphenationCallback((word) => [word]);
    fontsRegistered = true;
  } catch (e) {
    console.warn("Font registration failed, falling back to built-ins", e);
  }
}

interface Props {
  data: ResumeData;
  template: string;
  targetRole: string;
  accentColor?: string;
  mode?: "styled" | "ats";
}

type TemplateId = "student" | "ats" | "professional" | "executive";

function normalizeTemplate(t: string): TemplateId {
  const v = (t || "").toLowerCase();
  if (v === "student" || v === "graduate") return "student";
  if (v === "professional") return "professional";
  if (v === "executive" || v === "senior" || v === "leader") return "executive";
  return "ats";
}

const PLACEHOLDER_RE = /^\s*\(?\s*(not\s+provided|n\/?a|none|tbd|candidate|your\s+name|to\s+be\s+(added|determined)|unknown|—|-|\[.*\])\s*\)?\s*$/i;
const clean = (v?: string | null) => {
  if (!v) return "";
  const t = String(v).replace(/\s+/g, " ").trim();
  if (!t || PLACEHOLDER_RE.test(t)) return "";
  return t;
};

const formatLinkedinHref = (raw?: string | null) => {
  const v = clean(raw);
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;
  if (v.startsWith("linkedin.com") || v.startsWith("www.")) return `https://${v}`;
  return `https://linkedin.com/in/${v.replace(/^\/?(in\/)?/i, "")}`;
};

function buildStyles(tpl: TemplateId) {
  const isExec = tpl === "executive";
  const body = isExec ? "Caladea" : "Carlito";
  const nameSize = isExec ? 26 : 24;
  const bodySize = isExec ? 11 : 10.5;
  return StyleSheet.create({
    page: {
      paddingTop: 54,        // 0.75"
      paddingBottom: 54,
      paddingHorizontal: 54,
      fontFamily: body,
      fontSize: bodySize,
      color: "#000",
      lineHeight: 1.15,
    },
    name: { fontFamily: body, fontWeight: 700, fontSize: nameSize, textTransform: "uppercase", letterSpacing: 0.5, color: "#000" },
    role: { fontFamily: body, fontWeight: 700, fontSize: isExec ? 14 : 13, color: "#000", marginTop: 2 },
    contact: { fontFamily: body, fontSize: bodySize, color: "#000", marginTop: 4, lineHeight: 1.2 },
    sectionHeading: {
      fontFamily: body, fontWeight: 700, fontSize: 12, color: "#000",
      textTransform: "uppercase", letterSpacing: 0.5,
      marginTop: 12, marginBottom: 4, paddingBottom: 2,
      borderBottomWidth: 0.75, borderBottomColor: "#000",
    },
    para: { fontFamily: body, fontSize: bodySize, color: "#000", lineHeight: 1.25, marginTop: 3 },
    roleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 4 },
    roleTitle: { fontFamily: body, fontWeight: 700, fontSize: bodySize + 0.5, color: "#000", flex: 1, paddingRight: 8 },
    roleDates: { fontFamily: body, fontSize: bodySize, color: "#000" },
    subRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 1 },
    subText: { fontFamily: body, fontSize: bodySize, color: "#000", fontStyle: "italic", flex: 1, paddingRight: 8 },
    subRight: { fontFamily: body, fontSize: bodySize, color: "#000", fontStyle: "italic" },
    bulletRow: { flexDirection: "row", alignItems: "flex-start", marginTop: 2, paddingLeft: 6 },
    bulletDot: { width: 10, fontFamily: body, fontSize: bodySize, color: "#000", lineHeight: 1.25 },
    bulletText: { flex: 1, fontFamily: body, fontSize: bodySize, color: "#000", lineHeight: 1.25 },
    link: { color: "#000", textDecoration: "none" },
  });
}

const SectionHeading = ({ s, children }: { s: any; children: string }) => (
  <Text style={s.sectionHeading} minPresenceAhead={30}>{children}</Text>
);

const Para = ({ s, children }: { s: any; children: React.ReactNode }) => (
  <Text style={s.para}>{children}</Text>
);

const Bullets = ({ s, items }: { s: any; items: string[] }) => (
  <View>
    {items.map((b, i) => (
      <View key={i} style={s.bulletRow}>
        <Text style={s.bulletDot}>•</Text>
        <Text style={s.bulletText}>{b}</Text>
      </View>
    ))}
  </View>
);

const RoleHeader = ({ s, title, sub, dates, loc }: { s: any; title: string; sub?: string; dates?: string; loc?: string }) => (
  <View>
    <View style={s.roleRow} wrap={false}>
      <Text style={s.roleTitle}>{title}</Text>
      {dates ? <Text style={s.roleDates}>{dates}</Text> : null}
    </View>
    {(sub || loc) ? (
      <View style={s.subRow} wrap={false}>
        <Text style={s.subText}>{sub || ""}</Text>
        {loc ? <Text style={s.subRight}>{loc}</Text> : null}
      </View>
    ) : null}
  </View>
);

export default function ResumePdfDocument({ data, template, targetRole }: Props) {
  ensureFonts();
  const tpl = normalizeTemplate(template);
  const s = buildStyles(tpl);

  const name = clean(data.name);
  const role = clean(data.jobTitle) || clean(targetRole);
  const city = clean(data.city);
  const phone = clean(data.phone);
  const email = clean(data.email);
  const linkedin = clean(data.linkedin);
  const linkedinHref = formatLinkedinHref(linkedin);

  // Renderers
  const summaryLabel = tpl === "executive" ? "Executive Profile" : tpl === "student" ? "Career Objective" : "Professional Summary";
  const summaryText = clean(tpl === "executive" ? (data.executiveProfile || data.summary) : data.summary);
  const keyAchievements = (data.keyAchievements && data.keyAchievements.length ? data.keyAchievements : data.achievements || []).map(clean).filter(Boolean);
  const competencies = (data.coreCompetencies || data.technicalSkills || []).map(clean).filter(Boolean);
  const expItems = (data.experience || []).map((e) => ({
    title: clean(e.title), company: clean(e.company), location: clean(e.location),
    startDate: clean(e.startDate), endDate: clean(e.endDate),
    bullets: (e.bullets || []).map(clean).filter(Boolean),
  })).filter((e) => e.title || e.company || e.bullets.length);
  const eduItems = (data.education || []).map((e) => ({
    degree: clean(e.degree), school: clean(e.school), year: clean(e.year), field: clean(e.field), honours: clean(e.honours),
  })).filter((e) => e.degree || e.school || e.field || e.year);
  const certItems = (data.certifications || []).map((c) => ({ name: clean(c.name), issuer: clean(c.issuer), year: clean(c.year) })).filter((c) => c.name || c.issuer);
  const tech = (data.technicalSkills || []).map(clean).filter(Boolean);
  const soft = (data.softSkills || []).map(clean).filter(Boolean);
  const skills = [...tech, ...soft];
  const tools = (data.tools || []).map(clean).filter(Boolean);
  const awards = (data.awards || []).map(clean).filter(Boolean);
  const projects = (data.projects || []).map((p) => ({ name: clean(p.name), date: clean(p.date), bullets: (p.bullets || []).map(clean).filter(Boolean) })).filter((p) => p.name || p.bullets.length);
  const boards = (data.boardExperience || []).map((b) => ({ role: clean(b.role), organization: clean(b.organization), date: clean(b.date) })).filter((b) => b.role || b.organization);
  const leadership = (data.leadership || []).map((p) => ({ role: clean(p.role), organization: clean(p.organization), date: clean(p.date), bullets: (p.bullets || []).map(clean).filter(Boolean) })).filter((p) => p.role || p.organization || p.bullets.length);
  const volunteer = (data.volunteer || []).map((p) => ({ role: clean(p.role), organization: clean(p.organization), date: clean(p.date), bullets: (p.bullets || []).map(clean).filter(Boolean) })).filter((p) => p.role || p.organization || p.bullets.length);

  const Header = (
    <View>
      <Text style={s.name}>{name || " "}</Text>
      {role ? <Text style={s.role}>{role}</Text> : null}
      <Text style={s.contact}>
        {[city, phone, email].filter(Boolean).join(" | ")}
        {linkedin ? (
          <>
            {[city, phone, email].filter(Boolean).length > 0 ? " | " : ""}
            {linkedinHref ? <Link src={linkedinHref} style={s.link}>{linkedin}</Link> : linkedin}
          </>
        ) : null}
      </Text>
    </View>
  );

  const Summary = summaryText ? (<View><SectionHeading s={s}>{summaryLabel}</SectionHeading><Para s={s}>{summaryText}</Para></View>) : null;
  const KeyAch = keyAchievements.length ? (<View><SectionHeading s={s}>Key Achievements</SectionHeading><Bullets s={s} items={keyAchievements} /></View>) : null;
  const Competencies = competencies.length ? (<View><SectionHeading s={s}>Core Competencies</SectionHeading><Para s={s}>{competencies.join(" | ")}</Para></View>) : null;
  const Experience = (label: string) => expItems.length ? (
    <View>
      <SectionHeading s={s}>{label}</SectionHeading>
      {expItems.map((e, i) => (
        <View key={i} style={{ marginTop: 4 }} wrap={true} minPresenceAhead={40}>
          <RoleHeader s={s} title={e.title} sub={e.company} dates={[e.startDate, e.endDate].filter(Boolean).join(" – ")} loc={e.location} />
          {e.bullets.length ? <Bullets s={s} items={e.bullets} /> : null}
        </View>
      ))}
    </View>
  ) : null;
  const Projects = projects.length ? (
    <View>
      <SectionHeading s={s}>Academic Projects</SectionHeading>
      {projects.map((p, i) => (
        <View key={i} style={{ marginTop: 4 }} wrap={true} minPresenceAhead={32}>
          <RoleHeader s={s} title={p.name} dates={p.date} />
          {p.bullets.length ? <Bullets s={s} items={p.bullets} /> : null}
        </View>
      ))}
    </View>
  ) : null;
  const RoleList = (heading: string, list: { role: string; organization: string; date?: string; bullets: string[] }[]) => list.length ? (
    <View>
      <SectionHeading s={s}>{heading}</SectionHeading>
      {list.map((p, i) => (
        <View key={i} style={{ marginTop: 4 }} wrap={true} minPresenceAhead={32}>
          <RoleHeader s={s} title={p.role} sub={p.organization} dates={p.date} />
          {p.bullets.length ? <Bullets s={s} items={p.bullets} /> : null}
        </View>
      ))}
    </View>
  ) : null;
  const Education = eduItems.length ? (
    <View>
      <SectionHeading s={s}>Education</SectionHeading>
      {eduItems.map((e, i) => (
        <View key={i} style={{ marginTop: 4 }} wrap={false}>
          <RoleHeader s={s} title={[e.degree, e.field].filter(Boolean).join(" in ")} sub={[e.school, e.honours].filter(Boolean).join(" — ")} dates={e.year} />
        </View>
      ))}
    </View>
  ) : null;
  const Certs = certItems.length ? (
    <View>
      <SectionHeading s={s}>Certifications</SectionHeading>
      <Bullets s={s} items={certItems.map((c) => `${c.name}${c.issuer ? ` — ${c.issuer}` : ""}${c.year ? ` (${c.year})` : ""}`)} />
    </View>
  ) : null;
  const Skills = (heading: string) => skills.length ? (<View><SectionHeading s={s}>{heading}</SectionHeading><Para s={s}>{skills.join(" | ")}</Para></View>) : null;
  const Tools = tools.length ? (<View><SectionHeading s={s}>Tools & Technologies</SectionHeading><Para s={s}>{tools.join(" | ")}</Para></View>) : null;
  const Awards = awards.length ? (<View><SectionHeading s={s}>Awards</SectionHeading><Bullets s={s} items={awards} /></View>) : null;
  const Board = boards.length ? (
    <View>
      <SectionHeading s={s}>Board Experience</SectionHeading>
      {boards.map((b, i) => (
        <View key={i} style={{ marginTop: 2 }} wrap={false}>
          <RoleHeader s={s} title={b.role} sub={b.organization} dates={b.date} />
        </View>
      ))}
    </View>
  ) : null;

  const sectionsByTemplate: Record<TemplateId, React.ReactNode[]> = {
    student: [Summary, Education, Projects, RoleList("Leadership Experience", leadership), RoleList("Volunteer Experience", volunteer), Skills("Skills"), Certs, Awards],
    ats: [Summary, Experience("Work Experience"), Education, Skills("Skills"), Certs],
    professional: [Summary, Competencies, Experience("Professional Experience"), Education, Certs, Tools],
    executive: [Summary, KeyAch, Experience("Professional Experience"), Board, Education, Certs, Skills("Technical Skills")],
  };

  return (
    <Document title={`${name || "Resume"}`} author={name}>
      <Page size="A4" style={s.page} wrap>
        {Header}
        {sectionsByTemplate[tpl].map((n, i) => n ? <React.Fragment key={i}>{n}</React.Fragment> : null)}
      </Page>
    </Document>
  );
}
