const STOPWORDS = new Set([
  "about", "after", "again", "against", "also", "and", "are", "because", "been", "being", "between",
  "both", "can", "did", "does", "each", "for", "from", "have", "her", "him", "his", "into", "its",
  "job", "more", "must", "not", "our", "out", "over", "own", "role", "she", "such", "than", "that",
  "the", "their", "them", "then", "there", "these", "they", "this", "through", "to", "with", "will",
  "work", "you", "your",
]);

const ACTION_VERBS = [
  "achieved", "built", "coordinated", "created", "delivered", "designed", "developed", "directed",
  "drove", "generated", "grew", "implemented", "improved", "increased", "launched", "led", "managed",
  "negotiated", "optimized", "reduced", "scaled", "spearheaded", "streamlined", "supervised",
];

const WEAK_PHRASES = ["helped", "assisted", "responsible for", "worked on", "participated in", "supported"];

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, Math.round(value)));

type JsonRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is JsonRecord => typeof value === "object" && value !== null && !Array.isArray(value);
const readString = (record: JsonRecord, key: string) => typeof record[key] === "string" ? record[key] : "";
const readStringArray = (record: JsonRecord, key: string) => Array.isArray(record[key]) ? (record[key] as unknown[]).filter((v): v is string => typeof v === "string") : [];
const readObjectArray = (record: JsonRecord, key: string) => Array.isArray(record[key]) ? (record[key] as unknown[]).filter(isRecord) : [];

export function parseAtsScoreContent(content?: string | null): number | null {
  if (!content) return null;
  try {
    const cleaned = content.replace(/```json\n?|```/g, "").trim();
    const parsed: unknown = JSON.parse(cleaned);
    if (!isRecord(parsed)) return null;
    const direct = parsed.total ?? parsed.score ?? parsed.ats_score;
    if (typeof direct === "number" && Number.isFinite(direct)) return clamp(direct);
    if (Array.isArray(parsed.categories)) {
      const sum = parsed.categories.reduce((acc: number, item) => {
        if (!isRecord(item)) return acc;
        return acc + (Number(item.score) || 0);
      }, 0);
      if (sum > 0) return clamp(sum);
    }
  } catch {
    return null;
  }
  return null;
}

function keywordScore(text: string, jobDescription?: string): number {
  const lower = text.toLowerCase();
  const source = (jobDescription || "remote global communication stakeholder project operations analytics growth sales support design product marketing software finance customer").toLowerCase();
  const keywords = [...new Set(source.replace(/[^a-z\s]/g, " ").split(/\s+/).filter((w) => w.length > 3 && !STOPWORDS.has(w)))].slice(0, 35);
  if (!keywords.length) return 0;
  const matches = keywords.filter((word) => lower.includes(word)).length;
  return (matches / keywords.length) * (jobDescription ? 24 : 12);
}

export function estimateResumeScoreFromText(resumeText: string, jobDescription?: string): number {
  const text = (resumeText || "").trim();
  const lower = text.toLowerCase();
  const words = text.split(/\s+/).filter(Boolean).length;
  let score = 0;

  score += words < 120 ? 6 : words < 300 ? 12 : words <= 900 ? 16 : 13;

  const sectionSignals = [
    /summary|profile|objective/i,
    /experience|employment|work history/i,
    /education|degree|university|college/i,
    /skills|competencies|tools|technologies/i,
    /certification|certificate|training/i,
    /achievement|award|project|leadership|volunteer/i,
  ];
  score += Math.min(sectionSignals.filter((re) => re.test(text)).length * 3, 18);

  const metricCount = (text.match(/\d+%|\d+x|₦[\d,]+|\$[\d,]+|\d+\s?(users|clients|customers|team|people|months|weeks|days|projects|campaigns|leads|revenue)/gi) || []).length;
  score += Math.min(metricCount * 3, 14);

  const verbHits = ACTION_VERBS.filter((verb) => new RegExp(`\\b${verb}\\b`, "i").test(text)).length;
  score += Math.min(verbHits * 2, 12);

  score += keywordScore(text, jobDescription);

  const contactSignals = [/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i, /\+?\d[\d\s().-]{7,}/, /linkedin\.com|linkedin/i, /lagos|abuja|nigeria|remote|hybrid|onsite/i];
  score += contactSignals.filter((re) => re.test(text)).length * 2;

  const bulletCount = (text.match(/(^|\n)\s*[-•]/g) || []).length;
  const dateSignals = (text.match(/\b(20\d{2}|19\d{2}|present|current)\b/gi) || []).length;
  score += Math.min(bulletCount, 5) + Math.min(dateSignals, 3);

  const weakPenalty = WEAK_PHRASES.filter((phrase) => lower.includes(phrase)).length * 2;
  score -= Math.min(weakPenalty, 10);

  return clamp(score, 22, 96);
}

export function resumeDataToText(resume: unknown): string {
  if (!isRecord(resume)) return "";
  const parts = [
    readString(resume, "name"),
    readString(resume, "email"),
    readString(resume, "phone"),
    readString(resume, "city"),
    readString(resume, "linkedin"),
    readString(resume, "jobTitle"),
    readString(resume, "summary"),
    readString(resume, "executiveProfile"),
    ...readStringArray(resume, "achievements"),
    ...readStringArray(resume, "keyAchievements"),
    ...readStringArray(resume, "technicalSkills"),
    ...readStringArray(resume, "softSkills"),
    ...readStringArray(resume, "coreCompetencies"),
    ...readStringArray(resume, "tools"),
    ...readObjectArray(resume, "experience").flatMap((e) => [readString(e, "title"), readString(e, "company"), readString(e, "location"), readString(e, "startDate"), readString(e, "endDate"), ...readStringArray(e, "bullets")]),
    ...readObjectArray(resume, "education").flatMap((e) => [readString(e, "degree"), readString(e, "field"), readString(e, "school"), readString(e, "year"), readString(e, "honours")]),
    ...readObjectArray(resume, "certifications").flatMap((c) => [readString(c, "name"), readString(c, "issuer"), readString(c, "year")]),
    ...readObjectArray(resume, "projects").flatMap((p) => [readString(p, "name"), readString(p, "date"), ...readStringArray(p, "bullets")]),
    ...readObjectArray(resume, "leadership").flatMap((p) => [readString(p, "role"), readString(p, "organization"), readString(p, "date"), ...readStringArray(p, "bullets")]),
    ...readObjectArray(resume, "volunteer").flatMap((p) => [readString(p, "role"), readString(p, "organization"), readString(p, "date"), ...readStringArray(p, "bullets")]),
  ];
  return parts.filter(Boolean).join("\n");
}

export function estimateOptimizedResumeScore(beforeScore: number, optimizedText: string, originalText: string, jobDescription?: string): number {
  const optimizedEstimate = estimateResumeScoreFromText(optimizedText, jobDescription);
  const originalEstimate = estimateResumeScoreFromText(originalText, jobDescription);
  const improvement = Math.max(6, Math.min(24, optimizedEstimate - originalEstimate + 14));
  return clamp(Math.max(optimizedEstimate, beforeScore + improvement), beforeScore + 3, 97);
}