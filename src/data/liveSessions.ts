export type SessionStatus = "upcoming" | "live" | "past";

export interface Host {
  name: string;
  role: string;
  avatar: string; // emoji or url
  bio: string;
}

export interface LiveSession {
  id: string;
  title: string;
  category: string;
  emoji: string;
  // ISO datetime in UTC for the session start
  startsAt: string;
  durationMinutes: number;
  host: Host;
  description: string;
  learnings: string[];
  // Where the session happens
  platform: "YouTube Live" | "Google Meet" | "Zoom";
  joinUrl: string;
  // Only for past sessions
  recordingYoutubeId?: string;
  attendees?: number;
}

// ───────────── helpers ─────────────
const dayOffset = (days: number, hour = 17, minute = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};

// ───────────── mock data ─────────────
export const liveSessions: LiveSession[] = [
  // LIVE NOW (started ~10 min ago, runs 60min)
  {
    id: "live-now-1",
    title: "Salary Negotiation Power Hour",
    category: "Career Growth",
    emoji: "💸",
    startsAt: (() => {
      const d = new Date();
      d.setMinutes(d.getMinutes() - 10);
      return d.toISOString();
    })(),
    durationMinutes: 60,
    host: {
      name: "Adaeze Okafor",
      role: "Head of People, Paystack",
      avatar: "👩🏾‍💼",
      bio: "10+ years hiring across Nigerian fintech. Led offers for 200+ senior hires.",
    },
    description:
      "An open Q&A on negotiating offers in Nigeria — base, bonus, equity, and remote-USD packages. Bring your real numbers.",
    learnings: [
      "How to anchor your ask without losing the offer",
      "Scripts for counter-offers and 'I have a competing offer' moments",
      "What recruiters actually have flexibility on",
      "When to push for equity vs cash",
    ],
    platform: "YouTube Live",
    joinUrl: "https://youtube.com/live/dQw4w9WgXcQ",
    attendees: 142,
  },

  // UPCOMING
  {
    id: "up-1",
    title: "Land a Remote-First Role at a Global Company",
    category: "Job Search",
    emoji: "🌍",
    startsAt: dayOffset(2, 18, 0),
    durationMinutes: 75,
    host: {
      name: "Chiamaka Eze",
      role: "Senior PM, Stripe (Remote, Lagos)",
      avatar: "👩🏾‍💻",
      bio: "Went from Lagos startup to Stripe in 14 months. Now coaches African women through the same path.",
    },
    description:
      "The exact playbook for landing a fully-remote role at a US/EU company while based in Nigeria — sourcing, applying, interviewing, and getting paid in USD.",
    learnings: [
      "Where remote-friendly companies actually hire from Africa",
      "How to position your CV for global recruiters",
      "Handling timezone, payment, and tax conversations",
      "Salary expectations for remote-USD roles",
    ],
    platform: "Google Meet",
    joinUrl: "https://meet.google.com/abc-defg-hij",
    attendees: 87,
  },
  {
    id: "up-2",
    title: "Resume Roast: We Fix 5 Live CVs",
    category: "Resume",
    emoji: "📄",
    startsAt: dayOffset(5, 17, 0),
    durationMinutes: 60,
    host: {
      name: "Funmi Adebayo",
      role: "Career Coach & ex-Google Recruiter",
      avatar: "👩🏿‍🏫",
      bio: "Reviewed 5,000+ resumes across Big Tech and African startups.",
    },
    description:
      "Submit your CV and watch us tear it apart (with love). 5 lucky members get their resume rewritten live.",
    learnings: [
      "The 6-second recruiter scan — what they actually look for",
      "How to quantify wins when your role wasn't 'measurable'",
      "ATS keywords that matter in 2026",
      "The bullet-point formula that gets interviews",
    ],
    platform: "YouTube Live",
    joinUrl: "https://youtube.com/live/example1",
    attendees: 213,
  },
  {
    id: "up-3",
    title: "Breaking Into Product Management — No PM Experience",
    category: "Career Switch",
    emoji: "🎯",
    startsAt: dayOffset(9, 18, 0),
    durationMinutes: 90,
    host: {
      name: "Ngozi Ibe",
      role: "Group PM, Flutterwave",
      avatar: "👩🏾‍🚀",
      bio: "Switched from marketing to PM in 2019. Built and shipped products used by 5M+ Africans.",
    },
    description:
      "If you've been told you 'need PM experience to get PM experience' — this session breaks that loop.",
    learnings: [
      "Skills you already have that translate to PM",
      "How to build a PM portfolio without a PM job",
      "Where to find APM/Associate PM roles in Africa",
      "The exact STAR stories that convert in PM interviews",
    ],
    platform: "Google Meet",
    joinUrl: "https://meet.google.com/xyz-uvwx-rst",
    attendees: 64,
  },
  {
    id: "up-4",
    title: "LinkedIn Profile Glow-Up Workshop",
    category: "Personal Brand",
    emoji: "💼",
    startsAt: dayOffset(14, 17, 30),
    durationMinutes: 60,
    host: {
      name: "Tomi Akinlade",
      role: "LinkedIn Top Voice — Africa",
      avatar: "👩🏾‍🎤",
      bio: "85K followers. Helps African women turn LinkedIn into an inbound career engine.",
    },
    description:
      "Hands-on workshop. Bring your LinkedIn profile open in another tab and rebuild it section-by-section with us.",
    learnings: [
      "Headline formulas that show up in recruiter search",
      "How to write an About that doesn't sound like everyone else",
      "Featured section: what to pin and why",
      "Posting cadence to attract opportunities (not noise)",
    ],
    platform: "YouTube Live",
    joinUrl: "https://youtube.com/live/example2",
    attendees: 156,
  },

  // PAST RECORDINGS
  {
    id: "past-1",
    title: "From Banking to Tech: My Transition Story",
    category: "Career Switch",
    emoji: "🏦",
    startsAt: dayOffset(-7, 17, 0),
    durationMinutes: 60,
    host: {
      name: "Blessing Okoro",
      role: "Engineering Manager, Andela",
      avatar: "👩🏾‍💻",
      bio: "Left a 10-year banking career to learn to code at 32. Now manages a team of 12 engineers.",
    },
    description:
      "The real story — including the pay cut, the imposter syndrome, and the year-2 turning point.",
    learnings: [
      "How to evaluate if a tech switch is right for you",
      "Bootcamp vs self-taught vs CS degree in Nigeria",
      "Surviving the salary dip in months 1-18",
      "Leveraging your previous career as an unfair advantage",
    ],
    platform: "YouTube Live",
    joinUrl: "https://youtube.com/live/past1",
    recordingYoutubeId: "dQw4w9WgXcQ",
    attendees: 487,
  },
  {
    id: "past-2",
    title: "Negotiating Your First Six-Figure Offer (₦)",
    category: "Career Growth",
    emoji: "💰",
    startsAt: dayOffset(-14, 18, 0),
    durationMinutes: 75,
    host: {
      name: "Adaeze Okafor",
      role: "Head of People, Paystack",
      avatar: "👩🏾‍💼",
      bio: "10+ years hiring across Nigerian fintech.",
    },
    description: "Tactical session on negotiating Naira offers without burning bridges.",
    learnings: [
      "Benchmarking salaries in Nigerian tech",
      "What's negotiable beyond base pay",
      "Email templates for counter-offers",
      "Handling exploding offers and pressure tactics",
    ],
    platform: "Google Meet",
    joinUrl: "https://meet.google.com/past2",
    recordingYoutubeId: "dQw4w9WgXcQ",
    attendees: 612,
  },
  {
    id: "past-3",
    title: "Interviewing While Anxious: A Practical Guide",
    category: "Interview Prep",
    emoji: "🧘🏾‍♀️",
    startsAt: dayOffset(-21, 17, 0),
    durationMinutes: 60,
    host: {
      name: "Dr. Yemisi Adeolu",
      role: "Career Psychologist",
      avatar: "👩🏾‍⚕️",
      bio: "Works with high-performing African women on interview anxiety and impostor syndrome.",
    },
    description: "Frameworks for staying grounded in high-stakes interviews.",
    learnings: [
      "The 4-7-8 breathing reset between questions",
      "How to recover from a question you bombed",
      "Reframing the interview as a two-way fit",
      "Pre-interview ritual that calms your nervous system",
    ],
    platform: "YouTube Live",
    joinUrl: "https://youtube.com/live/past3",
    recordingYoutubeId: "dQw4w9WgXcQ",
    attendees: 398,
  },
];

