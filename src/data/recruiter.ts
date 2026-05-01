// Helpers shared across the recruiter UI. All real data now comes from
// Lovable Cloud (profiles, recruiter_jobs, job_applications).

export interface TalentProfile {
  id: string;
  name: string;
  role: string;
  location: string;
  experienceYears: number;
  skills: string[];
  matchScore: number;
  avatarSeed: string;
  rate: string;
  available: boolean;
  avatarUrl?: string;
}

export function avatarUrl(seed: string, size = 80) {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}&size=${size}`;
}

export function formatPostedDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
