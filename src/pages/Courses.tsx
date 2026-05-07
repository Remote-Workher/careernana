import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Search, Star, BookOpen, Crown, Loader2, GraduationCap, Linkedin, FileText, Mic, Briefcase, PenTool, Palette, BarChart3, Megaphone, Code2, DollarSign, MessageSquare, Target, Rocket, Brain, Users, Mail, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePlanTier } from "@/hooks/usePlanTier";


// Topic-matched icon + tinted background for course covers when no image is uploaded
function iconForCourse(course: { title: string; category: string | null }) {
  const hay = `${course.title} ${course.category || ""}`.toLowerCase();
  if (/linkedin/.test(hay)) return { Icon: Linkedin, bg: "bg-[#0A66C2]/10", fg: "text-[#0A66C2]" };
  if (/resume|cv\b/.test(hay)) return { Icon: FileText, bg: "bg-primary-tint", fg: "text-primary" };
  if (/cover letter|email|outreach/.test(hay)) return { Icon: Mail, bg: "bg-blue-100", fg: "text-blue-600" };
  if (/interview|negotiat|salary/.test(hay)) return { Icon: Mic, bg: "bg-rose-100", fg: "text-rose-600" };
  if (/freelanc|client|pitch/.test(hay)) return { Icon: DollarSign, bg: "bg-emerald-100", fg: "text-emerald-600" };
  if (/remote/.test(hay)) return { Icon: Globe, bg: "bg-violet-100", fg: "text-violet-600" };
  if (/canva|design|figma|ux|ui/.test(hay)) return { Icon: Palette, bg: "bg-blue-100", fg: "text-blue-600" };
  if (/excel|data|analytics/.test(hay)) return { Icon: BarChart3, bg: "bg-success/15", fg: "text-success" };
  if (/code|developer|engineer|tech/.test(hay)) return { Icon: Code2, bg: "bg-success/15", fg: "text-success" };
  if (/marketing|growth|content|brand/.test(hay)) return { Icon: Megaphone, bg: "bg-rose-100", fg: "text-rose-600" };
  if (/communicat|message|chat/.test(hay)) return { Icon: MessageSquare, bg: "bg-violet-100", fg: "text-violet-600" };
  if (/leader|manage|team/.test(hay)) return { Icon: Users, bg: "bg-amber/15", fg: "text-amber-700" };
  if (/productiv|time|focus/.test(hay)) return { Icon: Target, bg: "bg-amber/15", fg: "text-amber-700" };
  if (/ai|prompt|chatgpt/.test(hay)) return { Icon: Brain, bg: "bg-violet-100", fg: "text-violet-600" };
  if (/portfolio|writing|copy/.test(hay)) return { Icon: PenTool, bg: "bg-primary-tint", fg: "text-primary" };
  if (/career|job/.test(hay)) return { Icon: Briefcase, bg: "bg-primary-tint", fg: "text-primary" };
  return { Icon: Rocket, bg: "bg-primary-tint", fg: "text-primary" };
}

type DbCourse = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  level: string | null;
  instructor: string | null;
  instructor_avatar_url: string | null;
  rating: number | null;
  reviews: number | null;
  lessons: number | null;
  price: number | null;
  image_url: string | null;
  is_featured: boolean;
};

function formatReviews(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return `${n}`;
}

