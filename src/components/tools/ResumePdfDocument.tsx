import React from "react";
import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";
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
}

const COLORS = {
  text: "#3D4A5C",
  muted: "#8896A8",
  heading: "#0F1724",
  border: "#EBE6E2",
  softBg: "#F5F7FA",
};

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
      fontSize: 11,
      color: COLORS.text,
      lineHeight: 1.55,
    },

    // ---------- HEADERS ----------
    headerModernWrap: {
      backgroundColor: accent,
      paddingVertical: 36,
      paddingHorizontal: 40,
    },
    headerModernName: { fontFamily: nameFont, fontWeight: nameWeight, fontSize: 24, color: "#fff", letterSpacing: -0.3 },
    headerModernRole: { fontFamily: bodyFont, fontSize: 12, color: "#FFFFFFCC", marginTop: 4 },
    headerModernContact: { fontFamily: bodyFont, fontSize: 10, color: "#FFFFFFA6", marginTop: 6 },
    bodyModernPad: { paddingHorizontal: 40, paddingTop: 18, paddingBottom: 0 },

    headerMinimal: { marginBottom: 14 },
    headerMinimalName: { fontFamily: nameFont, fontWeight: nameWeight, fontSize: 24, color: COLORS.heading },
    headerMinimalAccentBar: { width: 36, height: 3, backgroundColor: accent, marginTop: 8, marginBottom: 4 },
    headerMinimalRole: { fontFamily: bodyFont, fontSize: 12, color: accent, marginTop: 4 },
    headerMinimalContact: { fontFamily: bodyFont, fontSize: 10, color: COLORS.muted, marginTop: 6 },
    minimalDivider: { height: 1, backgroundColor: COLORS.border, marginTop: 12 },

    headerClassic: { textAlign: "center", marginBottom: 12 },
    headerClassicName: {
      fontFamily: nameFont,
      fontWeight: nameWeight,
      fontSize: 24,
      color: COLORS.heading,
      textTransform: "uppercase",
      letterSpacing: 1.4,
    },
    headerClassicRole: { fontFamily: bodyFont, fontSize: 12, color: accent, marginTop: 6 },
    headerClassicContact: { fontFamily: bodyFont, fontSize: 10, color: COLORS.muted, marginTop: 5 },
    classicDivider: { height: 1.5, backgroundColor: accent, marginTop: 12 },

    // ---------- SECTION LABELS ----------
    sectionWrap: { marginTop: 18 },
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
      marginBottom: 10,
    },
    sectionLabelRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 10,
    },
    sectionAccentBar: { width: 3, height: 14, backgroundColor: accent, marginRight: 10 },
    sectionLabelText: { fontFamily: headingFont, fontWeight: 700, fontSize: 12, color: COLORS.heading },

    // ---------- BODY ----------
    summary: { fontFamily: bodyFont, fontSize: 11, color: COLORS.text, lineHeight: 1.6 },

    bulletRow: { flexDirection: "row", marginBottom: 4, paddingRight: 4 },
    bulletDot: { width: 12, fontSize: 11, color: isMinimal ? COLORS.muted : accent, lineHeight: 1.6 },
    bulletText: { flex: 1, fontFamily: bodyFont, fontSize: 11, color: COLORS.text, lineHeight: 1.6 },

    expBlock: { marginBottom: 12 },
    expHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 },
    expTitle: { fontFamily: headingFont, fontWeight: 700, fontSize: 12, color: COLORS.heading },
    expCompany: {
      fontFamily: bodyFont,
      fontWeight: isMinimal ? 700 : 400,
      fontSize: 11,
      color: isMinimal ? COLORS.heading : accent,
      marginTop: 2,
    },
    expCompanyMuted: { color: COLORS.muted, fontWeight: 400 },
    expDates: {
      fontFamily: bodyFont,
      fontSize: 10,
      color: COLORS.muted,
      fontStyle: isMinimal ? "italic" : "normal",
    },
    expBulletList: { marginTop: 4 },

    eduRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6, alignItems: "flex-start" },
    eduMain: { flex: 1, paddingRight: 8 },
    eduDegree: { fontFamily: headingFont, fontWeight: 700, fontSize: 11, color: COLORS.heading },
    eduSchool: { fontFamily: bodyFont, fontSize: 10, color: COLORS.muted, marginTop: 2 },
    eduYear: { fontFamily: bodyFont, fontSize: 10, color: COLORS.muted },

    certRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      paddingVertical: 5,
      borderBottomWidth: isModern ? 0 : 0.5,
      borderBottomStyle: "dashed",
      borderBottomColor: COLORS.border,
    },
    certName: { fontFamily: headingFont, fontWeight: 700, fontSize: 11, color: COLORS.heading },
    certIssuer: { fontFamily: bodyFont, fontSize: 10, color: COLORS.muted, marginTop: 2 },
    certYear: { fontFamily: bodyFont, fontSize: 10, color: COLORS.muted },

    skillsWrap: { flexDirection: "row", flexWrap: "wrap" },
    skillChip: {
      fontFamily: bodyFont,
      fontWeight: 500,
      paddingHorizontal: 9,
      paddingVertical: 3,
      borderRadius: 12,
      fontSize: 10,
      marginRight: 5,
      marginBottom: 5,
    },
    skillTechAccent: {
      backgroundColor: `${accent}1F`,
      color: accent,
      borderWidth: 0.5,
      borderColor: `${accent}55`,
    },
    skillTechMinimal: {
      backgroundColor: "#fff",
      color: COLORS.heading,
      borderWidth: 0.5,
      borderColor: COLORS.border,
    },
    skillSoft: {
      backgroundColor: COLORS.softBg,
      color: COLORS.heading,
      borderWidth: 0.5,
      borderColor: COLORS.border,
    },

    _meta: { isModern, isMinimal, isClassic } as any,
  });
}

