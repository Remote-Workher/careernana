import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Play,
  Pause,
  CheckCircle2,
  Circle,
  Star,
  BookOpen,
  Clock,
  ChevronRight,
  FileText,
  Download,
  HelpCircle,
  Volume2,
  Maximize,
  Settings,
  Lock,
  Loader2,
} from "lucide-react";
import { courses } from "@/data/courses";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { isEnrolled, enroll } from "@/lib/course-enrollment";
import { consumeQuota, type QuotaResult } from "@/hooks/usePlanTier";
import TierPaywall from "@/components/TierPaywall";
import PremiumUpsellModal from "@/components/PremiumUpsellModal";
import { openUpgradeModal } from "@/lib/upgrade-modal";

interface Lesson {
  id: string;
  title: string;
  duration: string;
  completed?: boolean;
  current?: boolean;
}
interface Module {
  id: string;
  title: string;
  lessons: Lesson[];
}

const buildCurriculum = (totalLessons: number): Module[] => {
  const base: Module[] = [
    {
      id: "m1",
      title: "Getting Started",
      lessons: [
        { id: "l1", title: "Welcome to Remote Work", duration: "12:18", current: true },
        { id: "l2", title: "Setting Up Your Workspace", duration: "10:45", completed: true },
        { id: "l3", title: "Essential Tools for Remote Work", duration: "08:30", completed: true },
      ],
    },
    {
      id: "m2",
      title: "Communication",
      lessons: [
        { id: "l4", title: "Effective Communication Online", duration: "11:20" },
        { id: "l5", title: "Writing Emails That Get Responses", duration: "09:15" },
      ],
    },
    {
      id: "m3",
      title: "Productivity",
      lessons: [
        { id: "l6", title: "Time Management for Remote Workers", duration: "13:40" },
        { id: "l7", title: "Staying Focused & Avoiding Distractions", duration: "11:05" },
      ],
    },
    {
      id: "m4",
      title: "Career Growth",
      lessons: [
        { id: "l8", title: "Building Your Personal Brand", duration: "12:30" },
        { id: "l9", title: "Finding Remote Job Opportunities", duration: "15:10" },
      ],
    },
  ];
  return base;
};

type ResourceItem = { id: string; name: string; type: string; url?: string | null };

