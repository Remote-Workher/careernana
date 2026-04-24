export type SessionStatus = "upcoming" | "live" | "past";

export interface Host {
  name: string;
  role: string;
  avatar: string; // emoji or url
  bio: string;
  photoUrl?: string;
}

export interface LiveSession {
  id: string;
  title: string;
  category: string;
  emoji: string;
  startsAt: string;
  durationMinutes: number;
  host: Host;
  description: string;
  learnings: string[];
  platform: "YouTube Live" | "Google Meet" | "Zoom";
  joinUrl: string;
  recordingYoutubeId?: string;
  attendees?: number;
  // Background gradient for live hero card
  heroGradient?: string;
}

// ───────────── helpers ─────────────
const dayOffset = (days: number, hour = 19, minute = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};

// Stable Unsplash portraits
const photo = (seed: string) =>
  `https://images.unsplash.com/${seed}?auto=format&fit=crop&w=400&q=80`;

// ───────────── mock data ─────────────
export const liveSessions: LiveSession[] = [
  // LIVE NOW × 2
  {
    id: "live-1",
    title: "Ace Your Remote Job Interview",
    category: "Interview Prep",
    emoji: "🎤",
    startsAt: (() => {
      const d = new Date();
      d.setMinutes(d.getMinutes() - 12);
      return d.toISOString();
    })(),
    durationMinutes: 60,
    host: {
      name: "Priya Sharma",
      role: "Recruitment Coach",
      avatar: "👩🏽",
      bio: "10+ years recruiting for global remote teams.",
      photoUrl: photo("photo-1573497019940-1c28c88b4f3e"),
    },
    description: "Proven strategies to stand out and get hired",
    learnings: [
      "How to research the company in 15 minutes",
      "STAR stories that convert",
      "Salary expectations for remote roles",
      "Closing questions that leave a lasting impression",
    ],
    platform: "YouTube Live",
    joinUrl: "https://youtube.com/live/dQw4w9WgXcQ",
    attendees: 1200,
    heroGradient: "linear-gradient(135deg, #6B3FA0 0%, #4a2575 100%)",
  },
  {
    id: "live-2",
    title: "Build Your Personal Brand on LinkedIn",
    category: "Personal Brand",
    emoji: "💼",
    startsAt: (() => {
      const d = new Date();
      d.setMinutes(d.getMinutes() - 5);
      return d.toISOString();
    })(),
    durationMinutes: 60,
    host: {
      name: "Rahul Mehta",
      role: "LinkedIn Marketing Expert",
      avatar: "👨🏽",
      bio: "Helps remote professionals grow inbound careers on LinkedIn.",
      photoUrl: photo("photo-1500648767791-00dcc994a43e"),
    },
    description: "Attract opportunities and grow your career",
    learnings: [
      "Headline formulas recruiters search for",
      "Featured section strategy",
      "Posting cadence that works",
      "Turning profile views into DMs",
    ],
    platform: "YouTube Live",
    joinUrl: "https://youtube.com/live/example",
    attendees: 856,
    heroGradient: "linear-gradient(135deg, #1e3a5f 0%, #0f1f3a 100%)",
  },

  // UPCOMING
  {
    id: "up-1",
    title: "Salary Negotiation for Remote Workers",
    category: "Career Growth",
    emoji: "💰",
    startsAt: dayOffset(2, 19, 0),
    durationMinutes: 60,
    host: {
      name: "Arjun Verma",
      role: "Career Coach",
      avatar: "👨🏽‍💼",
      bio: "Helps remote workers maximise compensation packages.",
      photoUrl: photo("photo-1472099645785-5658abf4ff4e"),
    },
    description: "Learn how to negotiate your salary and get what you deserve.",
    learnings: [
      "How to anchor your ask",
      "Counter-offer scripts",
      "Negotiating beyond base pay",
      "When to walk away",
    ],
    platform: "Google Meet",
    joinUrl: "https://meet.google.com/abc-defg-hij",
    attendees: 87,
  },
  {
    id: "up-2",
    title: "Time Management for Maximum Productivity",
    category: "Productivity",
    emoji: "⏱️",
    startsAt: dayOffset(3, 18, 0),
    durationMinutes: 60,
    host: {
      name: "Neha Kapoor",
      role: "Productivity Expert",
      avatar: "👩🏽‍💻",
      bio: "Author and coach for remote professionals.",
      photoUrl: photo("photo-1438761681033-6461ffad8d80"),
    },
    description: "Top time management techniques for remote professionals.",
    learnings: [
      "Time blocking that actually sticks",
      "Async-first communication",
      "Deep work in noisy homes",
      "Energy management vs time management",
    ],
    platform: "YouTube Live",
    joinUrl: "https://youtube.com/live/example1",
    attendees: 213,
  },
  {
    id: "up-3",
    title: "How to Land High-Paying Remote Jobs",
    category: "Job Search",
    emoji: "🌍",
    startsAt: dayOffset(4, 19, 0),
    durationMinutes: 60,
    host: {
      name: "Sahil Patel",
      role: "Remote Hiring Manager",
      avatar: "👨🏽‍💼",
      bio: "Hires for remote-first US/EU companies.",
      photoUrl: photo("photo-1507003211169-0a1dd7228f2d"),
    },
    description: "Step-by-step blueprint to find and land high-paying remote jobs.",
    learnings: [
      "Where remote-first companies hire from",
      "Positioning your CV for global recruiters",
      "Handling timezone & payment conversations",
      "Salary expectations for USD remote roles",
    ],
    platform: "Google Meet",
    joinUrl: "https://meet.google.com/xyz",
    attendees: 156,
  },
  {
    id: "up-4",
    title: "Freelancing 101: Get Your First Client",
    category: "Freelancing",
    emoji: "🚀",
    startsAt: dayOffset(5, 11, 0),
    durationMinutes: 60,
    host: {
      name: "Ananya Sharma",
      role: "Freelance Consultant",
      avatar: "👩🏽‍💼",
      bio: "Built a six-figure freelance practice from scratch.",
      photoUrl: photo("photo-1494790108377-be9c29b29330"),
    },
    description: "Everything you need to know to start your freelancing journey.",
    learnings: [
      "Pricing your first offer",
      "Where to find your first 5 clients",
      "Contracts and getting paid",
      "Scaling from side-hustle to full-time",
    ],
    platform: "YouTube Live",
    joinUrl: "https://youtube.com/live/example2",
    attendees: 98,
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
      role: "Engineering Manager",
      avatar: "👩🏾‍💻",
      bio: "Switched from a 10-year banking career to tech at 32.",
      photoUrl: photo("photo-1580489944761-15a19d654956"),
    },
    description: "The real story — pay cut, imposter syndrome, and the year-2 turning point.",
    learnings: [
      "Evaluating if a tech switch is right for you",
      "Bootcamp vs self-taught vs CS degree",
      "Surviving the salary dip",
      "Leveraging your previous career as an unfair advantage",
    ],
    platform: "YouTube Live",
    joinUrl: "https://youtube.com/live/past1",
    recordingYoutubeId: "dQw4w9WgXcQ",
    attendees: 487,
  },
  {
    id: "past-2",
    title: "Negotiating Your First Six-Figure Offer",
    category: "Career Growth",
    emoji: "💰",
    startsAt: dayOffset(-14, 18, 0),
    durationMinutes: 75,
    host: {
      name: "Adaeze Okafor",
      role: "Head of People",
      avatar: "👩🏾‍💼",
      bio: "10+ years hiring across global fintech.",
      photoUrl: photo("photo-1544005313-94ddf0286df2"),
    },
    description: "Tactical session on negotiating offers without burning bridges.",
    learnings: [
      "Benchmarking salaries",
      "What's negotiable beyond base pay",
      "Email templates for counter-offers",
      "Handling exploding offers",
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
      bio: "Works with professionals on interview anxiety and impostor syndrome.",
      photoUrl: photo("photo-1551836022-d5d88e9218df"),
    },
    description: "Frameworks for staying grounded in high-stakes interviews.",
    learnings: [
      "The 4-7-8 breathing reset",
      "How to recover from a question you bombed",
      "Reframing the interview as a two-way fit",
      "Pre-interview rituals that calm your nervous system",
    ],
    platform: "YouTube Live",
    joinUrl: "https://youtube.com/live/past3",
    recordingYoutubeId: "dQw4w9WgXcQ",
    attendees: 398,
  },
];

// ───────────── helpers ─────────────
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
    text: session.title,
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
  else relative = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return {
    day: d.toLocaleDateString("en-US", { weekday: "short" }),
    date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    time: d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }),
    relative,
  };
}
