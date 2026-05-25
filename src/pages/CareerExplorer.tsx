import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowRight, ClipboardCheck, Plus, X, RefreshCw, CheckCircle2, XCircle, Flame, TrendingUp, TrendingDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getCurrentUserFast } from "@/lib/auth-state";
import { useSEO } from "@/components/SEO";
import { cn } from "@/lib/utils";
import { slugifyRole } from "@/lib/role-slug";

const EDUCATION_LEVELS = [
  "SSCE / WAEC", "OND", "HND", "BSc", "BA", "BEng", "BTech", "LLB", "MBBS",
  "MSc", "MA", "MBA", "PhD", "Self-taught", "Bootcamp / Certificate", "Other",
];

const FIELD_SUGGESTIONS: Record<string, string[]> = {
  default: ["Computer Science", "Mass Communication", "Economics", "Accounting", "Business Administration", "Marketing", "Statistics", "Mathematics", "Law", "Engineering", "Psychology"],
  BSc: ["Computer Science", "Mathematics", "Statistics", "Biochemistry", "Microbiology", "Physics", "Economics", "Accounting"],
  BA: ["Mass Communication", "English", "History", "Sociology", "Political Science", "International Relations"],
  BEng: ["Electrical Engineering", "Mechanical Engineering", "Civil Engineering", "Chemical Engineering"],
  BTech: ["Computer Engineering", "Software Engineering", "Information Technology"],
  HND: ["Computer Science", "Accountancy", "Business Admin", "Marketing", "Mass Communication"],
  OND: ["Computer Science", "Business Admin", "Marketing", "Banking & Finance"],
};

const INTEREST_SUGGESTIONS = [
  "Tech & Software", "Design & Creative", "Writing & Content", "Marketing", "Finance & Banking",
  "Data & Analytics", "Sales & Business Dev", "Human Resources", "Operations", "Education",
  "Healthcare", "NGO & Impact", "Fashion & Beauty", "Media & Entertainment", "Product Management",
  "Customer Success", "Project Management",
];

type Popularity = "hot" | "high" | "medium" | "low";
type CatalogRole = { title: string; industry: string; salary: string; description: string; skills: string[]; popularity: Popularity };

const POPULAR_ROLES: CatalogRole[] = [
  { title: "Product Manager", industry: "Tech", salary: "₦600K – ₦1.5M/mo", popularity: "hot", description: "Owns what gets built and why. Talks to users, prioritises features, and works with engineers + designers to ship.", skills: ["Roadmapping", "User research", "Analytics"] },
  { title: "Data Analyst", industry: "Tech & Finance", salary: "₦400K – ₦900K/mo", popularity: "hot", description: "Turns messy data into clear answers. Pulls reports, spots trends, and helps teams make smarter decisions.", skills: ["SQL", "Excel", "Python"] },
  { title: "Social Media Manager", industry: "Marketing", salary: "₦200K – ₦600K/mo", popularity: "high", description: "Runs a brand's online voice. Plans content, grows the audience, and turns followers into customers.", skills: ["Content", "Copywriting", "Canva"] },
  { title: "Customer Success Manager", industry: "SaaS", salary: "₦350K – ₦800K/mo", popularity: "high", description: "Keeps customers happy after they sign up. Onboards them, solves problems, and makes sure they renew.", skills: ["Communication", "CRM", "Empathy"] },
  { title: "Frontend Engineer", industry: "Tech", salary: "₦500K – ₦1.4M/mo", popularity: "hot", description: "Builds the screens users actually see and click. Turns designs into fast, beautiful, working websites.", skills: ["React", "JavaScript", "CSS"] },
  { title: "HR / People Ops", industry: "Cross-industry", salary: "₦300K – ₦750K/mo", popularity: "medium", description: "Helps companies hire, keep, and grow great people. Owns recruiting, onboarding, and team culture.", skills: ["Recruiting", "Onboarding", "Comms"] },
];

