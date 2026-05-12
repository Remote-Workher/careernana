// ATS-style job match scoring.
//
// When the user has a resume text on their profile we run a real
// keyword-coverage check (resume vs JD) — same approach an ATS would take.
// When no resume text is available we fall back to a soft heuristic based on
// target roles + listed skills so the feed is still usable for new users.

export type MatchProfile = {
  target_roles?: string[] | null;
  skills?: string[] | null;
  location?: string | null;
  city?: string | null;
  work_preference?: string[] | null;
  experience_years?: number | null;
  job_title?: string | null;
  current_role?: string | null;
  /** Full plain-text resume — the moment this is set we score JD vs resume. */
  resume_text?: string | null;
};

export type MatchableJob = {
  job_title: string;
  description?: string | null;
  requirements?: string | null;
  location?: string | null;
  work_type?: string | null;
  experience_level?: string | null;
  skills?: string[] | null;
};

export type MatchResult = {
  score: number; // 0–100
  reasons: string[];
  matchedSkills: string[];
  missingSkills: string[];
  /** True when score came from real resume↔JD keyword coverage. */
  ats?: boolean;
};

const norm = (s: string) => s.toLowerCase().trim();

// ───────────────────────── ATS keyword scoring ─────────────────────────

const STOPWORDS = new Set([
  "the","and","for","with","you","your","our","this","that","are","was","were",
  "will","have","has","had","not","but","from","into","than","then","also",
  "any","all","can","may","use","via","per","via","etc","its","their","they",
  "them","who","what","when","where","why","how","very","such","like","including",
  "include","includes","included","based","strong","good","great","high","low",
  "more","most","some","each","other","across","within","while","because","just",
  "able","about","above","after","again","against","being","below","between",
  "both","does","doing","down","during","further","here","itself","myself","off",
  "once","only","over","own","same","should","under","until","upon","ours",
  "team","teams","work","working","role","roles","job","jobs","company","plus",
  "looking","seeking","candidate","candidates","position","experience","years",
  "year","week","weeks","day","days","month","months","time","new","ideal",
  "preferred","required","requirements","responsibilities","ability","skills",
  "skill","etc","must","minimum","maximum","prior","proven","track","record",
]);

