import React from "react";
import { Document, Page, Text, View, StyleSheet, Font, Link } from "@react-pdf/renderer";
import type { Style } from "@react-pdf/types";
import type { ResumeData } from "./ResumePreview";

// Register webfonts so PDF matches the on-screen preview.
// DM Sans (body across all templates) and EB Garamond (Classic headings).
// Using fontsource CDN (jsdelivr) which serves raw TTF files.
let fontsRegistered = false;
function ensureFonts() {
  if (fontsRegistered) return;
  try {
    Font.register({
      family: "DM Sans",
      fonts: [
        { src: "https://cdn.jsdelivr.net/fontsource/fonts/dm-sans@latest/latin-400-normal.ttf", fontWeight: 400 },
        { src: "https://cdn.jsdelivr.net/fontsource/fonts/dm-sans@latest/latin-500-normal.ttf", fontWeight: 500 },
        { src: "https://cdn.jsdelivr.net/fontsource/fonts/dm-sans@latest/latin-700-normal.ttf", fontWeight: 700 },
        { src: "https://cdn.jsdelivr.net/fontsource/fonts/dm-sans@latest/latin-400-italic.ttf", fontWeight: 400, fontStyle: "italic" },
      ],
    });
    Font.register({
      family: "EB Garamond",
      fonts: [
        { src: "https://cdn.jsdelivr.net/fontsource/fonts/eb-garamond@latest/latin-400-normal.ttf", fontWeight: 400 },
        { src: "https://cdn.jsdelivr.net/fontsource/fonts/eb-garamond@latest/latin-700-normal.ttf", fontWeight: 700 },
      ],
    });
    // Disable hyphenation to keep clean line breaks.
    Font.registerHyphenationCallback((word) => [word]);
    fontsRegistered = true;
  } catch (e) {
    console.warn("Font registration failed, falling back to built-ins", e);
  }
}

// Fallback chain — react-pdf falls back to built-ins if a registered font fails to load.
const SANS = "DM Sans";
const SERIF = "EB Garamond";

interface Props {
  data: ResumeData;
  template: "Classic" | "Modern" | "Minimal" | string;
  targetRole: string;
  accentColor?: string;
  mode?: "styled" | "ats";
}

type TemplateMeta = { isModern: boolean; isMinimal: boolean; isClassic: boolean };
type ContactStyles = { contactLine: Style; contactSep: Style; contactLink: Style };

const COLORS = {
  text: "#3D4A5C",
  muted: "#8896A8",
  heading: "#0F1724",
  border: "#EBE6E2",
  softBg: "#F5F7FA",
};

const cleanText = (value?: string | null) => (value || "").replace(/\s+/g, " ").trim();

const joinClean = (parts: Array<string | undefined | null>, separator = " · ") =>
  parts.map(cleanText).filter(Boolean).join(separator);

const formatLinkedinHref = (raw?: string | null) => {
  const v = cleanText(raw);
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;
  if (v.startsWith("linkedin.com") || v.startsWith("www.")) return `https://${v}`;
  return `https://linkedin.com/in/${v.replace(/^\/?(in\/)?/i, "")}`;
};

const formatLinkedinLabel = (raw?: string | null) => {
  const v = cleanText(raw);
  if (!v) return "";
  const stripped = v.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "");
  // Show short label e.g. linkedin.com/in/jane
  if (stripped.length > 36) return stripped.slice(0, 33) + "…";
  return stripped;
};