const HIGH_PAYING_ROLES: CatalogRole[] = [
  { title: "Senior Software Engineer", industry: "Tech (remote)", salary: "₦1.5M – ₦4M/mo", popularity: "hot", description: "Designs and ships complex systems. Mentors juniors, makes architecture calls, and unblocks the team.", skills: ["System design", "TypeScript", "Cloud"] },
  { title: "Data Scientist", industry: "Tech & Finance", salary: "₦1M – ₦2.5M/mo", popularity: "high", description: "Uses statistics and machine learning to predict outcomes — fraud, churn, demand — and turn it into product.", skills: ["Python", "ML", "Statistics"] },
  { title: "Product Lead", industry: "Tech", salary: "₦1.2M – ₦3M/mo", popularity: "high", description: "Sets the product vision and leads a team of PMs. Owns strategy, roadmap, and outcomes at scale.", skills: ["Strategy", "Leadership", "Analytics"] },
  { title: "DevOps Engineer", industry: "Tech", salary: "₦1M – ₦2.5M/mo", popularity: "high", description: "Keeps the lights on. Automates deployments, scales infrastructure, and makes sure things don't break.", skills: ["AWS", "Docker", "CI/CD"] },
  { title: "Financial Analyst", industry: "Finance", salary: "₦800K – ₦1.8M/mo", popularity: "medium", description: "Builds financial models and forecasts. Helps leadership decide where to invest, cut, or grow.", skills: ["Modelling", "Excel", "Reporting"] },
  { title: "Brand / Marketing Lead", industry: "Marketing", salary: "₦800K – ₦1.8M/mo", popularity: "medium", description: "Shapes how the world sees the brand. Owns campaigns, storytelling, and the marketing team's strategy.", skills: ["Strategy", "Campaigns", "Analytics"] },
];



interface QuizQuestion { id: number; question: string; options: string[]; correct_index: number; explanation: string; skill_tested: string; }
interface Quiz { role: string; questions: QuizQuestion[]; }

