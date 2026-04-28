import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { openSignupModal } from "@/lib/signup-modal";
import {
  Search,
  ChevronDown,
  Play,
  Star,
  BookOpen,
  Clock,
  Award,
  ChevronRight,
  ChevronLeft,
  Bookmark,
  Crown,
  GraduationCap,
  Trophy,
  Lock,
} from "lucide-react";
import {
  courseCategories,
  courses,
  continueLearning,
  recommendedCourses,
  featuredCourse,
  learningProgress,
  achievements,
  type Course,
  type CourseCategory,
} from "@/data/courses";

const toneStyles: Record<CourseCategory["tone"], string> = {
  pink: "bg-primary-tint text-primary",
  violet: "bg-secondary-tint text-secondary",
  amber: "bg-amber/10 text-amber",
  green: "bg-success/10 text-success",
  blue: "bg-blue-100 text-blue-600",
  rose: "bg-rose-100 text-rose-600",
};

const categoryIconBg: Record<CourseCategory["tone"], string> = {
  pink: "bg-primary-tint",
  violet: "bg-secondary-tint",
  amber: "bg-amber/10",
  green: "bg-success/10",
  blue: "bg-blue-100",
  rose: "bg-rose-100",
};

function formatNaira(n: number) {
  return `₦${n.toLocaleString("en-NG")}`;
}

function formatReviews(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return `${n}`;
}

