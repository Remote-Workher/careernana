import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { ResumeData } from "./ResumePreview";

// Use @react-pdf/renderer built-in fonts (Helvetica + Times-Roman) to avoid
// network font-fetching failures that would crash pdf generation.
const SANS = "Helvetica";
const SERIF = "Times-Roman";

interface Props {
  data: ResumeData;
  template: "Classic" | "Modern" | "Minimal" | string;
  targetRole: string;
  accentColor?: string;
}

const COLORS = {
  text: "#1F2937",
  muted: "#6B7280",
  heading: "#0F1724",
  border: "#E5E7EB",
};

function buildStyles(template: string, accent: string) {
  const isModern = template === "Modern";
  const isMinimal = template === "Minimal";
  const isClassic = template === "Classic";

  return StyleSheet.create({
    page: {
      paddingTop: isModern ? 0 : 36,
      paddingBottom: 36,
      paddingHorizontal: isModern ? 0 : 40,
      fontFamily: SANS,
      fontSize: 10,
      color: COLORS.text,
      lineHeight: 1.5,
    },
    headerModern: {
      backgroundColor: accent,
      paddingVertical: 28,
      paddingHorizontal: 40,
      marginBottom: 18,
    },
    headerModernName: { fontSize: 22, fontWeight: 800, color: "#fff" },
    headerModernRole: { fontSize: 11, color: "rgba(255,255,255,0.85)", marginTop: 3 },
    headerModernContact: { fontSize: 9, color: "rgba(255,255,255,0.75)", marginTop: 6 },
    bodyModernPad: { paddingHorizontal: 40 },

    headerMinimal: { marginBottom: 14 },
    headerMinimalName: { fontSize: 22, fontWeight: 800, color: COLORS.heading },
    headerMinimalAccentBar: { width: 32, height: 2.5, backgroundColor: accent, marginTop: 6, marginBottom: 4 },
    headerMinimalRole: { fontSize: 11, color: accent, marginTop: 3 },
    headerMinimalContact: { fontSize: 9, color: COLORS.muted, marginTop: 5 },
    minimalDivider: { height: 1, backgroundColor: COLORS.border, marginTop: 12 },

    headerClassic: { textAlign: "center", marginBottom: 12 },
    headerClassicName: {
      fontFamily: "Lora",
      fontSize: 22,
      fontWeight: 700,
      color: COLORS.heading,
      textTransform: "uppercase",
      letterSpacing: 1,
    },
    headerClassicRole: { fontSize: 11, color: accent, marginTop: 4 },
    headerClassicContact: { fontSize: 9, color: COLORS.muted, marginTop: 4 },
    classicDivider: { height: 1.5, backgroundColor: accent, marginTop: 10 },

    sectionWrap: { marginTop: 14 },
    sectionLabelClassic: {
      fontSize: 9,
      fontWeight: 700,
      color: accent,
      textTransform: "uppercase",
      letterSpacing: 1.4,
      paddingBottom: 4,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
      marginBottom: 8,
    },
    sectionLabelModern: {
      fontSize: 11,
      fontWeight: 800,
      color: COLORS.heading,
      marginBottom: 8,
      paddingLeft: 8,
      borderLeftWidth: 2.5,
      borderLeftColor: accent,
    },
    sectionLabelMinimal: {
      fontSize: 10,
      fontWeight: 800,
      color: COLORS.heading,
      marginBottom: 8,
      paddingLeft: 8,
      borderLeftWidth: 2.5,
      borderLeftColor: accent,
    },

    summary: { fontSize: 10, color: COLORS.text, lineHeight: 1.55 },

    bulletRow: { flexDirection: "row", marginBottom: 3 },
    bulletDot: { width: 10, fontSize: 10, color: isMinimal ? COLORS.muted : accent },
    bulletText: { flex: 1, fontSize: 10, color: COLORS.text, lineHeight: 1.5 },

    expBlock: { marginBottom: 10 },
    expHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
    expTitle: { fontSize: 11, fontWeight: 700, color: COLORS.heading },
    expCompany: { fontSize: 10, color: isMinimal ? COLORS.heading : accent, fontWeight: isMinimal ? 700 : 400, marginTop: 1 },
    expCompanyMuted: { color: COLORS.muted, fontWeight: 400 },
    expDates: { fontSize: 9, color: COLORS.muted, fontStyle: isMinimal ? "italic" : "normal" },
    expBulletList: { marginTop: 4 },

    eduRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
    eduMain: { flex: 1, paddingRight: 8 },
    eduDegree: { fontSize: 10.5, fontWeight: 700, color: COLORS.heading },
    eduSchool: { fontSize: 9, color: COLORS.muted, marginTop: 1 },
    eduYear: { fontSize: 9, color: COLORS.muted },

    certRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 4,
      borderBottomWidth: isModern ? 0 : 0.5,
      borderBottomStyle: "dashed",
      borderBottomColor: COLORS.border,
    },
    certName: { fontSize: 10.5, fontWeight: 700, color: COLORS.heading },
    certIssuer: { fontSize: 9, color: COLORS.muted, marginTop: 1 },
    certYear: { fontSize: 9, color: COLORS.muted },

    skillsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
    skillChip: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 10,
      fontSize: 9,
      fontWeight: 500,
      marginRight: 4,
      marginBottom: 4,
    },
    skillTechModern: {
      backgroundColor: `${accent}22`,
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
      backgroundColor: "#F5F7FA",
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
  if (meta.isModern) return <Text style={styles.sectionLabelModern}>{title}</Text>;
  return <Text style={styles.sectionLabelMinimal}>{title}</Text>;
}

function Bullet({ text, styles }: { text: string; styles: any }) {
  const meta = styles._meta;
  const symbol = meta.isMinimal ? "—" : meta.isModern ? "▪" : "•";
  return (
    <View style={styles.bulletRow} wrap={false}>
      <Text style={styles.bulletDot}>{symbol}</Text>
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

export default function ResumePdfDocument({ data, template, targetRole, accentColor }: Props) {
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
          <View style={styles.headerModern} fixed={false}>
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
            <View style={styles.sectionWrap} wrap={false}>
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
                  <View style={styles.expHeaderRow} wrap={false}>
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
                <View key={i} style={styles.eduRow} wrap={false}>
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
                <View key={i} style={styles.certRow} wrap={false}>
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
            <View style={styles.sectionWrap} wrap={false}>
              <SectionLabel title="Core Skills" styles={styles} />
              <View style={styles.skillsWrap}>
                {data.technicalSkills?.map((s, i) => (
                  <Text
                    key={`t-${i}`}
                    style={[
                      styles.skillChip,
                      meta.isMinimal ? styles.skillTechMinimal : styles.skillTechModern,
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
