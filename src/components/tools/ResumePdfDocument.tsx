import React from "react";
import { Document, Page, Text, View, StyleSheet, Font, Link } from "@react-pdf/renderer";
import type { ResumeData } from "./ResumePreview";

// Harvard resume style with Calibri typography. We register Carlito, a libre
// font metrically identical to Calibri, so the PDF matches Word output exactly.
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
        { src: "https://cdn.jsdelivr.net/fontsource/fonts/carlito@latest/latin-700-italic.ttf", fontWeight: 700, fontStyle: "italic" },
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

function buildStyles() {
  const body = "Carlito";
  const nameSize = 24;
  const bodySize = 10.5;
  const lineHeight = 1.15;
  // 0.75" margin = 54pt
  return StyleSheet.create({
    page: {
      paddingTop: 54,
      paddingBottom: 54,
      paddingHorizontal: 54,
      fontFamily: body,
      fontSize: bodySize,
      color: "#000",
      lineHeight,
    },
    header: { alignItems: "center", marginBottom: 4 },
    name: { fontFamily: body, fontWeight: 700, fontSize: nameSize, letterSpacing: 0.4, color: "#000", textAlign: "center" },
    role: { fontFamily: body, fontStyle: "italic", fontSize: bodySize, color: "#000", marginTop: 2, textAlign: "center" },
    contact: { fontFamily: body, fontSize: bodySize, color: "#000", marginTop: 4, textAlign: "center" },
    sectionHeading: {
      fontFamily: body, fontWeight: 700, fontSize: 12, color: "#000",
      textTransform: "uppercase", letterSpacing: 1.2,
      marginTop: 12, marginBottom: 3, paddingBottom: 1,
      borderBottomWidth: 0.75, borderBottomColor: "#000",
    },
    para: { fontFamily: body, fontSize: bodySize, color: "#000", lineHeight, marginTop: 3, textAlign: "justify" },

    entryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 4 },
    entryPrimary: { fontFamily: body, fontWeight: 700, fontSize: bodySize, color: "#000", flex: 1, paddingRight: 8 },
    entryRightTop: { fontFamily: body, fontSize: bodySize, color: "#000" },
    entrySubRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 1 },
    entrySecondary: { fontFamily: body, fontSize: bodySize, color: "#000", fontStyle: "italic", flex: 1, paddingRight: 8 },
    entryRightBottom: { fontFamily: body, fontSize: bodySize, color: "#000", fontStyle: "italic" },
    bulletRow: { flexDirection: "row", alignItems: "flex-start", marginTop: 2, paddingLeft: 8 },
    bulletDot: { width: 10, fontFamily: body, fontSize: bodySize, color: "#000", lineHeight },
    bulletText: { flex: 1, fontFamily: body, fontSize: bodySize, color: "#000", lineHeight },
    skillsLabel: { fontFamily: body, fontSize: bodySize, color: "#000", fontWeight: 700 },
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

// Harvard entry block: primary bold-left | rightTop regular-right;
// secondary italic-left | rightBottom italic-right.
const EntryHeader = ({ s, primary, secondary, rightTop, rightBottom }: { s: any; primary: string; secondary?: string; rightTop?: string; rightBottom?: string }) => (
  <View>
    <View style={s.entryRow} wrap={false}>
      <Text style={s.entryPrimary}>{primary}</Text>
      {rightTop ? <Text style={s.entryRightTop}>{rightTop}</Text> : null}
    </View>
    {(secondary || rightBottom) ? (
      <View style={s.entrySubRow} wrap={false}>
        <Text style={s.entrySecondary}>{secondary || ""}</Text>
        {rightBottom ? <Text style={s.entryRightBottom}>{rightBottom}</Text> : null}
      </View>
    ) : null}
  </View>
);

export default function ResumePdfDocument({ data, template, targetRole }: Props) {
  ensureFonts();
  const tpl = normalizeTemplate(template);
  const s = buildStyles();

  const name = clean(data.name);
  const role = clean(data.jobTitle) || clean(targetRole);
  const city = clean(data.city);
  const phone = clean(data.phone);
  const email = clean(data.email);
  const linkedin = clean(data.linkedin);
  const linkedinHref = formatLinkedinHref(linkedin);
  const contactBits = [city, phone, email].filter(Boolean);

  // Renderers
  const summaryLabel = tpl === "executive" ? "Executive Profile" : tpl === "student" ? "Career Objective" : "Summary";
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
  const tools = (data.tools || []).map(clean).filter(Boolean);
  const awards = (data.awards || []).map(clean).filter(Boolean);
  const projects = (data.projects || []).map((p) => ({ name: clean(p.name), date: clean(p.date), bullets: (p.bullets || []).map(clean).filter(Boolean) })).filter((p) => p.name || p.bullets.length);
  const boards = (data.boardExperience || []).map((b) => ({ role: clean(b.role), organization: clean(b.organization), date: clean(b.date) })).filter((b) => b.role || b.organization);
  const leadership = (data.leadership || []).map((p) => ({ role: clean(p.role), organization: clean(p.organization), date: clean(p.date), bullets: (p.bullets || []).map(clean).filter(Boolean) })).filter((p) => p.role || p.organization || p.bullets.length);
  const volunteer = (data.volunteer || []).map((p) => ({ role: clean(p.role), organization: clean(p.organization), date: clean(p.date), bullets: (p.bullets || []).map(clean).filter(Boolean) })).filter((p) => p.role || p.organization || p.bullets.length);

  const Header = (
    <View style={s.header}>
      <Text style={s.name}>{name || " "}</Text>
      {role ? <Text style={s.role}>{role}</Text> : null}
      <Text style={s.contact}>
        {contactBits.join("  •  ")}
        {linkedin ? (
          <>
            {contactBits.length > 0 ? "  •  " : ""}
            {linkedinHref ? <Link src={linkedinHref} style={s.link}>{linkedin}</Link> : linkedin}
          </>
        ) : null}
      </Text>
    </View>
  );

  const Summary = summaryText ? (<View><SectionHeading s={s}>{summaryLabel}</SectionHeading><Para s={s}>{summaryText}</Para></View>) : null;
  const KeyAch = keyAchievements.length ? (<View><SectionHeading s={s}>Key Achievements</SectionHeading><Bullets s={s} items={keyAchievements} /></View>) : null;
  const Competencies = competencies.length ? (<View><SectionHeading s={s}>Core Competencies</SectionHeading><Para s={s}>{competencies.join(" • ")}</Para></View>) : null;

  const Experience = (label: string) => expItems.length ? (
    <View>
      <SectionHeading s={s}>{label}</SectionHeading>
      {expItems.map((e, i) => (
        <View key={i} style={{ marginTop: 2 }} wrap={true} minPresenceAhead={40}>
          <EntryHeader
            s={s}
            primary={e.company || e.title}
            secondary={e.company ? e.title : undefined}
            rightTop={e.location}
            rightBottom={[e.startDate, e.endDate].filter(Boolean).join(" – ")}
          />
          {e.bullets.length ? <Bullets s={s} items={e.bullets} /> : null}
        </View>
      ))}
    </View>
  ) : null;

  const Projects = projects.length ? (
    <View>
      <SectionHeading s={s}>Projects</SectionHeading>
      {projects.map((p, i) => (
        <View key={i} style={{ marginTop: 2 }} wrap={true} minPresenceAhead={32}>
          <EntryHeader s={s} primary={p.name} rightTop={p.date} />
          {p.bullets.length ? <Bullets s={s} items={p.bullets} /> : null}
        </View>
      ))}
    </View>
  ) : null;

  const RoleList = (heading: string, list: { role: string; organization: string; date?: string; bullets: string[] }[]) => list.length ? (
    <View>
      <SectionHeading s={s}>{heading}</SectionHeading>
      {list.map((p, i) => (
        <View key={i} style={{ marginTop: 2 }} wrap={true} minPresenceAhead={32}>
          <EntryHeader s={s} primary={p.organization || p.role} secondary={p.organization ? p.role : undefined} rightBottom={p.date} />
          {p.bullets.length ? <Bullets s={s} items={p.bullets} /> : null}
        </View>
      ))}
    </View>
  ) : null;

  const Education = eduItems.length ? (
    <View>
      <SectionHeading s={s}>Education</SectionHeading>
      {eduItems.map((e, i) => {
        const degreeLine = [e.degree, e.field].filter(Boolean).join(" in ");
        const secondary = [degreeLine, e.honours].filter(Boolean).join(" — ");
        return (
          <View key={i} style={{ marginTop: 2 }} wrap={false}>
            <EntryHeader s={s} primary={e.school || degreeLine} secondary={e.school ? secondary : undefined} rightBottom={e.year} />
          </View>
        );
      })}
    </View>
  ) : null;

  const Certs = certItems.length ? (
    <View>
      <SectionHeading s={s}>Certifications</SectionHeading>
      <Bullets s={s} items={certItems.map((c) => `${c.name}${c.issuer ? `, ${c.issuer}` : ""}${c.year ? ` (${c.year})` : ""}`)} />
    </View>
  ) : null;

  const Skills = (heading: string) => (tech.length || soft.length) ? (
    <View>
      <SectionHeading s={s}>{heading}</SectionHeading>
      {tech.length > 0 ? (
        <Text style={s.para}>
          <Text style={s.skillsLabel}>Technical: </Text>
          {tech.join(", ")}
        </Text>
      ) : null}
      {soft.length > 0 ? (
        <Text style={s.para}>
          <Text style={s.skillsLabel}>Other: </Text>
          {soft.join(", ")}
        </Text>
      ) : null}
    </View>
  ) : null;

  const Tools = tools.length ? (<View><SectionHeading s={s}>Tools & Technologies</SectionHeading><Para s={s}>{tools.join(" • ")}</Para></View>) : null;
  const Awards = awards.length ? (<View><SectionHeading s={s}>Honors & Awards</SectionHeading><Bullets s={s} items={awards} /></View>) : null;
  const Board = boards.length ? (
    <View>
      <SectionHeading s={s}>Board Experience</SectionHeading>
      {boards.map((b, i) => (
        <View key={i} style={{ marginTop: 2 }} wrap={false}>
          <EntryHeader s={s} primary={b.organization || b.role} secondary={b.organization ? b.role : undefined} rightBottom={b.date} />
        </View>
      ))}
    </View>
  ) : null;

  const sectionsByTemplate: Record<TemplateId, React.ReactNode[]> = {
    student: [Summary, Education, Projects, RoleList("Leadership Experience", leadership), RoleList("Volunteer Experience", volunteer), Skills("Skills & Interests"), Certs, Awards],
    ats: [Summary, Experience("Experience"), Education, Skills("Skills & Interests"), Certs],
    professional: [Summary, Competencies, Experience("Experience"), Education, Certs, Tools],
    executive: [Summary, KeyAch, Experience("Experience"), Board, Education, Certs, Skills("Skills & Interests")],
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
