import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Sparkles, RefreshCw, Compass, ClipboardCheck, Plus, X, CheckCircle2, XCircle, ArrowRight, Trophy, Briefcase, MapPin, TrendingUp, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { requireSignedIn } from "@/lib/require-signed-in";
import { useSEO } from "@/components/SEO";
import { cn } from "@/lib/utils";

/* ── Types ─── */
interface MatchedRole {
  title: string;
  fit_score: number;
  why_fit: string;
  salary_range: string;
  work_style: string;
  demand: string;
  top_skills_needed: string[];
  missing_skills: string[];
  first_step: string;
  industry: string;
}
interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
  skill_tested: string;
}
interface Quiz {
  role: string;
  questions: QuizQuestion[];
}

const fitColor = (score: number) => {
  if (score >= 80) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (score >= 60) return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-rose-50 text-rose-700 border-rose-200";
};

export default function CareerExplorer() {
  useSEO({
    title: "Career Explorer — Discover roles & test your skills",
    description: "Find career paths that fit your education and skills, then take an AI-generated skill check to see if you're qualified for any role.",
  });

  const navigate = useNavigate();
  const [tab, setTab] = useState<"explore" | "skill-check">("explore");

  /* ── Explore state ── */
  const [education, setEducation] = useState("");
  const [skillInput, setSkillInput] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [interests, setInterests] = useState("");
  const [matchLoading, setMatchLoading] = useState(false);
  const [roles, setRoles] = useState<MatchedRole[]>([]);

  const addSkill = () => {
    const s = skillInput.trim();
    if (!s) return;
    if (skills.includes(s)) { setSkillInput(""); return; }
    setSkills([...skills, s]);
    setSkillInput("");
  };
  const removeSkill = (s: string) => setSkills(skills.filter((x) => x !== s));

  const findRoles = async () => {
    if (!education.trim() && skills.length === 0) {
      toast.error("Add your education or at least one skill");
      return;
    }
    setMatchLoading(true);
    setRoles([]);
    try {
      const user = await requireSignedIn(navigate, "Sign up to match careers.");
      if (!user) return;
      const { data, error } = await supabase.functions.invoke("career-explorer", {
        body: { mode: "match-roles", education, skills, interests },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setRoles((data as any).roles || []);
    } catch (e: any) {
      toast.error(e.message || "Failed to find roles");
    } finally {
      setMatchLoading(false);
    }
  };

  /* ── Skill check state ── */
  const [quizRole, setQuizRole] = useState("");
  const [quizLoading, setQuizLoading] = useState(false);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const generateQuiz = async (roleOverride?: string) => {
    const role = (roleOverride ?? quizRole).trim();
    if (!role) {
      toast.error("Enter a role to test for");
      return;
    }
    setQuizLoading(true);
    setQuiz(null);
    setAnswers({});
    setSubmitted(false);
    try {
      const user = await requireSignedIn(navigate, "Sign up to take a skill check.");
      if (!user) return;
      const { data, error } = await supabase.functions.invoke("career-explorer", {
        body: { mode: "generate-quiz", role },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setQuiz(data as Quiz);
      setQuizRole(role);
    } catch (e: any) {
      toast.error(e.message || "Failed to generate quiz");
    } finally {
      setQuizLoading(false);
    }
  };

  const score = quiz
    ? quiz.questions.reduce((acc, q) => (answers[q.id] === q.correct_index ? acc + 1 : acc), 0)
    : 0;
  const total = quiz?.questions.length ?? 0;
  const scorePct = total ? Math.round((score / total) * 100) : 0;
  const verdict =
    scorePct >= 80 ? { label: "Strongly qualified", cls: "text-emerald-700 bg-emerald-50 border-emerald-200" } :
    scorePct >= 60 ? { label: "Almost there", cls: "text-amber-700 bg-amber-50 border-amber-200" } :
    scorePct >= 40 ? { label: "Building foundation", cls: "text-orange-700 bg-orange-50 border-orange-200" } :
    { label: "Needs more learning", cls: "text-rose-700 bg-rose-50 border-rose-200" };

  const sendToSkillCheck = (role: string) => {
    setQuizRole(role);
    setTab("skill-check");
    setQuiz(null);
    setAnswers({});
    setSubmitted(false);
    setTimeout(() => generateQuiz(role), 50);
  };

  return (
    <div className="max-w-[1100px] w-full animate-fade-in">
      {/* Header */}
      <div className="flex items-start gap-3 mb-5 flex-wrap">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground mt-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Compass className="w-5 h-5 text-primary" /> Career Explorer
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Discover roles that match your background — then test if you're ready for them.
          </p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
        <TabsList className="w-full max-w-md grid grid-cols-2 mb-5">
          <TabsTrigger value="explore" className="text-[13px]">
            <Compass className="w-3.5 h-3.5 mr-1.5" /> Explore roles
          </TabsTrigger>
          <TabsTrigger value="skill-check" className="text-[13px]">
            <ClipboardCheck className="w-3.5 h-3.5 mr-1.5" /> Take skill check
          </TabsTrigger>
        </TabsList>

        {/* ── EXPLORE ROLES ── */}
        <TabsContent value="explore" className="mt-0 space-y-5">
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
            <h2 className="text-base font-bold mb-1">Tell us about you</h2>
            <p className="text-xs text-muted-foreground mb-4">
              We'll suggest roles you can realistically go for in Nigeria.
            </p>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[12px] font-semibold mb-1.5 block">What did you study?</label>
                <Input
                  placeholder="e.g. Mass Communication, Economics, Self-taught"
                  value={education}
                  onChange={(e) => setEducation(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[12px] font-semibold mb-1.5 block">What interests you? (optional)</label>
                <Input
                  placeholder="e.g. Tech, design, writing, finance"
                  value={interests}
                  onChange={(e) => setInterests(e.target.value)}
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="text-[12px] font-semibold mb-1.5 block">Your skills</label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. Excel, Writing, Figma"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }}
                />
                <Button type="button" variant="outline" onClick={addSkill}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {skills.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {skills.map((s) => (
                    <span key={s} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary-tint text-primary text-[11.5px] font-medium">
                      {s}
                      <button onClick={() => removeSkill(s)} className="hover:opacity-70">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <Button
              onClick={findRoles}
              disabled={matchLoading}
              className="w-full sm:w-auto mt-5 gradient-primary text-primary-foreground"
            >
              {matchLoading ? (
                <><RefreshCw className="w-4 h-4 animate-spin mr-2" /> Matching roles…</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-2" /> Find roles for me</>
              )}
            </Button>
          </div>

          {roles.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-primary" /> {roles.length} role{roles.length === 1 ? "" : "s"} you could go for
              </h3>
              <div className="grid sm:grid-cols-2 gap-3">
                {roles.map((r) => (
                  <div key={r.title} className="rounded-2xl border border-border bg-card p-4 flex flex-col">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0">
                        <p className="font-bold text-[14px] leading-tight">{r.title}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{r.industry}</p>
                      </div>
                      <span className={cn("text-[11px] font-bold px-2 py-0.5 rounded-full border shrink-0", fitColor(r.fit_score))}>
                        {r.fit_score}% fit
                      </span>
                    </div>

                    <p className="text-[12.5px] text-foreground/80 leading-relaxed mb-3">{r.why_fit}</p>

                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="text-[10.5px]">
                        <p className="text-muted-foreground flex items-center gap-1"><Briefcase className="w-3 h-3" /> Salary</p>
                        <p className="font-semibold">{r.salary_range}</p>
                      </div>
                      <div className="text-[10.5px]">
                        <p className="text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" /> Work</p>
                        <p className="font-semibold">{r.work_style}</p>
                      </div>
                      <div className="text-[10.5px]">
                        <p className="text-muted-foreground flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Demand</p>
                        <p className="font-semibold">{r.demand}</p>
                      </div>
                    </div>

                    {r.top_skills_needed?.length > 0 && (
                      <div className="mb-2">
                        <p className="text-[10.5px] text-muted-foreground mb-1">Top skills needed</p>
                        <div className="flex flex-wrap gap-1">
                          {r.top_skills_needed.slice(0, 5).map((s) => (
                            <span key={s} className="text-[10.5px] px-1.5 py-0.5 rounded-md bg-muted text-foreground/80">{s}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {r.missing_skills?.length > 0 && (
                      <div className="mb-3">
                        <p className="text-[10.5px] text-muted-foreground mb-1">Skills to build</p>
                        <div className="flex flex-wrap gap-1">
                          {r.missing_skills.slice(0, 4).map((s) => (
                            <span key={s} className="text-[10.5px] px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">{s}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {r.first_step && (
                      <div className="rounded-lg bg-primary-tint/60 border border-primary/15 p-2.5 mb-3">
                        <p className="text-[10.5px] font-bold text-primary mb-0.5 flex items-center gap-1">
                          <Target className="w-3 h-3" /> First step
                        </p>
                        <p className="text-[11.5px] text-foreground/85 leading-relaxed">{r.first_step}</p>
                      </div>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-auto w-full text-[12px]"
                      onClick={() => sendToSkillCheck(r.title)}
                    >
                      <ClipboardCheck className="w-3.5 h-3.5 mr-1.5" /> Am I qualified? Take skill check
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── SKILL CHECK ── */}
        <TabsContent value="skill-check" className="mt-0 space-y-5">
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
            <h2 className="text-base font-bold mb-1">Test if you're qualified</h2>
            <p className="text-xs text-muted-foreground mb-4">
              We'll generate a 10-question skill check for any role you want to go for.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                placeholder="e.g. Product Manager, Data Analyst, Social Media Manager"
                value={quizRole}
                onChange={(e) => setQuizRole(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") generateQuiz(); }}
                className="flex-1"
              />
              <Button
                onClick={() => generateQuiz()}
                disabled={quizLoading || !quizRole.trim()}
                className="gradient-primary text-primary-foreground"
              >
                {quizLoading ? (
                  <><RefreshCw className="w-4 h-4 animate-spin mr-2" /> Generating…</>
                ) : (
                  <><Sparkles className="w-4 h-4 mr-2" /> Start skill check</>
                )}
              </Button>
            </div>
          </div>

          {quiz && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-card p-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase font-semibold tracking-wide">Quiz</p>
                  <p className="font-bold text-[15px]">{quiz.role}</p>
                </div>
                {!submitted && (
                  <p className="text-[12px] text-muted-foreground">
                    {Object.keys(answers).length} / {total} answered
                  </p>
                )}
              </div>

              {quiz.questions.map((q, idx) => {
                const selected = answers[q.id];
                const isCorrect = submitted && selected === q.correct_index;
                const isWrong = submitted && selected !== undefined && selected !== q.correct_index;
                return (
                  <div key={q.id} className="rounded-2xl border border-border bg-card p-4">
                    <div className="flex items-start gap-2 mb-3">
                      <span className="shrink-0 w-6 h-6 rounded-full bg-primary-tint text-primary text-[11px] font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-[13.5px] leading-snug">{q.question}</p>
                        <p className="text-[10.5px] text-muted-foreground mt-0.5">Tests: {q.skill_tested}</p>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      {q.options.map((opt, i) => {
                        const isSel = selected === i;
                        const isAns = submitted && i === q.correct_index;
                        const showWrong = submitted && isSel && i !== q.correct_index;
                        return (
                          <button
                            key={i}
                            disabled={submitted}
                            onClick={() => setAnswers({ ...answers, [q.id]: i })}
                            className={cn(
                              "w-full text-left px-3 py-2 rounded-lg border text-[12.5px] transition-all flex items-start gap-2",
                              !submitted && isSel && "border-primary bg-primary-tint",
                              !submitted && !isSel && "border-border hover:border-primary/40 hover:bg-muted/40",
                              submitted && isAns && "border-emerald-300 bg-emerald-50 text-emerald-900",
                              submitted && showWrong && "border-rose-300 bg-rose-50 text-rose-900",
                              submitted && !isAns && !showWrong && "border-border opacity-70",
                            )}
                          >
                            <span className="w-4 h-4 rounded-full border border-current shrink-0 mt-0.5 flex items-center justify-center text-[10px]">
                              {String.fromCharCode(65 + i)}
                            </span>
                            <span className="flex-1">{opt}</span>
                            {submitted && isAns && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                            {submitted && showWrong && <XCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                    {submitted && (
                      <div className="mt-3 text-[11.5px] text-foreground/80 bg-muted/40 rounded-lg p-2.5">
                        <span className="font-semibold">Why: </span>{q.explanation}
                      </div>
                    )}
                  </div>
                );
              })}

              {!submitted ? (
                <Button
                  onClick={() => setSubmitted(true)}
                  disabled={Object.keys(answers).length < total}
                  className="w-full gradient-primary text-primary-foreground"
                >
                  Submit & see results <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              ) : (
                <div className="rounded-2xl border border-border bg-card p-5 text-center">
                  <p className="text-[11px] uppercase font-semibold text-muted-foreground tracking-wide">Your result</p>
                  <p className="text-3xl font-bold mt-1">{score} / {total}</p>
                  <p className="text-[13px] text-muted-foreground">({scorePct}%)</p>
                  <span className={cn("inline-block mt-3 text-[12px] font-bold px-3 py-1 rounded-full border", verdict.cls)}>
                    {verdict.label}
                  </span>
                  <div className="flex flex-wrap gap-2 justify-center mt-4">
                    <Button variant="outline" size="sm" onClick={() => { setAnswers({}); setSubmitted(false); }}>
                      Retry quiz
                    </Button>
                    <Button size="sm" onClick={() => generateQuiz(quizRole)} className="gradient-primary text-primary-foreground">
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> New questions
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