export default function Courses() {
  const navigate = useNavigate();
  const [isMember, setIsMember] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthed(!!user);
      // For now: signed-in users are treated as Hub members for the Courses preview.
      // Replace with real membership check when subscriptions land.
      setIsMember(!!user);
    })();
  }, []);

  const handleJoinHub = () => {
    if (!isAuthed) {
      openSignupModal("Join Remote Workher to unlock all courses");
      return;
    }
    navigate("/profile");
  };

  const handleCourseAction = (course: Course) => {
    if (isMember) {
      // Member: open / continue
      return;
    }
    // Non-member: prompt to buy or join hub
    if (!isAuthed) {
      openSignupModal(`Sign up to buy "${course.title}" or join Remote Workher`);
      return;
    }
    navigate("/profile");
  };

  return (
    <div className="font-sans">
      {/* ───────── Header ───────── */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <p className="eyebrow mb-2">Skill up</p>
          <h1 className="headline text-[28px] md:text-[36px] text-foreground leading-[1.1]">
            Learn what gets you <em>hired</em>
          </h1>
          <p className="text-[13px] text-muted-foreground mt-2 max-w-[520px]">
            Build in-demand skills with expert-led courses and resources.
          </p>
        </div>
        {isAuthed && (
          <button
            onClick={() => navigate("/profile")}
            className="flex items-center gap-2 px-4 py-2 border border-primary-border rounded-lg text-primary text-[13px] font-semibold hover:bg-primary-tint transition-colors"
          >
            <Bookmark className="w-4 h-4" /> My Learning
          </button>
        )}
      </div>

      {/* ───────── Search + filter ───────── */}
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
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-card text-[13.5px] text-foreground hover:bg-muted transition-colors">
          All Categories <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* ───────── Learning Progress (members only) ───────── */}
      {isAuthed && (
        <div className="mb-8">
          <div className="card-surface !p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[14px] font-extrabold text-foreground">Your Learning Progress</p>
              <button className="text-[12px] text-primary font-semibold hover:underline">
                View all
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-5">
              <ProgressStat
                icon={<GraduationCap className="w-4 h-4 text-primary" />}
                tint="bg-primary-tint"
                value={String(learningProgress.enrolled)}
                label="Courses Enrolled"
              />
              <ProgressStat
                icon={<BookOpen className="w-4 h-4 text-secondary" />}
                tint="bg-secondary-tint"
                value={String(learningProgress.lessonsCompleted)}
                label="Lessons Completed"
              />
              <ProgressStat
                icon={<Clock className="w-4 h-4 text-success" />}
                tint="bg-success/10"
                value={learningProgress.timeSpent}
                label="Time Spent"
              />
            </div>

            <div className="pt-4 border-t border-border">
              <div className="flex items-baseline justify-between mb-1.5">
                <p className="text-[13px] font-semibold text-foreground">Weekly Goal</p>
                <p className="text-[12px] text-secondary font-semibold">
                  {learningProgress.weeklyGoalDone} of {learningProgress.weeklyGoalTotal} lessons
                </p>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-secondary rounded-full"
                  style={{
                    width: `${(learningProgress.weeklyGoalDone / learningProgress.weeklyGoalTotal) * 100}%`,
                  }}
                />
              </div>
              <p className="text-[11.5px] text-muted-foreground mt-2">
                Keep going! You're doing great.
              </p>
            </div>
          </div>
        </div>
      )}
      {/* ───────── Popular Categories ───────── */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[20px] font-serif text-foreground">Popular Categories</h2>
          <button className="text-[12.5px] text-primary font-semibold hover:underline flex items-center gap-1">
            View all categories <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {courseCategories.map((c) => (
            <button
              key={c.id}
              className="flex items-center gap-3 p-3.5 rounded-xl bg-card border border-border hover:border-primary-border hover:shadow-sm transition-all text-left"
            >
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0 ${categoryIconBg[c.tone]}`}
              >
                {c.emoji}
              </div>
              <div className="min-w-0">
                <p className="text-[12.5px] font-bold text-foreground leading-tight truncate">
                  {c.name}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {c.count} Courses
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ───────── Featured Courses ───────── */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[20px] font-serif text-foreground">Featured Courses</h2>
          <button className="text-[12.5px] text-primary font-semibold hover:underline flex items-center gap-1">
            View courses <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {courses.slice(0, 8).map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              isMember={isMember}
              onAction={() => handleCourseAction(course)}
              onJoinHub={handleJoinHub}
            />
          ))}
        </div>
      </div>

      {/* ───────── Continue Learning Table — members only ───────── */}
      {isAuthed && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[20px] font-serif text-foreground">Continue Learning</h2>
            <button className="text-[12.5px] text-primary font-semibold hover:underline flex items-center gap-1">
              View all <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {isMember ? (
            <div className="card-surface !p-0 overflow-hidden">
              <div className="grid grid-cols-12 px-5 py-3 border-b border-border bg-muted/40 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                <div className="col-span-5">Course</div>
                <div className="col-span-3">Progress</div>
                <div className="col-span-2">Last Accessed</div>
                <div className="col-span-2 text-right">Action</div>
              </div>
              {continueLearning.map((row, i) => (
                <div
                  key={row.id}
                  className={`grid grid-cols-12 items-center px-5 py-4 ${i !== continueLearning.length - 1 ? "border-b border-border" : ""}`}
                >
                  <div className="col-span-5 flex items-center gap-3 min-w-0">
                    <img
                      src={row.cover}
                      alt=""
                      className="w-12 h-9 rounded-md object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-foreground truncate">
                        {row.course}
                      </p>
                      <p className="text-[11.5px] text-muted-foreground truncate">
                        {row.progressLessons}
                      </p>
                    </div>
                  </div>

                  <div className="col-span-3 pr-6">
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-secondary rounded-full"
                        style={{ width: `${row.progressPct}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">{row.progressPct}%</p>
                  </div>

                  <div className="col-span-2">
                    <p className="text-[12.5px] text-foreground font-medium">{row.lastAccessedLabel}</p>
                    <p className="text-[11px] text-muted-foreground">{row.lastAccessedTime}</p>
                  </div>

                  <div className="col-span-2 flex justify-end">
                    <button className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-md text-[12px] font-semibold text-foreground hover:bg-muted transition-colors">
                      <Play className="w-3 h-3 fill-current" /> Continue
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <NonMemberContinueCTA onJoinHub={handleJoinHub} />
          )}
        </div>
      )}

      {/* ───────── Recommended + Achievements row ───────── */}
      <div className={`grid grid-cols-1 ${isAuthed ? "lg:grid-cols-3" : ""} gap-5 mb-8`}>
        <div className={`${isAuthed ? "lg:col-span-2" : ""} card-surface !p-5`}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-[14px] font-extrabold text-foreground">Recommended for You</p>
            <button className="text-[12px] text-primary font-semibold hover:underline">
              View all
            </button>
          </div>

          <div className="space-y-3">
            {recommendedCourses.map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <img
                  src={r.cover}
                  alt=""
                  className="w-12 h-12 rounded-lg object-cover shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-foreground truncate">
                    {r.title}
                  </p>
                  <p className="text-[11.5px] text-muted-foreground truncate">{r.author}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Star className="w-3 h-3 fill-amber text-amber" />
                    <span className="text-[11px] font-semibold text-foreground">{r.rating}</span>
                    <span className="text-[11px] text-muted-foreground">
                      ({formatReviews(r.reviews)})
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[12px] font-bold text-secondary">Member</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Achievements — members only */}
        {isAuthed && (
          <div className="card-surface !p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[14px] font-extrabold text-foreground">Your Achievements</p>
              <button className="text-[12px] text-primary font-semibold hover:underline">
                View all
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <AchievementBadge
                icon={<GraduationCap className="w-5 h-5 text-primary" />}
                tint="bg-primary-tint"
                value={String(achievements.enrolled)}
                label="Courses Enrolled"
              />
              <AchievementBadge
                icon={<Award className="w-5 h-5 text-amber" />}
                tint="bg-amber/10"
                value={String(achievements.certificates)}
                label="Certificates Earned"
              />
              <AchievementBadge
                icon={<Trophy className="w-5 h-5 text-success" />}
                tint="bg-success/10"
                value={achievements.topPercent}
                label="This Month"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ───────── Sub-components ───────── */

function ProgressStat({
  icon,
  tint,
  value,
  label,
}: {
  icon: React.ReactNode;
  tint: string;
  value: string;
  label: string;
}) {
  return (
    <div className="text-center">
      <div className={`w-9 h-9 rounded-lg ${tint} flex items-center justify-center mx-auto mb-1.5`}>
        {icon}
      </div>
      <p className="text-[18px] font-extrabold text-foreground leading-none">{value}</p>
      <p className="text-[10.5px] text-muted-foreground mt-1 leading-tight">{label}</p>
    </div>
  );
}

function AchievementBadge({
  icon,
  tint,
  value,
  label,
}: {
  icon: React.ReactNode;
  tint: string;
  value: string;
  label: string;
}) {
  return (
    <div className="text-center">
      <div className={`w-12 h-12 rounded-xl ${tint} flex items-center justify-center mx-auto mb-1.5`}>
        {icon}
      </div>
      <p className="text-[15px] font-extrabold text-foreground leading-none">{value}</p>
      <p className="text-[10.5px] text-muted-foreground mt-1 leading-tight">{label}</p>
    </div>
  );
}

function CourseCard({
  course,
  isMember,
  onAction,
  onJoinHub,
}: {
  course: Course;
  isMember: boolean;
  onAction: () => void;
  onJoinHub: () => void;
}) {
  return (
    <div className="hub-card hub-card-hover overflow-hidden flex flex-col">
      <div className="relative h-[140px] overflow-hidden">
        <img src={course.cover} alt={course.title} className="w-full h-full object-cover" />
        <div className="absolute top-2 left-2">
          <span
            className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider ${toneStyles[course.categoryTone]}`}
          >
            {course.category}
          </span>
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <h3 className="text-[14px] font-bold text-foreground leading-snug mb-2 line-clamp-2 min-h-[40px]">
          {course.title}
        </h3>

        <div className="flex items-center gap-2 mb-3">
          <img
            src={course.instructorAvatar}
            alt={course.instructor}
            className="w-5 h-5 rounded-full object-cover"
          />
          <span className="text-[12px] text-muted-foreground truncate">{course.instructor}</span>
        </div>

        <div className="flex items-center gap-1 mb-3">
          <Star className="w-3.5 h-3.5 fill-amber text-amber" />
          <span className="text-[12px] font-semibold text-foreground">{course.rating}</span>
          <span className="text-[11.5px] text-muted-foreground">
            ({formatReviews(course.reviews)})
          </span>
        </div>

        <div className="flex items-center gap-2 text-[11.5px] text-muted-foreground mb-4 mt-auto">
          <span>{course.lessons} Lessons</span>
          <span>•</span>
          <span>{course.level}</span>
        </div>

        {isMember ? (
          <button
            onClick={onAction}
            className="w-full py-2 bg-secondary hover:bg-secondary/90 text-secondary-foreground rounded-lg text-[12.5px] font-semibold transition-colors"
          >
            Start Course
          </button>
        ) : (
          <button
            onClick={onJoinHub}
            className="w-full py-2 bg-primary hover:bg-primary-dark text-primary-foreground rounded-lg text-[12.5px] font-semibold transition-colors flex items-center justify-center gap-1.5"
          >
            <Crown className="w-3.5 h-3.5" /> Join Remote Workher to Watch
          </button>
        )}
      </div>
    </div>
  );
}

function NonMemberContinueCTA({ onJoinHub }: { onJoinHub: () => void }) {
  return (
    <div className="card-surface flex flex-col md:flex-row items-center gap-5 !p-6 bg-gradient-to-br from-secondary-tint to-primary-tint border-primary-border">
      <div className="w-14 h-14 rounded-2xl bg-card flex items-center justify-center shrink-0 shadow-sm">
        <Lock className="w-6 h-6 text-secondary" />
      </div>
      <div className="flex-1 text-center md:text-left">
        <p className="text-[16px] font-bold text-foreground mb-1">
          Track your learning inside Remote Workher
        </p>
        <p className="text-[13px] text-muted-foreground">
          Members get unlimited access to every course, progress tracking, and certificates.
        </p>
      </div>
      <button
        onClick={onJoinHub}
        className="px-5 py-2.5 bg-primary hover:bg-primary-dark text-primary-foreground rounded-lg text-[13px] font-semibold flex items-center gap-2 transition-colors shrink-0"
      >
        <Crown className="w-4 h-4" /> Join Remote Workher
      </button>
    </div>
  );
}