function SectionLabel({ title, styles }: { title: string; styles: any }) {
  const meta = styles._meta;
  if (meta.isClassic) return <Text style={styles.sectionLabelClassic}>{title}</Text>;
  return (
    <View style={styles.sectionLabelRow}>
      <View style={styles.sectionAccentBar} />
      <Text style={styles.sectionLabelText}>{title}</Text>
    </View>
  );
}

function Bullet({ text, styles }: { text: string; styles: any }) {
  const meta = styles._meta;
  const symbol = meta.isMinimal ? "—" : meta.isModern ? "▪" : "•";
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bulletDot}>{symbol}</Text>
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

export default function ResumePdfDocument({ data, template, targetRole, accentColor }: Props) {
  ensureFonts();
  const accent = accentColor || "#E0487A";
  const styles = buildStyles(template, accent);
  const meta = (styles as any)._meta;

  const name = data.name || "Your Name";
  const jobTitle = data.jobTitle || targetRole || "Professional";
  const contact = [data.city, data.email, data.linkedin, data.phone].filter(Boolean).join("  ·  ");

  return (
    <Document title={`${name} — Resume`} author={name}>
      <Page size="A4" style={styles.page} wrap>
        {/* HEADER */}
        {meta.isModern && (
          <View style={styles.headerModernWrap}>
            <Text style={styles.headerModernName}>{name}</Text>
            <Text style={styles.headerModernRole}>{jobTitle}</Text>
            {contact ? <Text style={styles.headerModernContact}>{contact}</Text> : null}
          </View>
        )}
        {meta.isMinimal && (
          <View style={styles.headerMinimal}>
            <Text style={styles.headerMinimalName}>{name}</Text>
            <View style={styles.headerMinimalAccentBar} />
            <Text style={styles.headerMinimalRole}>{jobTitle}</Text>
            {contact ? <Text style={styles.headerMinimalContact}>{contact}</Text> : null}
            <View style={styles.minimalDivider} />
          </View>
        )}
        {meta.isClassic && (
          <View style={styles.headerClassic}>
            <Text style={styles.headerClassicName}>{name}</Text>
            <Text style={styles.headerClassicRole}>{jobTitle}</Text>
            {contact ? <Text style={styles.headerClassicContact}>{contact}</Text> : null}
            <View style={styles.classicDivider} />
          </View>
        )}

        <View style={meta.isModern ? styles.bodyModernPad : undefined}>
          {/* SUMMARY */}
          {data.summary ? (
            <View style={styles.sectionWrap}>
              <SectionLabel title="Professional Summary" styles={styles} />
              <Text style={styles.summary}>{data.summary}</Text>
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
                <View key={i} style={styles.expBlock} wrap={true}>
                  <View style={styles.expHeaderRow}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={styles.expTitle}>{exp.title}</Text>
                      <Text style={styles.expCompany}>
                        {exp.company}
                        {exp.location ? <Text style={styles.expCompanyMuted}> · {exp.location}</Text> : null}
                      </Text>
                    </View>
                    <Text style={styles.expDates}>
                      {exp.startDate} – {exp.endDate}
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
                <View key={i} style={styles.eduRow}>
                  <View style={styles.eduMain}>
                    <Text style={styles.eduDegree}>
                      {ed.degree || ""}{ed.field ? ` · ${ed.field}` : ""}
                    </Text>
                    <Text style={styles.eduSchool}>
                      {ed.school || ""}{ed.honours ? ` · ${ed.honours}` : ""}
                    </Text>
                  </View>
                  <Text style={styles.eduYear}>{ed.year || ""}</Text>
                </View>
              ))}
            </View>
          )}

          {/* CERTIFICATIONS */}
          {data.certifications && data.certifications.length > 0 && (
            <View style={styles.sectionWrap}>
              <SectionLabel title="Certifications" styles={styles} />
              {data.certifications.map((c, i) => (
                <View key={i} style={styles.certRow}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.certName}>{c.name}</Text>
                    <Text style={styles.certIssuer}>{c.issuer}</Text>
                  </View>
                  <Text style={styles.certYear}>{c.year}</Text>
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
                  <Text
                    key={`t-${i}`}
                    style={[
                      styles.skillChip,
                      meta.isMinimal ? styles.skillTechMinimal : styles.skillTechAccent,
                    ]}
                  >
                    {s}
                  </Text>
                ))}
                {data.softSkills?.map((s, i) => (
                  <Text key={`s-${i}`} style={[styles.skillChip, styles.skillSoft]}>
                    {s}
                  </Text>
                ))}
              </View>
            </View>
          )}
        </View>
      </Page>
    </Document>
  );
}