function wordsOf(text: string): string[] {
  return (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9+#./\- ]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/** Build a JD keyword list focused on the things an ATS actually checks. */
function jdKeywords(job: MatchableJob): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const add = (raw: string) => {
    const k = raw.toLowerCase().trim();
    if (!k || k.length < 2) return;
    if (seen.has(k)) return;
    seen.add(k);
    out.push(k);
  };

  // 1. Listed skills are the highest-signal keywords.
  for (const s of job.skills ?? []) add(s);

  // 2. Mine description + requirements for additional capitalised phrases
  //    (tools, methodologies, named technologies — “Google Analytics”,
  //    “SEO”, “HubSpot”, etc).
  const blob = `${job.requirements || ""}\n${job.description || ""}`;
  // Capitalised n-grams (1–3 words)
  const capRe = /\b([A-Z][A-Za-z0-9+./#-]{1,}(?:\s+[A-Z][A-Za-z0-9+./#-]{1,}){0,2})\b/g;
  let m: RegExpExecArray | null;
  while ((m = capRe.exec(blob))) {
    const phrase = m[1].trim();
    if (phrase.length > 40) continue;
    if (/^(The|And|We|You|Our|This|That|For|With|At|In|On|Of|Or|To|A|An)$/i.test(phrase)) continue;
    add(phrase);
    if (out.length > 25) break;
  }

  // 3. Add a small bag of meaningful single tokens from description as fallback
  //    so jobs with no `skills` array still get a real comparison.
  if (out.length < 6) {
    const counts = new Map<string, number>();
    for (const w of wordsOf(blob)) {
      if (w.length < 4 || STOPWORDS.has(w)) continue;
      counts.set(w, (counts.get(w) || 0) + 1);
    }
    const ranked = [...counts.entries()]
      .filter(([, c]) => c >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([w]) => w);
    for (const w of ranked) add(w);
  }

  return out;
}

function resumeContainsKeyword(resumeBlob: string, keyword: string): boolean {
  const k = keyword.toLowerCase();
  // Word-boundary match for short keywords; substring for multi-word phrases.
  if (/\s/.test(k)) return resumeBlob.includes(k);
  // Build a regex with word boundaries; escape special chars.
  const esc = k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${esc}([^a-z0-9]|$)`, "i").test(resumeBlob);
}

function atsScore(
  job: MatchableJob,
  resumeText: string,
  profile: MatchProfile,
): MatchResult {
  const keywords = jdKeywords(job);
  if (!keywords.length) {
    return { score: 0, reasons: ["Not enough info on this job to score"], matchedSkills: [], missingSkills: [], ats: true };
  }

  // Combine resume text + listed profile skills so manually-tagged skills
  // also count even if not literally in the resume body.
  const profileSkillsBlob = (profile.skills || []).join(" ").toLowerCase();
  const blob = `${resumeText.toLowerCase()}\n${profileSkillsBlob}`;

  const matched: string[] = [];
  const missing: string[] = [];
  for (const k of keywords) {
    if (resumeContainsKeyword(blob, k)) matched.push(k);
    else missing.push(k);
  }

  const coverage = matched.length / keywords.length; // 0..1
  let score = Math.round(coverage * 100);

  // Soft seniority guard: if the JD title implies a level the user clearly
  // isn't at, knock the score down a little so a "Director" job doesn't show
  // 90% just because all the skills overlap.
  const titleLower = (job.job_title || "").toLowerCase();
  const years = profile.experience_years ?? null;
  if (years !== null) {
    if (/\b(director|head of|vp|chief|cxo|ceo|cto|coo|cmo)\b/.test(titleLower) && years < 7) {
      score = Math.round(score * 0.7);
    } else if (/\b(senior|sr|lead|principal|staff)\b/.test(titleLower) && years < 4) {
      score = Math.round(score * 0.8);
    } else if (/\b(intern|graduate|trainee)\b/.test(titleLower) && years > 3) {
      score = Math.round(score * 0.75);
    }
  }

  const reasons: string[] = [];
  reasons.push(`${matched.length} of ${keywords.length} JD keywords in your resume`);
  if (matched.length) reasons.push(`Matches: ${matched.slice(0, 3).join(", ")}`);
  if (missing.length && matched.length) reasons.push(`Missing: ${missing.slice(0, 2).join(", ")}`);

  return {
    score: Math.max(0, Math.min(100, score)),
    reasons: reasons.slice(0, 3),
    matchedSkills: matched,
    missingSkills: missing,
    ats: true,
  };
}

// ───────────── Fallback heuristic (only when no resume text) ─────────────

const GENERIC_DOMAIN_WORDS = new Set([
  "marketing","sales","design","data","product","operations","ops","finance",
  "engineering","engineer","developer","manager","executive","assistant",
  "associate","specialist","coordinator","analyst","lead","senior","junior",
  "head","director","officer","consultant","support","success","strategy",
  "content","media","social","growth",
]);

function tokens(s: string) {
  return norm(s).split(/[^a-z0-9+#.]+/g).filter(Boolean);
}

function seniorityLevel(title: string): "intern"|"junior"|"mid"|"manager"|"senior"|"exec"|null {
  const t = norm(title);
  if (/\b(intern|trainee|graduate)\b/.test(t)) return "intern";
  if (/\b(executive|associate|junior|jr|entry|assistant)\b/.test(t)) return "junior";
  if (/\b(senior|sr|lead|principal|staff)\b/.test(t)) return "senior";
  if (/\b(head of|director|vp|chief|cxo|ceo|cmo|cto|coo)\b/.test(t)) return "exec";
  if (/\b(manager|management)\b/.test(t)) return "manager";
  return "mid";
}
const SENIORITY_RANK: Record<string, number> = { intern:0, junior:1, mid:2, manager:3, senior:4, exec:5 };
function seniorityGap(a: string, b: string) {
  const la = seniorityLevel(a), lb = seniorityLevel(b);
  if (!la || !lb) return 0;
  return Math.abs(SENIORITY_RANK[la] - SENIORITY_RANK[lb]);
}

function heuristicScore(job: MatchableJob, profile: MatchProfile): MatchResult {
  const reasons: string[] = [];
  const targetRoles = profile.target_roles ?? [];
  const userSkills = (profile.skills ?? []).map(norm);
  const jobSkills = job.skills ?? [];

  // Role match
  let roleScore = 0;
  let matchedRole: string | undefined;
  const titleNorm = norm(job.job_title);
  const titleTokens = new Set(tokens(job.job_title));
  for (const role of targetRoles) {
    const r = norm(role);
    if (!r) continue;
    const gap = seniorityGap(role, job.job_title);
    let s = 0;
    if (titleNorm === r) s = 40;
    else if (titleNorm.includes(r) || r.includes(titleNorm)) s = gap >= 2 ? 22 : gap === 1 ? 30 : 38;
    else {
      const overlap = tokens(role).filter((t) => titleTokens.has(t));
      const meaningful = overlap.filter((t) => !GENERIC_DOMAIN_WORDS.has(t)).length;
      if (meaningful >= 2) s = 28;
      else if (meaningful === 1 && overlap.length >= 2) s = 22;
      else if (overlap.length >= 2) s = 14;
      else if (overlap.length === 1) s = 6;
      if (gap >= 2) s = Math.round(s * 0.4);
      else if (gap === 1) s = Math.round(s * 0.75);
    }
    if (s > roleScore) { roleScore = s; matchedRole = role; }
  }
  if (matchedRole && roleScore >= 14) reasons.push(`Matches your goal: ${matchedRole}`);

  // Skill match
  const userSet = new Set(userSkills);
  const matched: string[] = [];
  const missing: string[] = [];
  for (const s of jobSkills) (userSet.has(norm(s)) ? matched : missing).push(s);
  const skillScore = jobSkills.length ? Math.round((matched.length / jobSkills.length) * 35) : 0;
  if (matched.length >= 3) reasons.push(`${matched.length} skills match`);
  else if (matched.length) reasons.push(`Skills match: ${matched.slice(0, 2).join(", ")}`);

  let total = roleScore + skillScore;
  if (targetRoles.length) {
    if (roleScore < 8) total = Math.min(total, Math.round(roleScore * 1.5) + Math.min(skillScore, 12));
    else if (roleScore < 18) total = Math.round(total * 0.75);
  }

  return {
    score: Math.max(0, Math.min(100, total)),
    reasons: reasons.slice(0, 3),
    matchedSkills: matched,
    missingSkills: missing,
    ats: false,
  };
}

// ───────────────────────────── Public API ─────────────────────────────

export function scoreJob(job: MatchableJob, profile: MatchProfile | null): MatchResult {
  if (!profile) return { score: 0, reasons: [], matchedSkills: [], missingSkills: job.skills ?? [] };
  const resumeText = (profile.resume_text || "").trim();
  if (resumeText.length >= 200) return atsScore(job, resumeText, profile);
  return heuristicScore(job, profile);
}

export function matchTier(score: number): "great" | "good" | "fair" | "low" {
  if (score >= 70) return "great";
  if (score >= 50) return "good";
  if (score >= 30) return "fair";
  return "low";
}

export function matchLabel(score: number): string {
  const t = matchTier(score);
  if (t === "great") return "Great match";
  if (t === "good") return "Good match";
  if (t === "fair") return "Possible fit";
  return "Low match";
}