function ContactLine({
  data,
  styles,
  linkColor,
}: {
  data: ResumeData;
  styles: any;
  linkColor: string;
}) {
  const leading = [cleanText(data.city), cleanText(data.email)].filter(Boolean);
  const trailing = [cleanText(data.phone)].filter(Boolean);
  const href = formatLinkedinHref(data.linkedin);
  const label = href ? "LinkedIn" : formatLinkedinLabel(data.linkedin);
  if (!leading.length && !trailing.length && !href) return null;
  return (
    <Text style={styles.contactLine}>
      {leading.map((p, i) => (
        <Text key={i}>
          {i > 0 ? <Text style={styles.contactSep}> · </Text> : null}
          {p}
        </Text>
      ))}
      {href ? (
        <Text>
          {leading.length ? <Text style={styles.contactSep}> · </Text> : null}
          <Link src={href} style={[styles.contactLink, { color: linkColor }]}>
            {label}
          </Link>
        </Text>
      ) : null}
      {trailing.map((p, i) => (
        <Text key={`t-${i}`}>
          {leading.length || href || i > 0 ? <Text style={styles.contactSep}> · </Text> : null}
          {p}
        </Text>
      ))}
    </Text>
  );
}

function buildStyles(template: string, accent: string) {
  const isModern = template === "Modern";
  const isMinimal = template === "Minimal";
  const isClassic = template === "Classic";

  // Per-template typography mapping (mirrors ResumePreview.tsx).
  const nameFont = isClassic ? SERIF : SANS;
  const nameWeight = isClassic ? 700 : 700; // Classic uses serif bold; others sans bold-heavy
  const headingFont = SANS;
  const bodyFont = SANS;

  return StyleSheet.create({
    page: {
      paddingTop: isModern ? 0 : 36,
      paddingBottom: 36,
      paddingHorizontal: isModern ? 0 : 40,
      fontFamily: bodyFont,
      fontSize: isModern ? 10.6 : 10.4,
      color: COLORS.text,
      lineHeight: isModern ? 1.75 : 1.8,
    },

    // ---------- HEADERS ----------
    headerModernWrap: {
      backgroundColor: accent,
      paddingVertical: 48,
      paddingHorizontal: 40,
    },
    headerModernName: { fontFamily: nameFont, fontWeight: nameWeight, fontSize: 26, color: "#fff", lineHeight: 1.15 },
    headerModernRole: { fontFamily: bodyFont, fontSize: 14, color: "#FFFFFFCC", marginTop: 4, lineHeight: 1.25 },
    headerModernContact: { fontFamily: bodyFont, fontSize: 12, color: "#FFFFFFA6", marginTop: 6, lineHeight: 1.35 },
    bodyModernPad: { paddingHorizontal: 40, paddingTop: 24, paddingBottom: 0 },

    headerMinimal: { marginBottom: 18 },
    headerMinimalName: { fontFamily: nameFont, fontWeight: nameWeight, fontSize: 26, color: COLORS.heading, lineHeight: 1.12 },
    headerMinimalAccentBar: { width: 36, height: 3, backgroundColor: accent, marginTop: 8, marginBottom: 4 },
    headerMinimalRole: { fontFamily: bodyFont, fontSize: 13, color: accent, marginTop: 4, lineHeight: 1.25 },
    headerMinimalContact: { fontFamily: bodyFont, fontSize: 11, color: COLORS.muted, marginTop: 6, lineHeight: 1.35 },
    minimalDivider: { height: 1, backgroundColor: COLORS.border, marginTop: 16 },

    headerClassic: { textAlign: "center", marginBottom: 15 },
    headerClassicName: {
      fontFamily: nameFont,
      fontWeight: nameWeight,
      fontSize: 25,
      color: COLORS.heading,
      textTransform: "uppercase",
      letterSpacing: 1,
      lineHeight: 1.16,
    },
    headerClassicRole: { fontFamily: bodyFont, fontSize: 13, color: accent, marginTop: 6, lineHeight: 1.25 },
    headerClassicContact: { fontFamily: bodyFont, fontSize: 11, color: COLORS.muted, marginTop: 6, lineHeight: 1.35 },
    classicDivider: { height: 2, backgroundColor: accent, marginTop: 14 },

    // ---------- SECTION LABELS ----------
    sectionWrap: { marginTop: 24 },
    sectionLabelClassic: {
      fontFamily: headingFont,
      fontWeight: 700,
      fontSize: 10,
      color: accent,
      textTransform: "uppercase",
      letterSpacing: 1.6,
      paddingBottom: 5,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
      marginBottom: 12,
    },
    sectionLabelRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 12,
    },
    sectionAccentBar: { width: 3, height: 20, backgroundColor: accent, marginRight: isModern ? 12 : 10 },
    sectionLabelText: { fontFamily: headingFont, fontWeight: 700, fontSize: isModern ? 13 : 12, color: COLORS.heading },

    // ---------- BODY ----------
    summary: { fontFamily: bodyFont, fontSize: isModern ? 11.1 : 10.7, color: COLORS.text, lineHeight: isModern ? 1.75 : 1.8 },

    bulletRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 4, paddingRight: 2, width: "100%" },
    bulletMarker: { width: isModern ? 13 : 14, flexShrink: 0, alignItems: "flex-start" },
    bulletDot: { width: isModern ? 13 : 14, fontSize: isModern ? 13 : 12.5, color: COLORS.muted, lineHeight: isModern ? 1.75 : 1.8 },
    bulletShape: { width: isModern ? 5 : 6, height: isModern ? 5 : 6, marginTop: isModern ? 8.8 : 8.25, backgroundColor: accent, borderRadius: isModern ? 1 : 3 },
    bulletText: { flex: 1, flexShrink: 1, fontFamily: bodyFont, fontSize: isModern ? 13 : 12.5, color: COLORS.text, lineHeight: isModern ? 1.75 : 1.8 },

    expBlock: { marginBottom: 20 },
    expHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 },
    expHeaderMain: { flex: 1, paddingRight: 12 },
    expTitle: { fontFamily: headingFont, fontWeight: 700, fontSize: 12.2, color: COLORS.heading, lineHeight: 1.3 },
    expCompany: {
      fontFamily: bodyFont,
      fontWeight: isMinimal ? 700 : 400,
      fontSize: 10.8,
      color: isMinimal ? COLORS.heading : accent,
      marginTop: 2,
      lineHeight: 1.35,
    },
    expCompanyMuted: { color: COLORS.muted, fontWeight: 400 },
    expDates: {
      fontFamily: bodyFont,
      fontSize: 10.2,
      color: COLORS.muted,
      fontStyle: isMinimal ? "italic" : "normal",
      width: 122,
      textAlign: "right",
      lineHeight: 1.3,
    },
    expBulletList: { marginTop: 7 },

    eduRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8, alignItems: "flex-start" },
    eduMain: { flex: 1, paddingRight: 12 },
    eduDegree: { fontFamily: headingFont, fontWeight: 700, fontSize: 11.8, color: COLORS.heading, lineHeight: 1.35 },
    eduSchool: { fontFamily: bodyFont, fontSize: 10.2, color: COLORS.muted, marginTop: 2, lineHeight: 1.35 },
    eduYear: { fontFamily: bodyFont, fontSize: 10.2, color: COLORS.muted, width: 74, textAlign: "right", lineHeight: 1.3 },

    certRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      paddingVertical: 7,
      borderBottomWidth: isModern ? 0 : 0.5,
      borderBottomStyle: "dashed",
      borderBottomColor: COLORS.border,
    },
    certMain: { flex: 1, paddingRight: 12 },
    certName: { fontFamily: headingFont, fontWeight: 700, fontSize: 11.8, color: COLORS.heading, lineHeight: 1.35 },
    certIssuer: { fontFamily: bodyFont, fontSize: 10.2, color: COLORS.muted, marginTop: 2, lineHeight: 1.35 },
    certYear: { fontFamily: bodyFont, fontSize: 10.2, color: COLORS.muted, width: 74, textAlign: "right", lineHeight: 1.3 },

    skillsWrap: { flexDirection: "row", flexWrap: "wrap" },
    skillChip: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 20,
      marginRight: 6,
      marginBottom: 6,
    },
    skillChipText: {
      fontFamily: bodyFont,
      fontWeight: 500,
      fontSize: 11,
      lineHeight: 1.25,
    },
    skillTechAccent: {
      backgroundColor: `${accent}1F`,
      borderWidth: 0.5,
      borderColor: `${accent}55`,
    },
    skillTechAccentText: { color: accent },
    skillTechMinimal: {
      backgroundColor: "#fff",
      borderWidth: 0.5,
      borderColor: COLORS.border,
    },
    skillTechMinimalText: { color: COLORS.heading },
    skillSoft: {
      backgroundColor: COLORS.softBg,
      borderWidth: 0.5,
      borderColor: COLORS.border,
    },
    skillSoftText: { color: COLORS.heading },

    // ---------- CONTACT LINE (shared) ----------
    contactLine: {
      fontFamily: bodyFont,
      fontSize: 10.8,
      lineHeight: 1.35,
      textAlign: isClassic ? "center" : "left",
    },
    contactSep: { color: COLORS.muted },
    contactLink: {
      fontSize: 9.2,
      textDecoration: "none",
    },

    _meta: { isModern, isMinimal, isClassic } as any,
  });
}

