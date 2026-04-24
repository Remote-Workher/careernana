import { useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  FileText,
  Flame,
  Gauge,
  Link as LinkIcon,
  Linkedin,
  ListChecks,
  Lock,
  MessageSquare,
  Palette,
  Play,
  Send,
  Smile,
  Sparkles,
  Star,
  Target,
  Trophy,
  Upload,
  User,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import imgCv from "@/assets/challenge-cv.jpg";
import imgInterview from "@/assets/challenge-interview.jpg";
import imgLinkedin from "@/assets/challenge-linkedin.jpg";
import imgRemote from "@/assets/challenge-remote.jpg";

type Tone = "pink" | "violet" | "amber" | "success" | "muted";

const TONE: Record<Tone, { bg: string; fg: string }> = {
  pink: { bg: "bg-primary-tint", fg: "text-primary" },
  violet: { bg: "bg-secondary-tint", fg: "text-secondary" },
  amber: { bg: "bg-amber/10", fg: "text-amber" },
  success: { bg: "bg-success/10", fg: "text-success" },
  muted: { bg: "bg-muted", fg: "text-muted-foreground" },
};

interface ChallengeDetailData {
  id: string;
  title: string;
  category: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  daysLeft: number;
  participants: number;
  submissions: number;
  startDate: string;
  endDate: string;
  prize: string;
  createdBy: string;
  image: string;
  tone: Tone;
  about: string;
  solves: string[];
  deliver: string[];
  criteria: { label: string; pct: number; icon: typeof Palette; tone: Tone }[];
  resources: { title: string; type: string }[];
  requirements: string[];
  tasks: { title: string; desc: string; deliverable: string; due: string }[];
}

const CHALLENGES: Record<string, ChallengeDetailData> = {
  "cv-glow-up": {
    id: "cv-glow-up",
    title: "7-Day CV Glow Up",
    category: "Career",
    difficulty: "Beginner",
    daysLeft: 7,
    participants: 1245,
    submissions: 320,
    startDate: "May 10, 2026",
    endDate: "May 17, 2026 (11:59 PM WAT)",
    prize: "50 Coins + Featured Badge",
    createdBy: "GIC Coaches",
    image: imgCv,
    tone: "pink",
    about:
      "Your CV is your first impression — let's make it unforgettable. Over 7 days, you'll rework your CV section by section using our proven framework so it stands out to recruiters and beats applicant tracking systems.",
    solves: [
      "Rewrite a weak summary into a sharp positioning line",
      "Quantify your achievements with metrics that prove impact",
      "Pass ATS filters with the right keywords and structure",
      "Tailor your CV to the role you actually want next",
    ],
    deliver: [
      "Updated 1–2 page CV (PDF)",
      "A short positioning summary (3–4 lines)",
      "5 quantified, recruiter-friendly bullet points",
      "ATS keyword checklist for your target role",
    ],
    criteria: [
      { label: "Clarity", pct: 30, icon: Palette, tone: "pink" },
      { label: "Impact", pct: 30, icon: Smile, tone: "violet" },
      { label: "ATS Score", pct: 20, icon: Gauge, tone: "amber" },
      { label: "Relevance", pct: 10, icon: Target, tone: "success" },
      { label: "Polish", pct: 10, icon: Star, tone: "muted" },
    ],
    resources: [
      { title: "CV template (Notion)", type: "Template" },
      { title: "ATS keyword library", type: "Worksheet" },
      { title: "Quantify your wins guide", type: "PDF" },
    ],
    requirements: [
      "Submit a 1–2 page CV in PDF format",
      "Include at least 5 quantified achievements",
      "Use the GIC structure (Summary → Experience → Skills → Education)",
      "Tailor the CV to one specific target role",
    ],
    tasks: [
      { title: "CV Audit & Target Role", desc: "Audit your current CV and lock in one specific target role for this glow up.", deliverable: "1-page audit notes", due: "May 11, 2026" },
      { title: "Sharp Positioning Summary", desc: "Rewrite your professional summary into a 3–4 line positioning line that speaks to your target role.", deliverable: "Updated summary block", due: "May 12, 2026" },
      { title: "Quantify Your Wins", desc: "Rewrite your top 5 bullet points with numbers, scope and impact.", deliverable: "5 quantified bullets", due: "May 13, 2026" },
      { title: "ATS Keyword Pass", desc: "Layer in the right keywords for your target role and check ATS compatibility.", deliverable: "ATS keyword checklist", due: "May 14, 2026" },
      { title: "Skills & Education Polish", desc: "Tighten your skills and education sections to match the target role.", deliverable: "Updated skills + education", due: "May 15, 2026" },
      { title: "Visual & Format Cleanup", desc: "Make spacing, fonts and hierarchy clean, scannable and 1–2 pages.", deliverable: "Polished CV layout", due: "May 16, 2026" },
      { title: "Final Submission", desc: "Export your finished CV as PDF and submit it for review.", deliverable: "Final CV (PDF)", due: "May 17, 2026" },
    ],
  },
  "interview-confidence": {
    id: "interview-confidence",
    title: "Interview Confidence Boost",
    category: "Interview",
    difficulty: "Intermediate",
    daysLeft: 12,
    participants: 842,
    submissions: 198,
    startDate: "May 5, 2026",
    endDate: "May 17, 2026 (11:59 PM WAT)",
    prize: "75 Coins + Featured Badge",
    createdBy: "GIC Coaches",
    image: imgInterview,
    tone: "success",
    about:
      "Walk into your next interview composed and clear. In 10 days you'll practise the most common behavioural and competency questions using the STAR method and record yourself answering them.",
    solves: [
      "Structure answers using the STAR method",
      "Handle 'tell me about yourself' with confidence",
      "Negotiate calmly when asked about salary",
      "Manage nerves with simple breathing and prep rituals",
    ],
    deliver: [
      "10 written STAR answers",
      "3 short recorded answers (audio or video)",
      "A personal 60-second pitch",
      "A salary expectations script",
    ],
    criteria: [
      { label: "Structure", pct: 30, icon: ListChecks, tone: "success" },
      { label: "Storytelling", pct: 25, icon: Smile, tone: "pink" },
      { label: "Clarity", pct: 20, icon: Palette, tone: "violet" },
      { label: "Confidence", pct: 15, icon: Gauge, tone: "amber" },
      { label: "Polish", pct: 10, icon: Star, tone: "muted" },
    ],
    resources: [
      { title: "STAR answer worksheet", type: "Worksheet" },
      { title: "50 most-asked interview questions", type: "PDF" },
      { title: "Salary negotiation script pack", type: "Template" },
    ],
    requirements: [
      "Submit 10 STAR-formatted written answers",
      "Record 3 spoken answers (max 90s each)",
      "Include your 60-second personal pitch",
      "Use real examples from your career",
    ],
    tasks: [
      { title: "Map Your 10 Stories", desc: "Pick 10 career moments worth telling and outline them in plain language.", deliverable: "10 story outlines", due: "May 7, 2026" },
      { title: "STAR-ify Your Answers", desc: "Rewrite each story using Situation, Task, Action, Result.", deliverable: "10 STAR answers", due: "May 9, 2026" },
      { title: "60-Second Personal Pitch", desc: "Craft and tighten your 'tell me about yourself' answer.", deliverable: "Written + recorded pitch", due: "May 11, 2026" },
      { title: "Record 3 Spoken Answers", desc: "Record yourself answering 3 of your STAR stories out loud.", deliverable: "3 audio/video clips", due: "May 13, 2026" },
      { title: "Salary & Tough Questions", desc: "Prep your salary expectations script and 5 hard-question answers.", deliverable: "Salary script + answers", due: "May 15, 2026" },
      { title: "Mock Interview & Submit", desc: "Run a mock interview, refine, and submit your final pack.", deliverable: "Final answer pack", due: "May 17, 2026" },
    ],
  },
  "linkedin-builder": {
    id: "linkedin-builder",
    title: "LinkedIn Profile Builder",
    category: "Personal Brand",
    difficulty: "Beginner",
    daysLeft: 5,
    participants: 612,
    submissions: 154,
    startDate: "May 12, 2026",
    endDate: "May 18, 2026 (11:59 PM WAT)",
    prize: "40 Coins + Featured Badge",
    createdBy: "GIC Coaches",
    image: imgLinkedin,
    tone: "amber",
    about:
      "A polished LinkedIn brings opportunities to you. In 6 days, you'll rebuild your headline, About section and experience entries to attract the right recruiters and clients.",
    solves: [
      "Write a headline that says what you do and for whom",
      "Turn your About section into a story, not a job description",
      "Show measurable wins in your experience entries",
      "Get discovered with the right keywords and skills",
    ],
    deliver: [
      "New headline (max 220 characters)",
      "Rewritten About section (3 short paragraphs)",
      "Updated 'Featured' section with 3 items",
      "Top-15 skills list aligned to your target role",
    ],
    criteria: [
      { label: "Clarity", pct: 30, icon: Palette, tone: "amber" },
      { label: "Voice", pct: 25, icon: Smile, tone: "pink" },
      { label: "Keywords", pct: 20, icon: Target, tone: "violet" },
      { label: "Visuals", pct: 15, icon: Star, tone: "success" },
      { label: "Completeness", pct: 10, icon: ListChecks, tone: "muted" },
    ],
    resources: [
      { title: "LinkedIn headline formulas", type: "Template" },
      { title: "About section storyboard", type: "Worksheet" },
      { title: "Skill keyword library", type: "PDF" },
    ],
    requirements: [
      "Public LinkedIn URL submitted",
      "Headline under 220 characters",
      "About section between 1,200 and 2,000 characters",
      "At least 3 items in the Featured section",
    ],
    tasks: [
      { title: "Profile Audit", desc: "Score your current profile against the GIC checklist.", deliverable: "Audit checklist", due: "May 13, 2026" },
      { title: "Headline Rewrite", desc: "Write a clear, keyword-rich headline that says what you do and for whom.", deliverable: "New headline", due: "May 14, 2026" },
      { title: "About Section Story", desc: "Rewrite your About into 3 short, story-driven paragraphs.", deliverable: "Updated About section", due: "May 15, 2026" },
      { title: "Experience Glow Up", desc: "Rewrite your last 2 roles with measurable wins.", deliverable: "Updated experience entries", due: "May 16, 2026" },
      { title: "Skills + Featured", desc: "Curate your top 15 skills and add 3 items to Featured.", deliverable: "Skills + Featured updated", due: "May 17, 2026" },
      { title: "Final Submission", desc: "Submit your public LinkedIn URL for review.", deliverable: "LinkedIn URL", due: "May 18, 2026" },
    ],
  },
  "remote-sprint": {
    id: "remote-sprint",
    title: "Remote Job Hunt Sprint",
    category: "Job Search",
    difficulty: "Intermediate",
    daysLeft: 3,
    participants: 1532,
    submissions: 412,
    startDate: "May 14, 2026",
    endDate: "May 28, 2026 (11:59 PM WAT)",
    prize: "100 Coins + Featured Badge",
    createdBy: "GIC Coaches",
    image: imgRemote,
    tone: "violet",
    about:
      "Apply smarter, not harder. In 15 days, you'll build a focused remote job pipeline, send 15 tailored applications, and follow up with hiring managers in a way that actually gets replies.",
    solves: [
      "Find legitimate remote roles open to candidates in Africa",
      "Tailor applications quickly without burning out",
      "Reach out to hiring managers with a warm, useful message",
      "Track your pipeline so nothing slips through the cracks",
    ],
    deliver: [
      "15 tailored job applications sent",
      "5 outreach messages to hiring managers",
      "A live application tracker (Notion or Sheets)",
      "Weekly review log (3 entries)",
    ],
    criteria: [
      { label: "Targeting", pct: 30, icon: Target, tone: "violet" },
      { label: "Tailoring", pct: 25, icon: Palette, tone: "pink" },
      { label: "Outreach", pct: 20, icon: Send, tone: "amber" },
      { label: "Tracking", pct: 15, icon: ListChecks, tone: "success" },
      { label: "Consistency", pct: 10, icon: Flame, tone: "muted" },
    ],
    resources: [
      { title: "Remote-friendly job boards list", type: "PDF" },
      { title: "Cold outreach message pack", type: "Template" },
      { title: "Application tracker (Notion)", type: "Template" },
    ],
    requirements: [
      "Submit screenshots of 15 application confirmations",
      "Include 5 outreach message threads (anonymised)",
      "Share a link to your tracker (view-only)",
      "Submit 3 weekly reflection notes",
    ],
    tasks: [
      { title: "Define Your Target", desc: "Lock in role, level, regions and 2 must-haves for your search.", deliverable: "1-page target brief", due: "May 15, 2026" },
      { title: "Build Your Pipeline", desc: "Source 30 remote-friendly roles and shortlist your top 15.", deliverable: "Shortlist of 15 roles", due: "May 17, 2026" },
      { title: "Tailor & Send 5 Apps", desc: "Send your first 5 tailored applications using the GIC template.", deliverable: "5 applications sent", due: "May 19, 2026" },
      { title: "Send 10 More Apps", desc: "Send the next 10 tailored applications.", deliverable: "10 applications sent", due: "May 22, 2026" },
      { title: "Hiring Manager Outreach", desc: "Send 5 warm outreach messages to hiring managers.", deliverable: "5 outreach threads", due: "May 24, 2026" },
      { title: "Track & Reflect", desc: "Update your tracker and write 3 weekly reflection notes.", deliverable: "Tracker + 3 reflections", due: "May 26, 2026" },
      { title: "Final Submission", desc: "Submit screenshots, outreach threads and tracker link.", deliverable: "Final pack", due: "May 28, 2026" },
    ],
  },
};

const TOP_PARTICIPANTS = [
  { rank: 1, name: "Adaeze Okafor", xp: 98 },
  { rank: 2, name: "Sneha Iyer", xp: 95 },
  { rank: 3, name: "Funmi Adeyemi", xp: 93 },
  { rank: 4, name: "Chinaza Eze", xp: 91 },
  { rank: 5, name: "Aisha Bello", xp: 90 },
];

const TIMELINE = [
  { label: "Challenge Starts", date: "May 10, 2026", icon: Calendar, tone: "pink" as Tone, active: true },
  { label: "Submissions Open", date: "May 10, 2026", icon: Upload, tone: "violet" as Tone },
  { label: "Submissions Close", date: "May 17, 2026", icon: Clock, tone: "amber" as Tone },
  { label: "Winners Announced", date: "May 19, 2026", icon: Trophy, tone: "success" as Tone },
];

type Tab = "overview" | "requirements" | "tasks" | "resources" | "submissions" | "discussion";

const BASE_TABS: { key: Tab; label: string; count?: number; whenJoined?: boolean; whenNotJoined?: boolean }[] = [
  { key: "overview", label: "Overview" },
  { key: "requirements", label: "Requirements", whenNotJoined: true },
  { key: "tasks", label: "Tasks", whenJoined: true },
  { key: "resources", label: "Resources" },
  { key: "submissions", label: "Submissions" },
  { key: "discussion", label: "Discussion", count: 24 },
];

export default function ChallengeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("overview");
  const [saved, setSaved] = useState(false);
  const [joined, setJoined] = useState(false);
  const [completedTasks, setCompletedTasks] = useState<number[]>([]);

  const data = useMemo<ChallengeDetailData>(
    () => CHALLENGES[id ?? "cv-glow-up"] ?? CHALLENGES["cv-glow-up"],
    [id],
  );
  const tone = TONE[data.tone];

  const TABS = BASE_TABS.filter(
    (t) => (joined ? !t.whenNotJoined : !t.whenJoined),
  );

  const handleJoin = () => {
    setJoined(true);
    setTab("tasks");
  };

  const toggleTask = (idx: number) =>
    setCompletedTasks((c) => (c.includes(idx) ? c.filter((i) => i !== idx) : [...c, idx]));

  const nextTaskIdx = data.tasks.findIndex((_, i) => !completedTasks.includes(i));

  return (
    <div className="w-full animate-fade-in">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-[12px] text-muted-foreground mb-4">
        <Link to="/challenges" className="hover:text-primary inline-flex items-center gap-1 font-medium">
          <ArrowLeft className="w-3.5 h-3.5" /> Challenges
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-foreground font-bold truncate">Challenge Details</span>
      </nav>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* MAIN COLUMN */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <header className="rounded-2xl border border-border bg-card overflow-hidden mb-5">
            <div className="flex flex-col sm:flex-row gap-4 p-4 sm:p-5">
              <div className={cn("relative w-full sm:w-44 aspect-[4/3] sm:aspect-square rounded-xl overflow-hidden shrink-0", tone.bg)}>
                <img
                  src={data.image}
                  alt={`${data.title} cover`}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-[24px] sm:text-[28px] font-serif text-foreground tracking-[-0.02em] leading-tight">
                  {data.title}
                </h1>
                <p className="text-[13px] text-muted-foreground mt-2 leading-relaxed">
                  {data.about.split(".")[0]}.
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-4">
                  <span className={cn("pill text-[10.5px]", tone.bg, tone.fg)}>
                    {data.category}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11.5px] font-bold text-muted-foreground">
                    <Gauge className="w-3.5 h-3.5" /> {data.difficulty}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11.5px] font-bold text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" /> {data.daysLeft} Days Left
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11.5px] font-bold text-muted-foreground">
                    <Users className="w-3.5 h-3.5" /> {data.participants.toLocaleString()} Participants
                  </span>
                </div>
              </div>
            </div>
            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-stretch gap-2 px-4 pb-4 sm:px-5 sm:pb-5">
              <Button
                variant="outline"
                onClick={() => setSaved((s) => !s)}
                className="flex-1 h-10 text-[12.5px] font-bold rounded-xl border-border"
              >
                <Bookmark className={cn("w-4 h-4 mr-1.5", saved && "fill-current text-primary")} />
                {saved ? "Saved" : "Save for Later"}
              </Button>
              <Button className="flex-1 h-10 gradient-primary text-primary-foreground text-[12.5px] font-bold rounded-xl">
                Join Challenge
              </Button>
            </div>
          </header>

          {/* Tabs */}
          <div className="border-b border-border mb-5">
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 -mx-1 px-1">
              {TABS.map((t) => {
                const active = tab === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={cn(
                      "relative whitespace-nowrap px-3 py-2.5 text-[12.5px] font-bold transition-colors",
                      active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {t.label}
                    {t.count !== undefined && (
                      <span className="ml-1 text-muted-foreground/80 font-medium">({t.count})</span>
                    )}
                    {active && (
                      <span className="absolute left-2 right-2 -bottom-px h-[2px] bg-primary rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* OVERVIEW */}
          {tab === "overview" && (
            <div className="space-y-5">
              <section className="rounded-2xl border border-border bg-card p-5">
                <h2 className="text-[15px] font-extrabold text-foreground mb-2">About the Challenge</h2>
                <p className="text-[13px] text-muted-foreground leading-relaxed">{data.about}</p>
                <p className="text-[12.5px] font-bold text-foreground mt-4 mb-2">Your work should solve the following:</p>
                <ul className="space-y-2">
                  {data.solves.map((s) => (
                    <li key={s} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                      <span className="text-[12.5px] text-muted-foreground leading-relaxed">{s}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="rounded-2xl border border-border bg-card p-5">
                <h2 className="text-[15px] font-extrabold text-foreground mb-3">What You'll Deliver</h2>
                <p className="text-[12.5px] text-muted-foreground mb-3">Submit a complete, well-presented entry that includes:</p>
                <ul className="space-y-2">
                  {data.deliver.map((d) => (
                    <li key={d} className="flex items-start gap-2 text-[12.5px] text-muted-foreground leading-relaxed">
                      <span className="w-1.5 h-1.5 rounded-full bg-foreground/60 shrink-0 mt-2" />
                      {d}
                    </li>
                  ))}
                </ul>
              </section>

              <section className="rounded-2xl border border-border bg-card p-5">
                <h2 className="text-[15px] font-extrabold text-foreground mb-4">Evaluation Criteria</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {data.criteria.map((c) => {
                    const Icon = c.icon;
                    const t = TONE[c.tone];
                    return (
                      <div key={c.label} className="flex items-center gap-2.5">
                        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", t.bg)}>
                          <Icon className={cn("w-4 h-4", t.fg)} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[12px] font-extrabold text-foreground truncate">{c.label}</p>
                          <p className="text-[11px] text-muted-foreground">{c.pct}%</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Timeline */}
              <section className="rounded-2xl border border-border bg-card p-5">
                <h2 className="text-[15px] font-extrabold text-foreground mb-4">Challenge Timeline</h2>
                <div className="relative">
                  {/* connector line */}
                  <div className="hidden sm:block absolute left-0 right-0 top-5 h-px border-t border-dashed border-border" />
                  <ol className="grid grid-cols-2 sm:grid-cols-4 gap-4 relative">
                    {TIMELINE.map((tl) => {
                      const Icon = tl.icon;
                      const t = TONE[tl.tone];
                      return (
                        <li key={tl.label} className="flex flex-col items-start gap-2">
                          <div
                            className={cn(
                              "w-10 h-10 rounded-full flex items-center justify-center bg-card border-2",
                              tl.active ? "border-primary" : "border-border",
                              t.bg,
                            )}
                          >
                            <Icon className={cn("w-4 h-4", t.fg)} />
                          </div>
                          <div>
                            <p className={cn("text-[12px] font-extrabold", tl.active ? "text-primary" : "text-foreground")}>
                              {tl.label}
                            </p>
                            <p className="text-[11px] text-muted-foreground font-medium">{tl.date}</p>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              </section>

              {/* Info banner */}
              <div className="rounded-2xl border border-primary-border bg-primary-tint/60 p-4 flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <p className="text-[12.5px] font-bold text-foreground leading-relaxed">
                  Make sure to read all requirements and submit your best work before the deadline!
                </p>
              </div>
            </div>
          )}

          {/* REQUIREMENTS */}
          {tab === "requirements" && (
            <section className="rounded-2xl border border-border bg-card p-5">
              <h2 className="text-[15px] font-extrabold text-foreground mb-3">Submission Requirements</h2>
              <ul className="space-y-2.5">
                {data.requirements.map((r) => (
                  <li key={r} className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                    <span className="text-[12.5px] text-muted-foreground leading-relaxed">{r}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* RESOURCES */}
          {tab === "resources" && (
            <section className="rounded-2xl border border-border bg-card p-5">
              <h2 className="text-[15px] font-extrabold text-foreground mb-3">Helpful Resources</h2>
              <ul className="divide-y divide-border">
                {data.resources.map((r) => (
                  <li key={r.title} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12.5px] font-extrabold text-foreground truncate">{r.title}</p>
                      <p className="text-[11px] text-muted-foreground">{r.type}</p>
                    </div>
                    <Button size="sm" variant="outline" className="h-8 text-[11.5px] font-bold rounded-xl">
                      Open
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* SUBMISSIONS */}
          {tab === "submissions" && (
            <section className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-14 text-center">
              <div className="w-14 h-14 rounded-2xl bg-primary-tint flex items-center justify-center mx-auto mb-4">
                <Upload className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-[18px] font-serif text-foreground tracking-[-0.01em]">
                No public submissions <em>yet</em>
              </h3>
              <p className="text-[12.5px] text-muted-foreground mt-1.5 max-w-sm mx-auto leading-relaxed">
                Submissions go live after the deadline. Be among the first — join the challenge and start working on yours.
              </p>
            </section>
          )}

          {/* DISCUSSION */}
          {tab === "discussion" && (
            <section className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-14 text-center">
              <div className="w-14 h-14 rounded-2xl bg-secondary-tint flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-6 h-6 text-secondary" />
              </div>
              <h3 className="text-[18px] font-serif text-foreground tracking-[-0.01em]">
                Join the <em>conversation</em>
              </h3>
              <p className="text-[12.5px] text-muted-foreground mt-1.5 max-w-sm mx-auto leading-relaxed">
                Ask questions, share progress and cheer each other on. Discussion opens to participants only.
              </p>
            </section>
          )}
        </div>

        {/* RIGHT RAIL */}
        <aside className="w-full lg:w-[320px] shrink-0 space-y-4">
          {/* Challenge Details */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-[13px] font-extrabold text-foreground mb-3">Challenge Details</p>
            <ul className="text-[12px]">
              <DetailRow icon={User} label="Created by" value={data.createdBy} />
              <DetailRow icon={Target} label="Challenge Type" value={data.category} />
              <DetailRow icon={Gauge} label="Difficulty Level" value={data.difficulty} />
              <DetailRow icon={Users} label="Participants" value={data.participants.toLocaleString()} />
              <DetailRow icon={Upload} label="Submissions" value={data.submissions.toLocaleString()} />
              <DetailRow icon={Calendar} label="Start Date" value={data.startDate} />
              <DetailRow icon={Calendar} label="End Date" value={data.endDate} />
              <DetailRow
                icon={Trophy}
                label="Prize"
                value={
                  <span className="inline-flex items-center gap-1 text-foreground font-extrabold">
                    <Sparkles className="w-3 h-3 text-amber" /> {data.prize}
                  </span>
                }
                last
              />
            </ul>

            {/* Share */}
            <div className="border-t border-border pt-3 mt-3">
              <p className="text-[12px] font-extrabold text-foreground mb-2.5">Share Challenge</p>
              <div className="flex items-center gap-2">
                <ShareBtn icon={LinkIcon} label="Copy link" />
                <ShareBtn icon={Copy} label="Copy" />
                <ShareBtn icon={Linkedin} label="LinkedIn" />
                <ShareBtn icon={Send} label="Share" />
              </div>
            </div>
          </div>

          {/* Top Participants */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[13px] font-extrabold text-foreground">Top Participants</p>
              <button
                onClick={() => navigate("/challenges")}
                className="text-[11.5px] font-bold text-primary hover:underline inline-flex items-center gap-1"
              >
                View Full Leaderboard <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <ul className="space-y-1.5">
              {TOP_PARTICIPANTS.map((p) => (
                <li key={p.rank} className="flex items-center gap-2.5 rounded-lg p-1.5">
                  <div
                    className={cn(
                      "w-6 h-6 rounded-full text-[10.5px] font-extrabold flex items-center justify-center shrink-0",
                      p.rank === 1 && "bg-amber text-white",
                      p.rank === 2 && "bg-muted-foreground/40 text-foreground",
                      p.rank === 3 && "bg-secondary text-secondary-foreground",
                      p.rank > 3 && "bg-muted text-muted-foreground",
                    )}
                  >
                    {p.rank}
                  </div>
                  <div className="w-7 h-7 rounded-full bg-primary-tint text-primary text-[10px] font-extrabold flex items-center justify-center shrink-0">
                    {p.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </div>
                  <span className="text-[12px] font-bold text-foreground flex-1 truncate">{p.name}</span>
                  <span className="text-[11px] font-extrabold text-success">{p.xp}</span>
                </li>
              ))}
              <li className="flex items-center gap-2.5 rounded-lg p-1.5 bg-primary-tint/60 mt-2">
                <div className="w-6 h-6 rounded-full text-[10.5px] font-extrabold flex items-center justify-center shrink-0 bg-muted text-muted-foreground">
                  24
                </div>
                <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground text-[10px] font-extrabold flex items-center justify-center shrink-0">
                  YOU
                </div>
                <span className="text-[12px] font-bold text-foreground flex-1 truncate">You</span>
                <span className="text-[11px] font-extrabold text-success">78</span>
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
  last,
}: {
  icon: typeof User;
  label: string;
  value: React.ReactNode;
  last?: boolean;
}) {
  return (
    <li className={cn("flex items-center gap-2.5 py-2", !last && "border-b border-border/60")}>
      <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      <span className="text-muted-foreground font-medium">{label}</span>
      <span className="ml-auto text-foreground font-extrabold text-right truncate max-w-[55%]">{value}</span>
    </li>
  );
}

function ShareBtn({ icon: Icon, label }: { icon: typeof LinkIcon; label: string }) {
  return (
    <button
      aria-label={label}
      className="w-9 h-9 rounded-full bg-muted hover:bg-primary-tint hover:text-primary text-muted-foreground flex items-center justify-center transition-colors"
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}