// ───────────── status helpers ─────────────
export function getSessionStatus(session: LiveSession): SessionStatus {
  const start = new Date(session.startsAt).getTime();
  const end = start + session.durationMinutes * 60 * 1000;
  const now = Date.now();
  if (now < start) return "upcoming";
  if (now >= start && now <= end) return "live";
  return "past";
}

export function buildGoogleCalendarUrl(session: LiveSession): string {
  const start = new Date(session.startsAt);
  const end = new Date(start.getTime() + session.durationMinutes * 60 * 1000);
  const fmt = (d: Date) =>
    d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `Girls In Careers — ${session.title}`,
    dates: `${fmt(start)}/${fmt(end)}`,
    details: `${session.description}\n\nHost: ${session.host.name} (${session.host.role})\n\nJoin link: ${session.joinUrl}`,
    location: session.joinUrl,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function formatSessionDate(iso: string): {
  day: string;
  date: string;
  time: string;
  relative: string;
} {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  let relative = "";
  if (diffDays === 0) relative = "Today";
  else if (diffDays === 1) relative = "Tomorrow";
  else if (diffDays === -1) relative = "Yesterday";
  else if (diffDays > 1 && diffDays <= 7) relative = `In ${diffDays} days`;
  else if (diffDays < -1 && diffDays >= -7) relative = `${Math.abs(diffDays)} days ago`;
  else if (diffDays > 7) relative = d.toLocaleDateString("en-NG", { month: "short", day: "numeric" });
  else relative = d.toLocaleDateString("en-NG", { month: "short", day: "numeric", year: "numeric" });

  return {
    day: d.toLocaleDateString("en-NG", { weekday: "short" }),
    date: d.toLocaleDateString("en-NG", { month: "short", day: "numeric" }),
    time: d.toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit", hour12: true }),
    relative,
  };
}