// ATS PDF — uses Helvetica (built-in, metrically identical to Arial) so it
// renders reliably in any PDF reader and ATS parser. Spacing constants are
// mirrored 1:1 from ResumePreview.tsx (Classic template) so margins, line
// heights, and section gaps match the on-screen preview exactly.
const ATS_FONT = "Helvetica"; // Arial-equivalent, built into all PDF readers

function buildAtsStyles() {
  return StyleSheet.create({
    // Mirrors preview: padding "36px 40px", body 12.5 / lineHeight 1.8, color #3D4A5C
    page: {
      paddingTop: 36,
      paddingBottom: 36,
      paddingHorizontal: 40,
      fontFamily: ATS_FONT,
      fontSize: 12.5,
      color: COLORS.text,
      lineHeight: 1.8,
    },
    // Header — matches Classic preview: centered, 26px name, 14px role, 12px contact, 16px bottom margin
    header: { marginBottom: 16, textAlign: "center" },
    name: { fontFamily: ATS_FONT, fontWeight: 700, fontSize: 26, lineHeight: 1.16, color: COLORS.heading, textTransform: "uppercase", letterSpacing: 1 },
    role: { fontFamily: ATS_FONT, fontSize: 14, marginTop: 6, color: COLORS.text, lineHeight: 1.25 },
    contactLine: { fontFamily: ATS_FONT, fontSize: 12, marginTop: 6, color: COLORS.muted, lineHeight: 1.35, textAlign: "center" },
    contactSep: { color: COLORS.muted },
    contactLink: { fontFamily: ATS_FONT, fontSize: 12, color: COLORS.text, textDecoration: "none" },
    // Section label — preview SectionLabel: mt-6 (24px), mb-3 (12px), 11px uppercase, 1px bottom border
    section: { marginTop: 24 },
    sectionTitle: {
      fontFamily: ATS_FONT,
      fontWeight: 700,
      fontSize: 11,
      color: COLORS.heading,
      textTransform: "uppercase",
      letterSpacing: 1.6,
      paddingBottom: 6,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
      marginBottom: 12,
    },
    paragraph: { fontFamily: ATS_FONT, fontSize: 12.5, color: COLORS.text, lineHeight: 1.8 },
    // Experience — preview: space-y-5 (20px gap), title 13/700, company 12, dates 11
    item: { marginBottom: 20 },
    row: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 },
    main: { flex: 1, paddingRight: 12 },
    title: { fontFamily: ATS_FONT, fontWeight: 700, fontSize: 13, color: COLORS.heading, lineHeight: 1.35 },
    muted: { fontFamily: ATS_FONT, fontSize: 12, color: COLORS.muted, marginTop: 2, lineHeight: 1.4 },
    dates: { fontFamily: ATS_FONT, width: 122, textAlign: "right", fontSize: 11, color: COLORS.muted, lineHeight: 1.3 },
    // Bullets — preview: 12.5 body, lineHeight 1.8, marginBottom ~4
    bullet: { flexDirection: "row", alignItems: "flex-start", marginBottom: 4, marginTop: 2, width: "100%" },
    bulletMark: { width: 14, flexShrink: 0, fontFamily: ATS_FONT, fontSize: 12.5, lineHeight: 1.8, color: COLORS.text },
    bulletText: { flex: 1, flexShrink: 1, fontFamily: ATS_FONT, fontSize: 12.5, lineHeight: 1.8, color: COLORS.text },
    skills: { fontFamily: ATS_FONT, fontSize: 12.5, lineHeight: 1.8, color: COLORS.text },
  });
}