export default function CareerExplorer() {
  useSEO({
    title: "Career Explorer — Find the right career path",
    description: "Discover careers that fit your background, then test if you're ready for them.",
  });

  const navigate = useNavigate();
  const location = useLocation();
  const incomingQuizRole = (location.state as any)?.quizRole as string | undefined;
  const retakeNonce = (location.state as any)?.retake as number | undefined;
  const [tab, setTab] = useState<"explore" | "skill-check">(incomingQuizRole ? "skill-check" : "explore");


  const [educationLevel, setEducationLevel] = useState("");
  const [educationField, setEducationField] = useState("");
  const [interestInput, setInterestInput] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addInterest = (val?: string) => {
    const s = (val ?? interestInput).trim();
    if (!s) return;
    if (!interests.includes(s)) setInterests([...interests, s]);
    setInterestInput("");
  };
  const removeInterest = (s: string) => setInterests(interests.filter((x) => x !== s));

  const fieldSuggestions = FIELD_SUGGESTIONS[educationLevel] ?? FIELD_SUGGESTIONS.default;

  const findRoles = async () => {
    if (!educationLevel && interests.length === 0) {
      toast.error("Pick your education or add an interest");
      return;
    }
    setLoading(true);
    try {
      const user = await getCurrentUserFast();
      const education = [educationLevel, educationField].filter(Boolean).join(" in ");
      const { data, error } = await supabase.functions.invoke("career-explorer", {
        body: { mode: "match-roles", education, interests: interests.join(", ") },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      navigate("/career-explorer/results", {
        state: { roles: (data as any).roles || [], inputs: { education, interests } },
      });
    } catch (e: any) {
      toast.error(e.message || "Could not find roles");
    } finally {
      setLoading(false);
    }
  };

  /* Skill check */
  const [quizRole, setQuizRole] = useState("");
  const [quizLoading, setQuizLoading] = useState(false);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const generateQuiz = async (roleOverride?: string) => {
    const role = (roleOverride ?? quizRole).trim();
    if (!role) { toast.error("Enter a role to test for"); return; }
    setQuizLoading(true); setQuiz(null); setAnswers({}); setSubmitted(false);
    try {
      const user = await getCurrentUserFast();
      const { data, error } = await supabase.functions.invoke("career-explorer", {
        body: { mode: "generate-quiz", role },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setQuiz(data as Quiz); setQuizRole(role);
    } catch (e: any) {
      toast.error(e.message || "Could not create quiz");
    } finally { setQuizLoading(false); }
  };

  const total = quiz?.questions.length ?? 0;
  const score = quiz ? quiz.questions.reduce((a, q) => answers[q.id] === q.correct_index ? a + 1 : a, 0) : 0;
  const scorePct = total ? Math.round((score / total) * 100) : 0;
  const verdict = scorePct >= 80 ? { label: "Strongly qualified", cls: "text-emerald-700 bg-emerald-50 border-emerald-200" }
    : scorePct >= 60 ? { label: "Almost there", cls: "text-amber-700 bg-amber-50 border-amber-200" }
    : scorePct >= 40 ? { label: "Building foundation", cls: "text-orange-700 bg-orange-50 border-orange-200" }
    : { label: "Needs more learning", cls: "text-rose-700 bg-rose-50 border-rose-200" };

  const openRole = (title: string) => navigate(`/career-explorer/role/${slugifyRole(title)}`, { state: { title } });

  // Auto-start quiz when arriving from a role page (re-triggers on each navigation, even same role)
  useEffect(() => {
    if (incomingQuizRole) {
      setTab("skill-check");
      setQuizRole(incomingQuizRole);
      generateQuiz(incomingQuizRole);
      // scroll to top so user sees the quiz loading
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomingQuizRole, retakeNonce]);

  const startSkillCheck = (role: string) => {
    setTab("skill-check");
    setQuizRole(role);
    generateQuiz(role);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="max-w-[1200px] w-full mx-auto animate-fade-in pb-12">
      {/* Editorial header */}
      <div className="pt-1 pb-5 sm:pb-7">
        <p className="text-[10.5px] uppercase tracking-[0.2em] text-muted-foreground font-semibold mb-2">Career Explorer</p>
        <h1 className="font-serif text-[24px] sm:text-[32px] leading-[1.1] tracking-tight text-foreground">
          Your guide to discover the right career path
        </h1>
        <p className="text-[13px] text-muted-foreground mt-1.5 max-w-xl">
          Not sure where to start? Tell us a little about you and we'll show you careers worth exploring in Nigeria.
        </p>

      </div>


      <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
        <div className="border-b border-border mb-8">
          <TabsList className="bg-transparent p-0 h-auto gap-6">
            <TabsTrigger
              value="explore"
              className="bg-transparent rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-2 text-[14px] font-semibold text-muted-foreground data-[state=active]:text-foreground"
            >
              Explore roles
            </TabsTrigger>
            <TabsTrigger
              value="skill-check"
              className="bg-transparent rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-2 text-[14px] font-semibold text-muted-foreground data-[state=active]:text-foreground"
            >
              Take skill check
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="explore" className="mt-0 space-y-12">
          {/* Form card */}
          <div className="hub-card rounded-2xl p-5 sm:p-7 w-full">
            <h2 className="font-serif text-lg sm:text-xl mb-0.5">Confused about careers?</h2>
            <p className="text-xs text-muted-foreground mb-5">Let us help you decide.</p>



            <datalist id="ce-field-options">
              {fieldSuggestions.map((f) => <option key={f} value={f} />)}
            </datalist>
            <datalist id="ce-interest-options">
              {INTEREST_SUGGESTIONS.map((f) => <option key={f} value={f} />)}
            </datalist>

            <div className="space-y-5">
              <div>
                <label className="text-[12px] font-semibold mb-2 block">Select education</label>
                <Select value={educationLevel} onValueChange={(v) => { setEducationLevel(v); setEducationField(""); }}>
                  <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Tell us about your education details" /></SelectTrigger>
                  <SelectContent>
                    {EDUCATION_LEVELS.map((lvl) => <SelectItem key={lvl} value={lvl}>{lvl}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {educationLevel && !["SSCE / WAEC", "Self-taught", "Other"].includes(educationLevel) && (
                <div>
                  <label className="text-[12px] font-semibold mb-2 block">In what field?</label>
                  <Input
                    list="ce-field-options"
                    placeholder="e.g. Computer Science"
                    value={educationField}
                    onChange={(e) => setEducationField(e.target.value)}
                    className="h-12 rounded-xl"
                  />
                </div>
              )}

              <div>
                <label className="text-[12px] font-semibold mb-2 block">What interests you?</label>
                <div className="flex gap-2">
                  <Input
                    list="ce-interest-options"
                    placeholder="e.g. Tech, design, writing"
                    value={interestInput}
                    onChange={(e) => {
                      const v = e.target.value;
                      setInterestInput(v);
                      if (INTEREST_SUGGESTIONS.includes(v)) addInterest(v);
                    }}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addInterest(); } }}
                    className="h-12 rounded-xl"
                  />
                  <Button type="button" variant="outline" onClick={() => addInterest()} className="h-12 rounded-xl">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {interests.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {interests.map((s) => (
                      <span key={s} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted text-foreground/80 text-[12px] font-medium">
                        {s}
                        <button onClick={() => removeInterest(s)} className="hover:opacity-70"><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <Button
                onClick={findRoles}
                disabled={loading}
                className="w-full h-12 rounded-full text-[14px] font-semibold gradient-primary text-primary-foreground"
              >
                {loading ? (<><RefreshCw className="w-4 h-4 animate-spin mr-2" /> Finding roles…</>) : "Find roles for me"}
              </Button>
            </div>
          </div>

          {/* Browse catalogs */}
          <Catalog title="Popular roles" subtitle="Roles women are actively breaking into right now" roles={POPULAR_ROLES} onPick={openRole} />
          <Catalog title="High paying roles" subtitle="Where the salaries climb fastest in Nigeria" roles={HIGH_PAYING_ROLES} onPick={openRole} />
        </TabsContent>

        <TabsContent value="skill-check" className="mt-0 space-y-12">
          {/* Form card — cream, matches Explore */}
          <div className="hub-card rounded-2xl p-5 sm:p-7 w-full">
            <h2 className="font-serif text-lg sm:text-xl mb-0.5">Test if you're qualified</h2>
            <p className="text-xs text-muted-foreground mb-5">A 10-question check for any role you're considering.</p>

            <div className="space-y-4">
              <div>
                <label className="text-[12px] font-semibold mb-2 block">What role do you want to test for?</label>
                <Input
                  placeholder="e.g. Product Manager, Data Analyst"
                  value={quizRole}
                  onChange={(e) => setQuizRole(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") generateQuiz(); }}
                  className="h-12 rounded-xl"
                />
              </div>
              <Button
                onClick={() => generateQuiz()}
                disabled={quizLoading || !quizRole.trim()}
                className="w-full h-12 rounded-full text-[14px] font-semibold gradient-primary text-primary-foreground"
              >
                {quizLoading ? (<><RefreshCw className="w-4 h-4 animate-spin mr-2" /> Generating…</>) : "Start skill check"}
              </Button>
            </div>
          </div>

          {/* Quiz */}
          {quiz && (
            <div className="space-y-4 max-w-3xl mx-auto w-full">
              <div className="hub-card rounded-2xl p-5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10.5px] text-muted-foreground uppercase font-semibold tracking-[0.2em]">Skill check</p>
                  <p className="font-serif text-[20px] leading-tight mt-0.5 truncate">{quiz.role}</p>
                </div>
                {!submitted && (
                  <div className="text-right shrink-0">
                    <p className="text-[10.5px] text-muted-foreground uppercase font-semibold tracking-wide">Progress</p>
                    <p className="font-bold text-[15px]">{Object.keys(answers).length} <span className="text-muted-foreground font-normal">/ {total}</span></p>
                  </div>
                )}
              </div>

              {/* Progress bar */}
              {!submitted && (
                <div className="h-1.5 rounded-full bg-[#ebe6e2] overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${(Object.keys(answers).length / total) * 100}%` }}
                  />
                </div>
              )}

              {quiz.questions.map((q, idx) => {
                const selected = answers[q.id];
                return (
                  <div key={q.id} className="hub-card rounded-2xl p-5">
                    <div className="flex items-start gap-3 mb-4">
                      <span className="shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground text-[12px] font-bold flex items-center justify-center">{idx + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="font-serif text-[16px] leading-snug">{q.question}</p>
                        <p className="text-[10.5px] text-muted-foreground mt-1 uppercase tracking-wide font-semibold">Tests: {q.skill_tested}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {q.options.map((opt, i) => {
                        const isSel = selected === i;
                        return (
                          <button key={i} disabled={submitted} onClick={() => setAnswers({ ...answers, [q.id]: i })}
                            className={cn(
                              "w-full text-left px-3.5 py-3 rounded-xl border-2 text-[13px] transition-all flex items-start gap-3",
                              isSel
                                ? "border-primary bg-primary-tint shadow-sm"
                                : "border-[#ebe6e2] bg-background/70 hover:border-primary/40 hover:bg-background",
                            )}>
                            <span className={cn(
                              "w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[11px] font-bold transition-all",
                              isSel ? "bg-primary text-primary-foreground" : "bg-[#F8F4F2] text-foreground/70 border border-[#ebe6e2]",
                            )}>{String.fromCharCode(65 + i)}</span>
                            <span className="flex-1 pt-0.5 leading-snug">{opt}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              <Button
                onClick={() => {
                  const breakdown = quiz.questions.map((q) => ({
                    skill: q.skill_tested,
                    correct: answers[q.id] === q.correct_index,
                  }));
                  navigate("/career-explorer/skill-check/result", {
                    state: { role: quiz.role, score, total, scorePct, breakdown },
                  });
                }}
                disabled={Object.keys(answers).length < total}
                className="w-full gradient-primary text-primary-foreground rounded-full h-12"
              >
                Submit & see results <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          )}

          {/* Browse catalogs for quick skill checks */}
          {!quiz && !quizLoading && (
            <>
              <Catalog
                title="Popular roles to test for"
                subtitle="See if you're ready for the roles women are landing right now"
                roles={POPULAR_ROLES}
                onPick={startSkillCheck}
                ctaLabel="Take skill check"
              />
              <Catalog
                title="High paying roles to test for"
                subtitle="Test your readiness for Nigeria's top-paying roles"
                roles={HIGH_PAYING_ROLES}
                onPick={startSkillCheck}
                ctaLabel="Take skill check"
              />
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

const POPULARITY_META: Record<Popularity, { label: string; cls: string; icon: any }> = {
  hot:    { label: "Hot",             cls: "bg-orange-100 text-orange-700 border-orange-200", icon: Flame },
  high:   { label: "High popularity", cls: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: TrendingUp },
  medium: { label: "Medium",          cls: "bg-amber-100 text-amber-700 border-amber-200", icon: TrendingUp },
  low:    { label: "Low popularity",  cls: "bg-rose-100 text-rose-700 border-rose-200", icon: TrendingDown },
};

function Catalog({ title, subtitle, roles, onPick, ctaLabel = "Explore role" }: { title: string; subtitle: string; roles: CatalogRole[]; onPick: (title: string) => void; ctaLabel?: string }) {
  return (
    <section className="space-y-4">
      <div>
        <h3 className="font-serif text-xl sm:text-2xl leading-tight">{title}</h3>
        <p className="text-[12.5px] text-muted-foreground mt-0.5">{subtitle}</p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {roles.map((r) => {
          const pop = POPULARITY_META[r.popularity];
          const PopIcon = pop.icon;
          return (
            <button
              key={r.title}
              onClick={() => onPick(r.title)}
              className="hub-card hub-card-hover text-left rounded-2xl p-4 flex flex-col"
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <p className="font-serif text-[17px] leading-tight">{r.title}</p>
                <span className={cn("inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full border shrink-0", pop.cls)}>
                  <PopIcon className="w-2.5 h-2.5" /> {pop.label}
                </span>
              </div>
              <p className="text-[10.5px] text-muted-foreground uppercase tracking-wide font-semibold">{r.industry}</p>

              <p className="text-[12.5px] text-foreground/75 leading-relaxed mt-2.5">{r.description}</p>

              <div className="mt-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Avg. salary</p>
                <p className="text-[13px] font-semibold mt-0.5">{r.salary}</p>
              </div>

              <div className="mt-2.5 flex flex-wrap gap-1">
                {r.skills.map((s) => (
                  <span key={s} className="text-[10px] px-1.5 py-0.5 rounded-md bg-background/70 border border-border text-foreground/75">{s}</span>
                ))}
              </div>

              <div className="mt-4 inline-flex items-center text-[12px] font-semibold text-primary">
                {ctaLabel} <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </div>
            </button>
          );
        })}
      </div>

    </section>
  );
}
