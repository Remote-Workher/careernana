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
import { consumeQuota, usePlanTier, type QuotaResult } from "@/hooks/usePlanTier";
import TierPaywall from "@/components/TierPaywall";
import { openUpgradeModal } from "@/lib/upgrade-modal";
import { extractYoutubeId } from "@/lib/youtube";
import { useSEO } from "@/components/SEO";


function getEmbedUrl(url?: string | null): string | null {
  if (!url) return null;
  const u = url.trim();
  // Loom
  const loom = u.match(/loom\.com\/(?:share|embed)\/([a-f0-9]+)/i);
  if (loom) return `https://www.loom.com/embed/${loom[1]}`;
  // Vimeo
  const vimeo = u.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  // YouTube
  const yt = extractYoutubeId(u);
  if (yt) return `https://www.youtube.com/embed/${yt}`;
  return u;
}

type DbLesson = {
  id: string;
  title: string;
  duration: string;
  description?: string | null;
  video_url?: string | null;
  thumbnail_url?: string | null;
  completed?: boolean;
};

type ResourceItem = { id: string; name: string; type: string; url?: string | null };

type DbCourse = {
  title: string;
  cover: string;
  price: number;
  description?: string | null;
  instructor?: string | null;
  instructor_avatar_url?: string | null;
  level?: string | null;
  rating?: number | null;
  reviews?: number | null;
  is_coming_soon?: boolean;
};