function AtsPdfDocument({ data, targetRole }: Pick<Props, "data" | "targetRole">) {
  const styles = buildAtsStyles();
  const name = cleanText(data.name) || "Your Name";
  const jobTitle = cleanText(data.jobTitle) || cleanText(targetRole) || "Professional";
  const skills = [...(data.technicalSkills || []), ...(data.softSkills || [])].map(cleanText).filter(Boolean);

  return (
    <Document title={`${name} — ATS Resume`} author={name}>
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.header} wrap={false}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.role}>{jobTitle}</Text>
          <ContactLine data={data} styles={styles} linkColor={COLORS.text} />
        </View>

        {data.summary ? (
          <View style={styles.section} minPresenceAhead={36}>
            <Text style={styles.sectionTitle}>Professional Summary</Text>
            <Text style={styles.paragraph}>{cleanText(data.summary)}</Text>
          </View>
        ) : null}

        {data.achievements?.length ? (
          <View style={styles.section} minPresenceAhead={44}>
            <Text style={styles.sectionTitle}>Key Achievements</Text>
            {data.achievements.map((a, i) => (
              <View key={i} style={styles.bullet}>
                <Text style={styles.bulletMark}>•</Text>
                <Text style={styles.bulletText}>{cleanText(a)}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {data.experience?.length ? (
          <View style={styles.section} minPresenceAhead={52}>
            <Text style={styles.sectionTitle}>Work Experience</Text>
            {data.experience.map((exp, i) => (
              <View key={i} style={styles.item} minPresenceAhead={58}>
                <View style={styles.row} wrap={false}>
                  <View style={styles.main}>
                    <Text style={styles.title}>{cleanText(exp.title)}</Text>
                    <Text style={styles.muted}>{joinClean([exp.company, exp.location])}</Text>
                  </View>
                  <Text style={styles.dates}>{joinClean([exp.startDate, exp.endDate], " – ")}</Text>
                </View>
                {exp.bullets?.map((b, j) => (
                  <View key={j} style={styles.bullet}>
                    <Text style={styles.bulletMark}>•</Text>
                    <Text style={styles.bulletText}>{cleanText(b)}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        ) : null}

        {data.education?.length ? (
          <View style={styles.section} minPresenceAhead={40}>
            <Text style={styles.sectionTitle}>Education</Text>
            {data.education.map((ed, i) => (
              <View key={i} style={styles.row} wrap={false}>
                <View style={styles.main}>
                  <Text style={styles.title}>{joinClean([ed.degree, ed.field])}</Text>
                  <Text style={styles.muted}>{joinClean([ed.school, ed.honours])}</Text>
                </View>
                <Text style={styles.dates}>{cleanText(ed.year)}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {data.certifications?.length ? (
          <View style={styles.section} minPresenceAhead={40}>
            <Text style={styles.sectionTitle}>Certifications</Text>
            {data.certifications.map((c, i) => (
              <View key={i} style={styles.row} wrap={false}>
                <View style={styles.main}>
                  <Text style={styles.title}>{cleanText(c.name)}</Text>
                  <Text style={styles.muted}>{cleanText(c.issuer)}</Text>
                </View>
                <Text style={styles.dates}>{cleanText(c.year)}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {skills.length ? (
          <View style={styles.section} minPresenceAhead={32}>
            <Text style={styles.sectionTitle}>Core Skills</Text>
            <Text style={styles.skills}>{skills.join(", ")}</Text>
          </View>
        ) : null}
      </Page>
    </Document>
  );
}

function SectionLabel({ title, styles }: { title: string; styles: any }) {
  const meta = styles._meta;
  if (meta.isClassic)
    return (
      <Text style={styles.sectionLabelClassic} minPresenceAhead={40}>
        {title}
      </Text>
    );
  return (
    <View style={styles.sectionLabelRow} wrap={false} minPresenceAhead={40}>
      <View style={styles.sectionAccentBar} />
      <Text style={styles.sectionLabelText}>{title}</Text>
    </View>
  );
}

function Bullet({ text, styles }: { text: string; styles: any }) {
  const meta = styles._meta;
  const symbol = meta.isMinimal ? "—" : meta.isModern ? "▪" : "•";
  const cleaned = cleanText(text);
  if (!cleaned) return null;
  return (
    <View style={styles.bulletRow}>
      <View style={styles.bulletMarker}>
        {meta.isMinimal ? <Text style={styles.bulletDot}>{symbol}</Text> : <View style={styles.bulletShape} />}
      </View>
      <Text style={styles.bulletText}>{cleaned}</Text>
    </View>
  );
}

export default function ResumePdfDocument({ data, template, targetRole, accentColor, mode = "styled" }: Props) {
  ensureFonts();
  if (mode === "ats") return <AtsPdfDocument data={data} targetRole={targetRole} />;

  const accent = accentColor || "#E0487A";
  const styles = buildStyles(template, accent);
  const meta = (styles as any)._meta;

  const name = cleanText(data.name) || "Your Name";
  const jobTitle = cleanText(data.jobTitle) || cleanText(targetRole) || "Professional";
  const hasContact =
    !!cleanText(data.city) ||
    !!cleanText(data.email) ||
    !!cleanText(data.phone) ||
    !!cleanText(data.linkedin);

  return (
    <Document title={`${name} — Resume`} author={name}>
      <Page size="A4" style={styles.page} wrap>
        {/* HEADER */}
        {meta.isModern && (
          <View style={styles.headerModernWrap} wrap={false}>
            <Text style={styles.headerModernName}>{name}</Text>
            <Text style={styles.headerModernRole}>{jobTitle}</Text>
            {hasContact ? (
              <View style={{ marginTop: 6 }}>
                <ContactLine data={data} styles={{ ...styles, contactLine: { ...styles.contactLine, color: "#FFFFFFD9", fontSize: 10.6 }, contactSep: { color: "#FFFFFF80" } }} linkColor="#FFFFFFCC" />
              </View>
            ) : null}
          </View>
        )}
        {meta.isMinimal && (
          <View style={styles.headerMinimal} wrap={false}>
            <Text style={styles.headerMinimalName}>{name}</Text>
            <View style={styles.headerMinimalAccentBar} />
            <Text style={styles.headerMinimalRole}>{jobTitle}</Text>
            {hasContact ? (
              <View style={{ marginTop: 6 }}>
                <ContactLine data={data} styles={{ ...styles, contactLine: { ...styles.contactLine, color: COLORS.muted } }} linkColor={accent} />
              </View>
            ) : null}
            <View style={styles.minimalDivider} />
          </View>
        )}
        {meta.isClassic && (
          <View style={styles.headerClassic} wrap={false}>
            <Text style={styles.headerClassicName}>{name}</Text>
            <Text style={styles.headerClassicRole}>{jobTitle}</Text>
            {hasContact ? (
              <View style={{ marginTop: 6 }}>
                <ContactLine data={data} styles={{ ...styles, contactLine: { ...styles.contactLine, color: COLORS.muted, textAlign: "center" } }} linkColor={accent} />
              </View>
            ) : null}
            <View style={styles.classicDivider} />
          </View>
        )}

        <View style={meta.isModern ? styles.bodyModernPad : undefined}>
          {/* SUMMARY */}
          {data.summary ? (
            <View style={styles.sectionWrap}>
              <SectionLabel title="Professional Summary" styles={styles} />
              <Text style={styles.summary}>{cleanText(data.summary)}</Text>
            </View>
          ) : null}

          {/* KEY ACHIEVEMENTS */}
          {data.achievements && data.achievements.length > 0 && (
            <View style={styles.sectionWrap}>
              <SectionLabel title="Key Achievements" styles={styles} />
              {data.achievements.map((a, i) => <Bullet key={i} text={a} styles={styles} />)}
            </View>
          )}

          {/* WORK EXPERIENCE */}
          {data.experience && data.experience.length > 0 && (
            <View style={styles.sectionWrap}>
              <SectionLabel title="Work Experience" styles={styles} />
              {data.experience.map((exp, i) => (
                <View key={i} style={styles.expBlock} wrap={true} minPresenceAhead={68}>
                  <View style={styles.expHeaderRow} wrap={false}>
                    <View style={styles.expHeaderMain}>
                      <Text style={styles.expTitle}>{cleanText(exp.title)}</Text>
                      <Text style={styles.expCompany}>
                        {cleanText(exp.company)}
                        {cleanText(exp.location) ? <Text style={styles.expCompanyMuted}> · {cleanText(exp.location)}</Text> : null}
                      </Text>
                    </View>
                    <Text style={styles.expDates}>
                      {joinClean([exp.startDate, exp.endDate], " – ")}
                    </Text>
                  </View>
                  <View style={styles.expBulletList}>
                    {exp.bullets?.map((b, j) => <Bullet key={j} text={b} styles={styles} />)}
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* EDUCATION */}
          {data.education && data.education.length > 0 && (
            <View style={styles.sectionWrap}>
              <SectionLabel title="Education" styles={styles} />
              {data.education.map((ed, i) => (
                <View key={i} style={styles.eduRow} wrap={false}>
                  <View style={styles.eduMain}>
                    <Text style={styles.eduDegree}>
                      {joinClean([ed.degree, ed.field])}
                    </Text>
                    <Text style={styles.eduSchool}>
                      {joinClean([ed.school, ed.honours])}
                    </Text>
                  </View>
                  <Text style={styles.eduYear}>{cleanText(ed.year)}</Text>
                </View>
              ))}
            </View>
          )}

          {/* CERTIFICATIONS */}
          {data.certifications && data.certifications.length > 0 && (
            <View style={styles.sectionWrap}>
              <SectionLabel title="Certifications" styles={styles} />
              {data.certifications.map((c, i) => (
                <View key={i} style={styles.certRow} wrap={false}>
                  <View style={styles.certMain}>
                    <Text style={styles.certName}>{cleanText(c.name)}</Text>
                    <Text style={styles.certIssuer}>{cleanText(c.issuer)}</Text>
                  </View>
                  <Text style={styles.certYear}>{cleanText(c.year)}</Text>
                </View>
              ))}
            </View>
          )}

          {/* SKILLS */}
          {((data.technicalSkills?.length || 0) + (data.softSkills?.length || 0)) > 0 && (
            <View style={styles.sectionWrap}>
              <SectionLabel title="Core Skills" styles={styles} />
              <View style={styles.skillsWrap}>
                {data.technicalSkills?.map((s, i) => (
                  <View
                    key={`t-${i}`}
                    wrap={false}
                    style={[styles.skillChip, meta.isMinimal ? styles.skillTechMinimal : styles.skillTechAccent]}
                  >
                    <Text style={[styles.skillChipText, meta.isMinimal ? styles.skillTechMinimalText : styles.skillTechAccentText]}>{cleanText(s)}</Text>
                  </View>
                ))}
                {data.softSkills?.map((s, i) => (
                  <View key={`s-${i}`} wrap={false} style={[styles.skillChip, styles.skillSoft]}>
                    <Text style={[styles.skillChipText, styles.skillSoftText]}>{cleanText(s)}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </Page>
    </Document>
  );
}
