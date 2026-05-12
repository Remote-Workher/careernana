// Lightweight, deterministic job-to-profile match scoring used by the Jobs feed.
// Purely client-side: no AI, no network — runs over already-loaded jobs and the
// user's profile so the feed feels instant and explainable.

export type MatchProfile = {
  target_roles?: string[] | null;
  skills?: string[] | null;
  location?: string | null;
  city?: string | null;
  work_preference?: string[] | null;
  experience_years?: number | null;
  job_title?: string | null;
  current_role?: string | null;
};

export type MatchableJob = {
  job_title: string;
  description?: string | null;
  location?: string | null;
  work_type?: string | null;
  experience_level?: string | null;
  skills?: string[] | null;
};

export type MatchResult = {
  score: number; // 0–100
  reasons: string[]; // short, human-friendly chips, max 3
  matchedSkills: string[];
  missingSkills: string[];
};

const norm = (s: string) => s.toLowerCase().trim();
const tokens = (s: string) =>
  norm(s)
    .split(/[^a-z0-9+#.]+/g)
    .filter(Boolean);

// Generic domain words that, on their own, shouldn't earn many points.
// "Marketing Manager" vs "Marketing Executive" share only the domain word.
const GENERIC_DOMAIN_WORDS = new Set([
  "marketing", "sales", "design", "data", "product", "operations", "ops",
  "finance", "engineering", "engineer", "developer", "manager", "executive",
  "assistant", "associate", "specialist", "coordinator", "analyst",
  "lead", "senior", "junior", "head", "director", "officer", "consultant",
  "support", "success", "strategy", "content", "media", "social", "growth",
]);

// Seniority buckets — used to penalise mismatches like
// "Marketing Manager" vs "Digital Marketing Executive".
function seniorityLevel(title: string): "intern" | "junior" | "mid" | "manager" | "senior" | "exec" | null {
  const t = norm(title);
  if (/\b(intern|trainee|graduate)\b/.test(t)) return "intern";
  if (/\b(executive|associate|junior|jr|entry|assistant)\b/.test(t)) return "junior";
  if (/\b(senior|sr|lead|principal|staff)\b/.test(t)) return "senior";
  if (/\b(head of|director|vp|chief|cxo|ceo|cmo|cto|coo)\b/.test(t)) return "exec";
  if (/\b(manager|management)\b/.test(t)) return "manager";
  return "mid";
}

const SENIORITY_RANK: Record<string, number> = {
  intern: 0, junior: 1, mid: 2, manager: 3, senior: 4, exec: 5,
};

function seniorityGap(a: string, b: string): number {
  const la = seniorityLevel(a);
  const lb = seniorityLevel(b);
  if (!la || !lb) return 0;
  return Math.abs(SENIORITY_RANK[la] - SENIORITY_RANK[lb]);
}

function roleMatchScore(jobTitle: string, targetRoles: string[]): { score: number; matched?: string } {
  if (!targetRoles.length) return { score: 0 };
  const titleNorm = norm(jobTitle);
  const titleTokens = new Set(tokens(jobTitle));
  let best = 0;
  let matched: string | undefined;
  for (const role of targetRoles) {
    const r = norm(role);
    if (!r) continue;
    const gap = seniorityGap(role, jobTitle);

    // Exact / contains: very strong signal
    if (titleNorm === r) {
      const s = 40;
      if (s > best) { best = s; matched = role; }
      continue;
    }
    if (titleNorm.includes(r) || r.includes(titleNorm)) {
      const s = gap >= 2 ? 22 : gap === 1 ? 30 : 38;
      if (s > best) { best = s; matched = role; }
      continue;
    }

    // Token overlap, but only count meaningful (non-generic) overlap heavily.
    const roleTokens = tokens(role);
    const overlapAll = roleTokens.filter((t) => titleTokens.has(t));
    const meaningfulOverlap = overlapAll.filter((t) => !GENERIC_DOMAIN_WORDS.has(t)).length;
    const totalOverlap = overlapAll.length;

    let s = 0;
    if (meaningfulOverlap >= 2) s = 28;
    else if (meaningfulOverlap === 1 && totalOverlap >= 2) s = 22;
    else if (totalOverlap >= 2) s = 14; // both generic words shared
    else if (totalOverlap === 1) s = 6;  // single generic word — barely a signal

    // Big seniority gaps drop the score further.
    if (gap >= 2) s = Math.round(s * 0.4);
    else if (gap === 1) s = Math.round(s * 0.75);

    if (s > best) { best = s; matched = role; }
  }
  return { score: best, matched };
}

function skillMatchScore(jobSkills: string[], userSkills: string[]): {
  score: number;
  matched: string[];
  missing: string[];
} {
  if (!jobSkills.length || !userSkills.length) {
    return { score: 0, matched: [], missing: jobSkills };
  }
  const userSet = new Set(userSkills.map(norm));
  const matched: string[] = [];
  const missing: string[] = [];
  for (const s of jobSkills) {
    if (userSet.has(norm(s))) matched.push(s);
    else missing.push(s);
  }
  // Up to 35 points based on coverage of the job's listed skills.
  const ratio = matched.length / jobSkills.length;
  return { score: Math.round(ratio * 35), matched, missing };
}

function locationMatchScore(
  job: MatchableJob,
  profile: MatchProfile,
): { score: number; reason?: string } {
  const work = (job.work_type || "").toLowerCase();
  const loc = (job.location || "").toLowerCase();
  const isRemote = work.includes("remote") || loc.includes("remote") || loc.includes("anywhere");
  const prefs = (profile.work_preference || []).map(norm);
  if (isRemote && (!prefs.length || prefs.some((p) => p.includes("remote")))) {
    return { score: 15, reason: "Remote-friendly" };
  }
  const userLoc = norm(profile.location || profile.city || "");
  if (!userLoc) return { score: 0 };
  if (loc && (loc.includes(userLoc) || userLoc.includes(loc))) {
    return { score: 12, reason: `Based in ${profile.city || profile.location}` };
  }
  return { score: 0 };
}

function experienceMatchScore(
  job: MatchableJob,
  profile: MatchProfile,
): { score: number; reason?: string } {
  const lvl = (job.experience_level || "").toLowerCase();
  const years = profile.experience_years ?? null;
  if (!lvl || years === null) return { score: 0 };
  const isEntry = /entry|junior|grad|intern/.test(lvl);
  const isMid = /mid|intermediate/.test(lvl);
  const isSenior = /senior|lead|principal|staff/.test(lvl);
  if (isEntry && years <= 2) return { score: 10, reason: "Matches your level" };
  if (isMid && years >= 2 && years <= 6) return { score: 10, reason: "Matches your level" };
  if (isSenior && years >= 5) return { score: 10, reason: "Matches your level" };
  return { score: 0 };
}

export function scoreJob(job: MatchableJob, profile: MatchProfile | null): MatchResult {
  if (!profile) {
    return { score: 0, reasons: [], matchedSkills: [], missingSkills: job.skills ?? [] };
  }

  const reasons: string[] = [];

  // 1. Target role alignment (up to 40 pts)
  const role = roleMatchScore(job.job_title, profile.target_roles ?? []);
  if (role.matched) reasons.push(`Matches your goal: ${role.matched}`);

  // 2. Skill overlap (up to 35 pts)
  const skill = skillMatchScore(job.skills ?? [], profile.skills ?? []);
  if (skill.matched.length >= 3) {
    reasons.push(`${skill.matched.length} skills match`);
  } else if (skill.matched.length > 0) {
    reasons.push(`Skills match: ${skill.matched.slice(0, 2).join(", ")}`);
  }

  // 3. Location / remote preference (up to 15 pts)
  const loc = locationMatchScore(job, profile);
  if (loc.reason) reasons.push(loc.reason);

  // 4. Experience level fit (up to 10 pts)
  const exp = experienceMatchScore(job, profile);
  if (exp.reason) reasons.push(exp.reason);

  const score = Math.min(role.score + skill.score + loc.score + exp.score, 100);

  return {
    score,
    reasons: reasons.slice(0, 3),
    matchedSkills: skill.matched,
    missingSkills: skill.missing,
  };
}

export function matchTier(score: number): "great" | "good" | "fair" | "low" {
  if (score >= 70) return "great";
  if (score >= 50) return "good";
  if (score >= 30) return "fair";
  return "low";
}

export function matchLabel(score: number): string {
  const tier = matchTier(score);
  if (tier === "great") return "Great match";
  if (tier === "good") return "Good match";
  if (tier === "fair") return "Possible fit";
  return "Low match";
}