export default function CourseDetail() {
  useSEO({ title: "Course Detail" });
  const { id } = useParams();
  const navigate = useNavigate();
  const fallback = useMemo(() => courses.find((c) => c.id === id) ?? courses[0], [id]);
  const [dbCourse, setDbCourse] = useState<DbCourse | null>(null);
  const course = useMemo(
    () => dbCourse ? {
      ...fallback,
      title: dbCourse.title,
      cover: dbCourse.cover,
      priceNaira: dbCourse.price,
      instructor: dbCourse.instructor || fallback.instructor,
      instructorAvatar: dbCourse.instructor_avatar_url || fallback.instructorAvatar,
      level: (dbCourse.level as any) || fallback.level,
      rating: dbCourse.rating ?? 0,
      reviews: dbCourse.reviews ?? 0,
      description: dbCourse.description ?? "",
    } : { ...fallback, description: "" as string },
    [fallback, dbCourse],
  );
  const [lessons, setLessons] = useState<DbLesson[]>([]);
  const [activeLessonId, setActiveLessonId] = useState<string>("");
  const [tab, setTab] = useState<"about" | "resources">("about");
  const [note, setNote] = useState("");
  const [noteLoading, setNoteLoading] = useState(false);
  const [noteSaving, setNoteSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [myRating, setMyRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [savingRating, setSavingRating] = useState(false);
  const { loading: planLoading, tier, isPaidActive } = usePlanTier();
  const enrolled = !planLoading && isPaidActive && tier === "premium";

  useEffect(() => {
    if (!id) return;
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_RE.test(id)) return;
    (async () => {
      const { data } = await supabase
        .from("courses")
        .select("title,image_url,price,description,instructor,instructor_avatar_url,level,rating,reviews,is_coming_soon")
        .eq("id", id)
        .maybeSingle();
      if (data) {
        setDbCourse({
          title: data.title,
          cover: data.image_url || fallback.cover,
          price: Number(data.price ?? 0),
          description: data.description,
          instructor: data.instructor,
          instructor_avatar_url: data.instructor_avatar_url,
          level: data.level,
          rating: Number(data.rating ?? 0),
          reviews: Number(data.reviews ?? 0),
          is_coming_soon: !!data.is_coming_soon,
        });
      }
    })();
  }, [id, fallback.cover]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase
        .from("course_lessons" as any)
        .select("id,title,duration,description,video_url,thumbnail_url,position")
        .eq("course_id", id)
        .order("position", { ascending: true });
      const rows = ((data as any[]) || []).map((l: any) => ({
        id: l.id,
        title: l.title,
        duration: l.duration || "",
        description: l.description,
        video_url: l.video_url,
        thumbnail_url: l.thumbnail_url,
      }));
      setLessons(rows);
      setActiveLessonId((cur) => cur || (rows[0]?.id ?? ""));
    })();
  }, [id]);

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

  useEffect(() => {
    if (!activeLessonId) return;
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

  // Load this user's existing rating for the course
  useEffect(() => {
    if (!userId || !id) { setMyRating(0); return; }
    (async () => {
      const { data } = await supabase
        .from("course_ratings" as any)
        .select("rating")
        .eq("user_id", userId)
        .eq("course_id", id)
        .maybeSingle();
      setMyRating(((data as any)?.rating as number) || 0);
    })();
  }, [userId, id]);

  const saveRating = async (value: number) => {
    if (!userId) { toast.error("Sign in to rate this course"); return; }
    if (!id) return;
    setSavingRating(true);
    const { error } = await supabase
      .from("course_ratings" as any)
      .upsert(
        { user_id: userId, course_id: id, rating: value },
        { onConflict: "course_id,user_id" },
      );
    setSavingRating(false);
    if (error) { toast.error("Couldn't save rating"); return; }
    setMyRating(value);
    // Refresh course aggregates
    const { data: c } = await supabase
      .from("courses")
      .select("rating,reviews")
      .eq("id", id)
      .maybeSingle();
    if (c && dbCourse) {
      setDbCourse({ ...dbCourse, rating: Number(c.rating ?? 0), reviews: Number(c.reviews ?? 0) });
    }
    toast.success("Thanks for rating!");
  };

  const [paywall, setPaywall] = useState<QuotaResult | null>(null);

  const completedCount = lessons.filter((l) => l.completed).length;
  const totalLessons = lessons.length;
  const progressPct = totalLessons ? Math.round((completedCount / totalLessons) * 100) : 0;
  const activeLesson = lessons.find((l) => l.id === activeLessonId) ?? lessons[0];
  const activeIndex = Math.max(0, lessons.findIndex((l) => l.id === activeLessonId));
  const embedUrl = getEmbedUrl(activeLesson?.video_url);

  const requireEnrolled = (action: () => void) => {
    if (planLoading) return;
    if (!enrolled) { toast.error("Upgrade to Premium to continue."); return; }
    action();
  };

  const markComplete = () => requireEnrolled(() => {
    setLessons((ls) => ls.map((l) => l.id === activeLessonId ? { ...l, completed: true } : l));
    toast.success("Lesson marked complete");
  });

  const goNext = () => requireEnrolled(() => {
    const next = lessons[activeIndex + 1];
    if (next) setActiveLessonId(next.id);
  });

  const handleLessonSelect = (lessonId: string) => requireEnrolled(() => {
    setActiveLessonId(lessonId);
  });


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

      {/* Coming Soon notice */}
      {dbCourse?.is_coming_soon && (
        <div className="mb-6 rounded-2xl border border-amber/30 bg-gradient-to-br from-amber/20 to-amber/5 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="w-10 h-10 rounded-full bg-amber/15 flex items-center justify-center shrink-0 shadow-sm">
              <Clock className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <p className="text-[13.5px] font-extrabold text-foreground leading-tight mb-1">
                Coming Soon
              </p>
              <p className="text-[12px] text-foreground/75 leading-snug">
                This course is being prepared. You can preview the details now — lessons will be available shortly.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Premium-only notice for non-enrolled users */}
      {!planLoading && !enrolled && !dbCourse?.is_coming_soon && (
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
          {course.reviews > 0 && (
            <span className="flex items-center gap-1.5">
              <Star className="w-4 h-4 fill-amber text-amber" />
              <span className="font-semibold text-foreground">{course.rating}</span>
              <span>({course.reviews.toLocaleString()} reviews)</span>
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <BookOpen className="w-4 h-4" /> {course.level}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" /> {totalLessons} {totalLessons === 1 ? "Lesson" : "Lessons"}
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
              {planLoading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-card">
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                </div>
              ) : enrolled && embedUrl ? (
                <iframe
                  src={embedUrl}
                  title={activeLesson?.title || "Lesson"}
                  className="absolute inset-0 w-full h-full"
                  frameBorder={0}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <>
                  <img
                    src={activeLesson?.thumbnail_url || course.cover}
                    alt=""
                    className={`absolute inset-0 w-full h-full object-cover transition-all ${
                      enrolled ? "opacity-80" : "opacity-30 blur-sm"
                    }`}
                  />
                  {enrolled ? (
                    <div className="absolute inset-0 flex items-center justify-center text-center px-6">
                      <p className="text-white/90 text-[13px]">No video for this lesson yet.</p>
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
                      <span className="w-14 h-14 rounded-full bg-card/95 backdrop-blur flex items-center justify-center shadow-xl mb-3">
                        <Lock className="w-6 h-6 text-foreground" />
                      </span>
                      <p className="text-white text-[15px] font-bold mb-1">
                        Upgrade to Premium to watch
                      </p>
                      <p className="text-white/80 text-[12px] max-w-[340px] mb-3">
                        Every course is included with Premium — unlimited access for ₦20,000/month.
                      </p>
                      <button
                        onClick={() => openUpgradeModal({ planId: "pro" })}
                        className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-[12.5px] font-semibold"
                      >
                        Upgrade to Premium
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Lesson title + complete */}
          <div className="card-surface !p-5">
            <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
              <div>
                <h2 className="text-[17px] font-bold text-foreground mb-1">
                  {activeIndex + 1}. {activeLesson?.title || "Select a lesson"}
                </h2>
                {activeLesson?.description && (
                  <p className="text-[12.5px] text-muted-foreground">
                    {activeLesson.description}
                  </p>
                )}
              </div>


              <button
                onClick={markComplete}
                disabled={planLoading || !enrolled}
                className={`flex items-center gap-2 px-4 py-2 border border-primary-border rounded-lg text-primary text-[12.5px] font-semibold transition-colors ${
                  enrolled ? "hover:bg-primary-tint" : "opacity-50 cursor-not-allowed"
                }`}
              >
                {planLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : enrolled ? <CheckCircle2 className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                {planLoading ? "Checking…" : enrolled ? "Mark as Complete" : "Locked"}
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
                <p className="text-[13px] text-foreground/80 leading-relaxed whitespace-pre-line">
                  {activeLesson?.description || course.description || "No description yet."}
                </p>
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
              <p className="text-[12.5px] font-bold text-foreground mb-2">Rate this course</p>
              <div className="flex items-center gap-2">
                <div className="flex" onMouseLeave={() => setHoverRating(0)}>
                  {[1, 2, 3, 4, 5].map((n) => {
                    const filled = (hoverRating || myRating) >= n;
                    return (
                      <button
                        key={n}
                        type="button"
                        disabled={savingRating}
                        onMouseEnter={() => setHoverRating(n)}
                        onClick={() => saveRating(n)}
                        className="p-0.5 disabled:opacity-60 hover:scale-110 transition-transform"
                        aria-label={`Rate ${n} star${n > 1 ? "s" : ""}`}
                      >
                        <Star
                          className={`w-5 h-5 ${filled ? "fill-amber text-amber" : "text-muted-foreground/40"}`}
                        />
                      </button>
                    );
                  })}
                </div>
                <span className="text-[12px] text-muted-foreground">
                  {myRating
                    ? `Your rating: ${myRating}★`
                    : course.reviews > 0
                      ? `${course.rating} (${course.reviews.toLocaleString()} ratings)`
                      : "Be the first to rate"}
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
          {!planLoading && enrolled && (
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
            <ul className="max-h-[520px] overflow-y-auto">
              {lessons.length === 0 && (
                <li className="px-5 py-6 text-center text-[12.5px] text-muted-foreground">
                  No lessons added to this course yet.
                </li>
              )}
              {lessons.map((l, i) => {
                const isActive = l.id === activeLessonId;
                return (
                  <li key={l.id} className={i !== lessons.length - 1 ? "border-b border-border" : ""}>
                    <button
                      onClick={() => handleLessonSelect(l.id)}
                      className={`w-full flex items-center gap-3 px-5 py-3 text-left transition-colors ${
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
                        {i + 1}. {l.title}
                      </span>
                      {l.duration && (
                        <span className="text-[11px] text-muted-foreground shrink-0">
                          {l.duration}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="p-4 border-t border-border">
              <button
                onClick={goNext}
                disabled={planLoading || !enrolled}
                className={`w-full py-2.5 bg-secondary text-secondary-foreground rounded-lg text-[13px] font-semibold flex items-center justify-center gap-1.5 ${
                  enrolled ? "hover:bg-secondary/90" : "opacity-50 cursor-not-allowed"
                }`}
              >
                {planLoading ? "Checking…" : enrolled ? "Next Lesson" : "Locked"} <ChevronRight className="w-4 h-4" />
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
            <button
              onClick={() => navigate("/help")}
              className="w-full py-2 border border-primary-border rounded-lg text-primary text-[12.5px] font-semibold hover:bg-primary-tint transition-colors"
            >
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