export default function CourseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const fallback = useMemo(() => courses.find((c) => c.id === id) ?? courses[0], [id]);
  const [dbCourse, setDbCourse] = useState<{ title: string; cover: string; price: number } | null>(null);
  const course = useMemo(
    () => dbCourse ? { ...fallback, title: dbCourse.title, cover: dbCourse.cover, priceNaira: dbCourse.price } : fallback,
    [fallback, dbCourse],
  );
  const [modules, setModules] = useState<Module[]>(buildCurriculum(fallback.lessons));
  const [activeLessonId, setActiveLessonId] = useState<string>("l1");
  const [tab, setTab] = useState<"about" | "resources">("about");
  const [playing, setPlaying] = useState(false);
  const [note, setNote] = useState("");
  const [noteLoading, setNoteLoading] = useState(false);
  const [noteSaving, setNoteSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [resources, setResources] = useState<ResourceItem[]>([]);

  // Load real course from DB (admin-managed). Falls back to mock if missing.
  useEffect(() => {
    if (!id) return;
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_RE.test(id)) return;
    (async () => {
      const { data } = await supabase
        .from("courses")
        .select("title,image_url,price")
        .eq("id", id)
        .maybeSingle();
      if (data) {
        setDbCourse({
          title: data.title,
          cover: data.image_url || fallback.cover,
          price: Number(data.price ?? 0),
        });
      }
    })();
  }, [id, fallback.cover]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("course_resources" as any)
        .select("*")
        .eq("course_id", course.id)
        .order("position", { ascending: true });
      setResources(((data as any[]) || []).map((r) => ({ id: r.id, name: r.title, type: r.file_type || "Link", url: r.url })));
    })();
  }, [course.id]);

  // Load saved note for the active lesson whenever it (or the user) changes.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;
      setUserId(user?.id ?? null);
      if (!user) { setNote(""); return; }
      setNoteLoading(true);
      const { data } = await supabase
        .from("lesson_notes")
        .select("content")
        .eq("user_id", user.id)
        .eq("course_id", course.id)
        .eq("lesson_id", activeLessonId)
        .maybeSingle();
      if (cancelled) return;
      setNote(data?.content ?? "");
      setNoteLoading(false);
    })();
    return () => { cancelled = true; };
  }, [course.id, activeLessonId]);

  const saveNote = async () => {
    if (!userId) { toast.error("Sign in to save notes"); return; }
    if (!note.trim()) return;
    setNoteSaving(true);
    const { error } = await supabase
      .from("lesson_notes")
      .upsert(
        { user_id: userId, course_id: course.id, lesson_id: activeLessonId, content: note.trim() },
        { onConflict: "user_id,course_id,lesson_id" }
      );
    setNoteSaving(false);
    if (error) { toast.error("Couldn't save note"); return; }
    toast.success("Note saved");
  };

  // ── Access gate ──────────────────────────────────────────────
  // The player can only run the lesson UI when the user is signed in,
  // has an active membership, and is enrolled in this course (i.e. they
  // already burned a monthly course-quota slot for it).
  const [gateState, setGateState] = useState<"checking" | "allowed" | "blocked">("checking");
  const [paywall, setPaywall] = useState<QuotaResult | null>(null);
  const [upsellOpen, setUpsellOpen] = useState(false);
  const enrolled = gateState === "allowed";

  // Courses are locked behind Premium for everyone right now — show a single
  // "Upgrade to Premium to watch course" screen regardless of plan tier.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;
      setUserId(user?.id ?? null);
      setGateState("blocked");
    })();
    return () => {
      cancelled = true;
    };
  }, [course.id, navigate]);

  const flatLessons = modules.flatMap((m) => m.lessons);
  const completedCount = flatLessons.filter((l) => l.completed).length;
  const totalLessons = flatLessons.length;
  const progressPct = Math.round((completedCount / totalLessons) * 100);
  const activeLesson =
    flatLessons.find((l) => l.id === activeLessonId) ?? flatLessons[0];
  const activeIndex = flatLessons.findIndex((l) => l.id === activeLessonId);

  const requireEnrolled = (action: () => void) => {
    if (!enrolled) {
      toast.error("Enroll in this course to continue.");
      return;
    }
    action();
  };

  const markComplete = () => requireEnrolled(() => {
    setModules((mods) =>
      mods.map((m) => ({
        ...m,
        lessons: m.lessons.map((l) =>
          l.id === activeLessonId ? { ...l, completed: true } : l
        ),
      }))
    );
    toast.success("Lesson marked complete");
  });

  const goNext = () => requireEnrolled(() => {
    const next = flatLessons[activeIndex + 1];
    if (next) setActiveLessonId(next.id);
  });

  const handleLessonSelect = (lessonId: string) => requireEnrolled(() => {
    setActiveLessonId(lessonId);
  });

  const togglePlay = () => requireEnrolled(() => setPlaying((p) => !p));


  return (
    <div className="font-sans pb-10">
      {/* Breadcrumb + back */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <nav className="flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
          <Link to="/courses" className="hover:text-primary">Learn</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link
            to={`/courses?category=${encodeURIComponent(course.category)}`}
            className="hover:text-primary"
          >
            {course.category}
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-foreground font-semibold">{course.title.split(":")[0]}</span>
        </nav>
        <button
          onClick={() => navigate("/courses")}
          className="flex items-center gap-2 px-4 py-2 border border-primary-border rounded-lg text-primary text-[13px] font-semibold hover:bg-primary-tint transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Learn
        </button>
      </div>

      {/* Premium-only notice for non-enrolled users */}
      {!enrolled && (
        <div className="mb-6 rounded-2xl border border-primary-border bg-gradient-to-br from-primary-tint/70 to-primary-tint/20 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="w-10 h-10 rounded-full bg-card flex items-center justify-center shrink-0 shadow-sm">
              <Lock className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-[13.5px] font-extrabold text-foreground leading-tight mb-1">
                Premium-only course
              </p>
              <p className="text-[12px] text-foreground/75 leading-snug">
                Courses are included with Remote Workher Premium — unlimited access for ₦20,000/month. Upgrade to start watching.
              </p>
            </div>
          </div>
          <button
            onClick={() => openUpgradeModal({ planId: "pro" })}
            className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-[12.5px] font-bold whitespace-nowrap shadow-button hover:opacity-95 transition-opacity self-stretch sm:self-auto"
          >
            Unlock with Premium →
          </button>
        </div>
      )}

      {/* Title block */}
      <div className="mb-6">
        <h1 className="headline text-[26px] md:text-[32px] text-foreground leading-[1.15] mb-3">
          {course.title}
        </h1>
        <div className="flex items-center gap-5 flex-wrap text-[12.5px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Star className="w-4 h-4 fill-amber text-amber" />
            <span className="font-semibold text-foreground">{course.rating}</span>
            <span>({course.reviews.toLocaleString()} reviews)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <BookOpen className="w-4 h-4" /> {course.level}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" /> {totalLessons} Lessons
          </span>
        </div>
      </div>

      {/* 3-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Player + lesson info */}
        <div className="lg:col-span-8 space-y-5">
          {/* Video player */}
          <div className="hub-card overflow-hidden">
            <div className="relative aspect-video bg-foreground">
              <img
                src={course.cover}
                alt=""
                className={`absolute inset-0 w-full h-full object-cover transition-all ${
                  enrolled ? "opacity-80" : "opacity-30 blur-sm"
                }`}
              />
              {enrolled ? (
                <button
                  onClick={togglePlay}
                  aria-label={playing ? "Pause" : "Play"}
                  className="absolute inset-0 flex items-center justify-center group"
                >
                  <span className="w-16 h-16 rounded-full bg-card/90 backdrop-blur flex items-center justify-center shadow-xl group-hover:scale-105 transition-transform">
                    {playing ? (
                      <Pause className="w-7 h-7 text-foreground" />
                    ) : (
                      <Play className="w-7 h-7 text-foreground fill-current ml-1" />
                    )}
                  </span>
                </button>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
                  <span className="w-14 h-14 rounded-full bg-card/95 backdrop-blur flex items-center justify-center shadow-xl mb-3">
                    <Lock className="w-6 h-6 text-foreground" />
                  </span>
                  <p className="text-white text-[15px] font-bold mb-1">
                    Join Remote Workher Premium to watch
                  </p>
                  <p className="text-white/80 text-[12px] max-w-[340px] mb-3">
                    Every course is included with Premium — unlimited access for ₦20,000/month.
                  </p>
                  <button
                    onClick={() => openUpgradeModal({ planId: "pro" })}
                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-[12.5px] font-semibold"
                  >
                    Join Remote Workher to watch
                  </button>
                </div>
              )}

              {/* Controls bar */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3">
                <div className="h-1 bg-white/25 rounded-full overflow-hidden mb-2.5">
                  <div className="h-full bg-primary rounded-full" style={{ width: enrolled ? "45%" : "0%" }} />
                </div>
                <div className="flex items-center justify-between text-white">
                  <div className="flex items-center gap-3">
                    <button onClick={togglePlay} aria-label="Play/Pause" disabled={!enrolled} className={!enrolled ? "opacity-50 cursor-not-allowed" : ""}>
                      {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                    </button>
                    <Volume2 className="w-4 h-4" />
                    <span className="text-[11.5px] font-medium">{enrolled ? "05:42" : "00:00"} / {activeLesson.duration}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11.5px] font-semibold">1x</span>
                    <Settings className="w-4 h-4" />
                    <Maximize className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Lesson title + complete */}
          <div className="card-surface !p-5">
            <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
              <div>
                <h2 className="text-[17px] font-bold text-foreground mb-1">
                  {activeIndex + 1}. {activeLesson.title}
                </h2>
                <p className="text-[12.5px] text-muted-foreground">
                  Understand what remote work is and the mindset you need to succeed.
                </p>
              </div>
              <button
                onClick={markComplete}
                disabled={!enrolled}
                className={`flex items-center gap-2 px-4 py-2 border border-primary-border rounded-lg text-primary text-[12.5px] font-semibold transition-colors ${
                  enrolled ? "hover:bg-primary-tint" : "opacity-50 cursor-not-allowed"
                }`}
              >
                {enrolled ? <CheckCircle2 className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                {enrolled ? "Mark as Complete" : "Locked"}
              </button>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-6 border-b border-border mb-4">
              <button
                onClick={() => setTab("about")}
                className={`pb-2.5 text-[13px] font-semibold transition-colors ${
                  tab === "about"
                    ? "text-primary border-b-2 border-primary -mb-px"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                About this lesson
              </button>
              <button
                onClick={() => setTab("resources")}
                className={`pb-2.5 text-[13px] font-semibold transition-colors ${
                  tab === "resources"
                    ? "text-primary border-b-2 border-primary -mb-px"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Resources
              </button>
            </div>

            {tab === "about" ? (
              <div>
                <p className="text-[13px] text-foreground/80 mb-4 leading-relaxed">
                  In this lesson, you'll learn what remote work really means, the benefits, the
                  challenges, and the mindset shift that will set you up for success.
                </p>
                <div className="bg-secondary-tint/50 border border-secondary/20 rounded-lg p-4">
                  <p className="text-[12.5px] font-bold text-foreground mb-2">What you'll learn:</p>
                  <ul className="space-y-1.5">
                    {[
                      "What remote work is (and isn't)",
                      "Key benefits of working remotely",
                      "Common challenges and how to overcome them",
                      "The remote work mindset",
                    ].map((b) => (
                      <li key={b} className="flex items-start gap-2 text-[12.5px] text-foreground/85">
                        <CheckCircle2 className="w-3.5 h-3.5 text-success mt-0.5 shrink-0" />
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : resources.length === 0 ? (
              <p className="text-[12.5px] text-muted-foreground text-center py-6">No resources attached to this course yet.</p>
            ) : (
              <div className="space-y-2">
                {resources.map((r) => (
                  <div key={r.id} className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/40 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-md bg-primary-tint flex items-center justify-center">
                        <FileText className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold text-foreground">{r.name}</p>
                        <p className="text-[11px] text-muted-foreground">{r.type}</p>
                      </div>
                    </div>
                    <a href={r.url || "#"} target="_blank" rel="noopener" className="p-2 hover:bg-muted rounded-md" aria-label={`Download ${r.name}`}>
                      <Download className="w-4 h-4 text-muted-foreground" />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Rate + note */}
          <div className="card-surface !p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <p className="text-[12.5px] font-bold text-foreground mb-2">Rate this lesson</p>
              <div className="flex items-center gap-2">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star key={n} className="w-5 h-5 fill-amber text-amber" />
                  ))}
                </div>
                <span className="text-[12px] text-muted-foreground">
                  {course.rating} ({course.reviews.toLocaleString()} ratings)
                </span>
              </div>
            </div>
            <div>
              <p className="text-[12.5px] font-bold text-foreground mb-2">Add a note</p>
              <div className="flex items-center gap-2">
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={noteLoading ? "Loading saved note…" : "Write your personal notes for this lesson..."}
                  disabled={noteLoading}
                  className="flex-1 px-3 py-2 rounded-lg border border-border bg-card text-[12.5px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-60"
                />
                <button
                  onClick={saveNote}
                  disabled={noteSaving || noteLoading || !note.trim()}
                  className="px-4 py-2 bg-secondary hover:bg-secondary/90 text-secondary-foreground rounded-lg text-[12.5px] font-semibold disabled:opacity-60"
                >
                  {noteSaving ? "Saving…" : "Save Note"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar: curriculum + progress */}
        <div className="lg:col-span-4 space-y-5">
          {/* Progress — only for enrolled members */}
          {enrolled && (
            <div className="card-surface !p-5">
              <p className="text-[14px] font-extrabold text-foreground mb-4">Your Progress</p>
              <div className="flex items-center justify-center mb-3">
                <ProgressRing pct={progressPct} />
              </div>
              <p className="text-center text-[12px] text-muted-foreground mb-4">Course Progress</p>
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
                <div className="text-center">
                  <p className="text-[18px] font-extrabold text-foreground leading-none">
                    {completedCount}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">Lessons Completed</p>
                </div>
                <div className="text-center">
                  <p className="text-[18px] font-extrabold text-foreground leading-none">3h 20m</p>
                  <p className="text-[11px] text-muted-foreground mt-1">Time Spent</p>
                </div>
              </div>
            </div>
          )}

          {/* Curriculum */}
          <div className="card-surface !p-0 overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <p className="text-[14px] font-extrabold text-foreground">Course Curriculum</p>
            </div>
            <div className="max-h-[520px] overflow-y-auto">
              {modules.map((m, mi) => {
                const done = m.lessons.filter((l) => l.completed).length;
                return (
                  <div key={m.id} className={mi !== modules.length - 1 ? "border-b border-border" : ""}>
                    <div className="px-5 py-3 bg-muted/30 flex items-center justify-between">
                      <p className="text-[12.5px] font-bold text-foreground">
                        Module {mi + 1}: <span className="font-semibold">{m.title}</span>
                      </p>
                      <span className="text-[11px] text-muted-foreground">
                        {done} / {m.lessons.length}
                      </span>
                    </div>
                    <ul>
                      {m.lessons.map((l) => {
                        const isActive = l.id === activeLessonId;
                        return (
                          <li key={l.id}>
                            <button
                              onClick={() => handleLessonSelect(l.id)}
                              className={`w-full flex items-center gap-3 px-5 py-2.5 text-left transition-colors ${
                                isActive ? "bg-primary-tint/60" : "hover:bg-muted/40"
                              }`}
                            >
                              {l.completed ? (
                                <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                              ) : isActive ? (
                                <span className="w-4 h-4 rounded-full bg-primary flex items-center justify-center shrink-0">
                                  <Play className="w-2 h-2 text-primary-foreground fill-current" />
                                </span>
                              ) : (
                                <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
                              )}
                              <span
                                className={`flex-1 text-[12.5px] truncate ${
                                  isActive ? "text-primary font-semibold" : "text-foreground"
                                }`}
                              >
                                {l.title}
                              </span>
                              <span className="text-[11px] text-muted-foreground shrink-0">
                                {l.duration}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
            <div className="p-4 border-t border-border">
              <button
                onClick={goNext}
                disabled={!enrolled}
                className={`w-full py-2.5 bg-secondary text-secondary-foreground rounded-lg text-[13px] font-semibold flex items-center justify-center gap-1.5 ${
                  enrolled ? "hover:bg-secondary/90" : "opacity-50 cursor-not-allowed"
                }`}
              >
                {enrolled ? "Next Lesson" : "Locked"} <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Course resources */}
          <div className="card-surface !p-5">
            <p className="text-[14px] font-extrabold text-foreground mb-3">Course Resources</p>
            <div className="space-y-2">
              {resources.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between p-2.5 border border-border rounded-lg hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-md bg-primary-tint flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[12.5px] font-semibold text-foreground truncate">{r.name}</p>
                      <p className="text-[10.5px] text-muted-foreground">{r.type}</p>
                    </div>
                  </div>
                  <button className="p-1.5 hover:bg-muted rounded-md shrink-0" aria-label={`Download ${r.name}`}>
                    <Download className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Need help */}
          <div className="card-surface !p-5">
            <div className="flex items-center gap-2 mb-2">
              <HelpCircle className="w-4 h-4 text-primary" />
              <p className="text-[14px] font-extrabold text-foreground">Need Help?</p>
            </div>
            <p className="text-[12px] text-muted-foreground mb-3">
              Stuck on something? Our support team is here to help you.
            </p>
            <button className="w-full py-2 border border-primary-border rounded-lg text-primary text-[12.5px] font-semibold hover:bg-primary-tint transition-colors">
              Contact Support
            </button>
          </div>
        </div>
      </div>

      <TierPaywall
        open={!!paywall}
        onClose={() => setPaywall(null)}
        result={paywall}
        kind="course"
      />
    </div>
  );
}

function ProgressRing({ pct }: { pct: number }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <div className="relative w-[110px] h-[110px]">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} stroke="hsl(var(--muted))" strokeWidth="8" fill="none" />
        <circle
          cx="50"
          cy="50"
          r={r}
          stroke="hsl(var(--secondary))"
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 400ms ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[22px] font-extrabold text-foreground">{pct}%</span>
      </div>
    </div>
  );
}