export default function Courses() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { loading: planLoading, signedIn, isPaidActive } = usePlanTier();
  const [courses, setCourses] = useState<DbCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState<string>(searchParams.get("category") ?? "all");
  

  useEffect(() => {
    const cat = searchParams.get("category");
    if (cat) setActiveCat(cat);
  }, [searchParams]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("courses")
        .select(
          "id,title,description,category,level,instructor,instructor_avatar_url,rating,reviews,lessons,price,image_url,is_featured",
        )
        .eq("is_published", true)
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false });
      setCourses((data as DbCourse[]) ?? []);
      setLoading(false);
    })();
  }, []);


  const filtered = useMemo(() => {
    let list = courses;
    if (activeCat !== "all") list = list.filter((c) => c.category === activeCat);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          (c.instructor ?? "").toLowerCase().includes(q) ||
          (c.category ?? "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [courses, activeCat, query]);

  const handleStart = (course: DbCourse) => {
    if (planLoading) return;
    if (isPaidActive) {
      navigate(`/courses/${course.id}`);
      return;
    }
    if (!signedIn) {
      navigate("/login");
      return;
    }
    import("@/lib/upgrade-modal").then(({ openUpgradeModal }) =>
      openUpgradeModal({
        planId: "pro",
        heading: "Unlock this course",
        subtext: `“${course.title}” and the full library are included with Premium.`,
      }),
    );
  };

  return (
    <div className="font-sans">
      <div className="mb-6">
        <p className="eyebrow mb-2">Skill up</p>
        <h1 className="headline text-[28px] md:text-[36px] text-foreground leading-[1.1]">
          Learn what gets you <em>hired</em>
        </h1>
        <p className="text-[13px] text-muted-foreground mt-2 max-w-[520px]">
          Build in-demand skills with expert-led courses.
        </p>
      </div>

      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search courses..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-card text-[13.5px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-[20px] font-serif text-foreground mb-4">
          {activeCat === "all" ? "All Courses" : activeCat}
        </h2>

        {loading ? (
          <div className="py-16 flex justify-center">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-14 text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary-tint flex items-center justify-center mx-auto mb-4">
              <GraduationCap className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-[18px] font-serif text-foreground tracking-[-0.01em]">
              No courses <em>yet</em>
            </h3>
            <p className="text-[12.5px] text-muted-foreground mt-1.5 max-w-sm mx-auto leading-relaxed">
              Courses will appear here as the team adds them.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                planLoading={planLoading}
                isPaidActive={isPaidActive}
                signedIn={signedIn}
                onAction={() => handleStart(course)}
              />
            ))}
          </div>
        )}
      </div>

    </div>
  );
}


function CourseCard({
  course,
  planLoading,
  isPaidActive,
  onAction,
}: {
  course: DbCourse;
  planLoading: boolean;
  isPaidActive: boolean;
  onAction: () => void;
}) {
  const { Icon, bg, fg } = iconForCourse(course);
  return (
    <div className="hub-card hub-card-hover overflow-hidden flex flex-col">
      <Link to={`/courses/${course.id}`} className="relative h-[140px] overflow-hidden block">
        {course.image_url ? (
          <img src={course.image_url} alt={course.title} className="w-full h-full object-cover" />
        ) : (
          <div className={`w-full h-full flex items-center justify-center ${bg}`}>
            <Icon className={`w-16 h-16 ${fg}`} strokeWidth={1.5} />
          </div>
        )}
        {course.category && (
          <div className="absolute top-2 left-2">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-card/90 backdrop-blur text-foreground">
              {course.category}
            </span>
          </div>
        )}
      </Link>

      <div className="p-4 flex-1 flex flex-col">
        <Link
          to={`/courses/${course.id}`}
          className="text-[14px] font-bold text-foreground leading-snug mb-2 line-clamp-2 hover:text-primary"
        >
          {course.title}
        </Link>

        {course.instructor && (
          <div className="flex items-center gap-2 mb-3">
            {course.instructor_avatar_url && (
              <img
                src={course.instructor_avatar_url}
                alt={course.instructor}
                className="w-5 h-5 rounded-full object-cover"
              />
            )}
            <span className="text-[12px] text-muted-foreground truncate">
              {course.instructor}
            </span>
          </div>
        )}

        <div className="flex items-center gap-3 text-[11.5px] text-muted-foreground mb-4 mt-auto">
          {(course.rating ?? 0) > 0 && (
            <span className="inline-flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-amber text-amber" />
              <span className="font-semibold text-foreground">{course.rating}</span>
              <span>({formatReviews(course.reviews ?? 0)})</span>
            </span>
          )}
          {(course.lessons ?? 0) > 0 && (
            <span className="inline-flex items-center gap-1">
              <BookOpen className="w-3 h-3" /> {course.lessons} lessons
            </span>
          )}
          {course.level && <span>{course.level}</span>}
        </div>

        <div className="flex items-center">
          <button
            onClick={onAction}
            disabled={planLoading}
            className={`w-full px-3 py-2 rounded-lg text-[12px] font-bold transition-colors inline-flex items-center justify-center gap-1.5 ${
              isPaidActive
                ? "bg-secondary hover:bg-secondary/90 text-secondary-foreground"
                : "bg-primary hover:bg-primary-dark text-primary-foreground"
            } disabled:opacity-70 disabled:cursor-wait`}
          >
            {planLoading ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking access</>
            ) : isPaidActive ? "Start course" : (
              <>
                <Crown className="w-3.5 h-3.5" /> Upgrade to start course
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
