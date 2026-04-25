// Mock data for the recruiter side of the platform.
// Mirrors the dashboard mockup so the UI looks identical out of the box.

export interface RecruiterJob {
  id: string;
  title: string;
  postedDate: string; // ISO
  applications: number;
  shortlisted: number;
  status: "active" | "paused" | "closed";
  location: string;
  type: "full-time" | "part-time" | "contract";
  salary: string;
}

export interface RecruiterApplicant {
  id: string;
  name: string;
  role: string;
  appliedAgo: string;
  matchScore: number;
  avatarSeed: string;
  jobId: string;
  status: "new" | "shortlisted" | "interview" | "rejected" | "hired";
}

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
}

export interface RecruiterMessage {
  id: string;
  fromName: string;
  avatarSeed: string;
  preview: string;
  time: string;
  unread: boolean;
}

export interface Assessment {
  id: string;
  title: string;
  category: string;
  candidates: number;
  avgScore: number;
}

export const recruiterJobs: RecruiterJob[] = [
  {
    id: "j1",
    title: "Product Designer",
    postedDate: "2025-05-18",
    applications: 32,
    shortlisted: 8,
    status: "active",
    location: "Remote · Worldwide",
    type: "full-time",
    salary: "$60k–$85k",
  },
  {
    id: "j2",
    title: "Content Writer",
    postedDate: "2025-05-15",
    applications: 45,
    shortlisted: 12,
    status: "active",
    location: "Remote · EMEA",
    type: "contract",
    salary: "$25–$40 / hr",
  },
  {
    id: "j3",
    title: "Virtual Assistant",
    postedDate: "2025-05-10",
    applications: 28,
    shortlisted: 6,
    status: "active",
    location: "Remote · Africa",
    type: "part-time",
    salary: "$15–$22 / hr",
  },
  {
    id: "j4",
    title: "Social Media Manager",
    postedDate: "2025-05-05",
    applications: 23,
    shortlisted: 4,
    status: "active",
    location: "Remote · Worldwide",
    type: "full-time",
    salary: "$45k–$65k",
  },
];

export const recentApplicants: RecruiterApplicant[] = [
  {
    id: "a1",
    name: "Ravi Sharma",
    role: "Full Stack Developer",
    appliedAgo: "2h ago",
    matchScore: 95,
    avatarSeed: "ravi",
    jobId: "j1",
    status: "new",
  },
  {
    id: "a2",
    name: "Ana Silva",
    role: "Customer Support Rep.",
    appliedAgo: "5h ago",
    matchScore: 90,
    avatarSeed: "ana",
    jobId: "j3",
    status: "shortlisted",
  },
  {
    id: "a3",
    name: "James Lee",
    role: "Video Editor",
    appliedAgo: "1d ago",
    matchScore: 88,
    avatarSeed: "james",
    jobId: "j2",
    status: "new",
  },
  {
    id: "a4",
    name: "Aisha Khan",
    role: "Content Writer",
    appliedAgo: "1d ago",
    matchScore: 95,
    avatarSeed: "aisha",
    jobId: "j2",
    status: "shortlisted",
  },
  {
    id: "a5",
    name: "Daniel Okafor",
    role: "Virtual Assistant",
    appliedAgo: "2d ago",
    matchScore: 93,
    avatarSeed: "daniel",
    jobId: "j3",
    status: "interview",
  },
  {
    id: "a6",
    name: "Maria Gomes",
    role: "Social Media Manager",
    appliedAgo: "2d ago",
    matchScore: 92,
    avatarSeed: "maria",
    jobId: "j4",
    status: "new",
  },
];

export const talentPool: TalentProfile[] = [
  {
    id: "t1",
    name: "Aisha Khan",
    role: "Content Writer",
    location: "Lagos, Nigeria",
    experienceYears: 5,
    skills: ["SEO", "Copywriting", "Editorial"],
    matchScore: 95,
    avatarSeed: "aisha",
    rate: "$30 / hr",
    available: true,
  },
  {
    id: "t2",
    name: "Daniel Okafor",
    role: "Virtual Assistant",
    location: "Abuja, Nigeria",
    experienceYears: 3,
    skills: ["Calendar", "Email", "Notion"],
    matchScore: 93,
    avatarSeed: "daniel",
    rate: "$18 / hr",
    available: true,
  },
  {
    id: "t3",
    name: "Maria Gomes",
    role: "Social Media Manager",
    location: "Cape Town, SA",
    experienceYears: 6,
    skills: ["Instagram", "TikTok", "Analytics"],
    matchScore: 92,
    avatarSeed: "maria",
    rate: "$45 / hr",
    available: false,
  },
  {
    id: "t4",
    name: "Ravi Sharma",
    role: "Full Stack Developer",
    location: "Bengaluru, India",
    experienceYears: 7,
    skills: ["React", "Node.js", "Postgres"],
    matchScore: 95,
    avatarSeed: "ravi",
    rate: "$55 / hr",
    available: true,
  },
  {
    id: "t5",
    name: "Ana Silva",
    role: "Customer Support Lead",
    location: "Lisbon, Portugal",
    experienceYears: 4,
    skills: ["Zendesk", "Intercom", "QA"],
    matchScore: 90,
    avatarSeed: "ana",
    rate: "$22 / hr",
    available: true,
  },
  {
    id: "t6",
    name: "James Lee",
    role: "Video Editor",
    location: "Manila, Philippines",
    experienceYears: 5,
    skills: ["Premiere", "DaVinci", "Motion"],
    matchScore: 88,
    avatarSeed: "james",
    rate: "$28 / hr",
    available: true,
  },
];

export const recruiterMessages: RecruiterMessage[] = [
  { id: "m1", fromName: "Aisha Khan", avatarSeed: "aisha", preview: "Thanks for shortlisting me! When would suit you for a call?", time: "10m", unread: true },
  { id: "m2", fromName: "Ravi Sharma", avatarSeed: "ravi", preview: "Sharing my updated portfolio with the latest case studies.", time: "2h", unread: true },
  { id: "m3", fromName: "Maria Gomes", avatarSeed: "maria", preview: "I'd love to learn more about the Social Media Manager role.", time: "1d", unread: false },
  { id: "m4", fromName: "Daniel Okafor", avatarSeed: "daniel", preview: "Confirming our interview for Thursday 3pm WAT.", time: "2d", unread: false },
];

export const assessments: Assessment[] = [
  { id: "as1", title: "Product Design Fundamentals", category: "Design", candidates: 24, avgScore: 78 },
  { id: "as2", title: "Content Writing & SEO", category: "Writing", candidates: 31, avgScore: 82 },
  { id: "as3", title: "Customer Support Skills", category: "Operations", candidates: 18, avgScore: 88 },
  { id: "as4", title: "React Engineering", category: "Engineering", candidates: 12, avgScore: 71 },
];

export function avatarUrl(seed: string, size = 80) {
  // Stable, friendly avatars without external dependencies on real photos.
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}&size=${size}`;
}

export function formatPostedDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
