import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Sparkles, Check, Clock, Lock, X, Loader2, Calendar } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useRecruiterAuth } from "@/hooks/useRecruiterAuth";
import { useSEO } from "@/components/SEO";

const inputCls =
  "w-full px-3.5 py-2.5 rounded-xl border border-border bg-card text-[13.5px] focus:outline-none focus:border-primary";

interface Form {
  role_title: string;
  role_description: string;
  required_skills: string;
  weekly_hours: string;
  duration_weeks: string;
  stipend_naira: string;
  success_criteria: string;
  additional_notes: string;
}

const initial: Form = {
  role_title: "",
  role_description: "",
  required_skills: "",
  weekly_hours: "20",
  duration_weeks: "12",
  stipend_naira: "",
  success_criteria: "",
  additional_notes: "",
};

export default function InternMatch() {
  useSEO({
    title: "Intern Match — Quarterly founder program",
    description: "Get matched with vetted Remote Workher interns each quarter. Free for approved companies.",
  });
  const navigate = useNavigate();
  const { user } = useRecruiterAuth();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [window, setWindow] = useState<any>(null);
  const [existing, setExisting] = useState<any>(null);
  const [pastBriefs, setPastBriefs] = useState<any[]>([]);
  const [form, setForm] = useState<Form>(initial);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const now = new Date().toISOString();
      const [{ data: prof }, { data: win }] = await Promise.all([
        supabase
          .from("recruiter_profiles")
          .select("verification_status, company_name")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("intern_match_windows")
          .select("*")
          .eq("is_active", true)
          .lte("opens_at", now)
          .gte("closes_at", now)
          .order("opens_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      setProfile(prof);
      setWindow(win);

      if (win) {
        const { data: app } = await supabase
          .from("intern_match_applications")
          .select("*")
          .eq("recruiter_user_id", user.id)
          .eq("cohort_id", win.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        setExisting(app);
        if (app) {
          setForm({
            role_title: app.role_title ?? "",
            role_description: app.role_description ?? "",
            required_skills: (app.required_skills ?? []).join(", "),
            weekly_hours: app.weekly_hours?.toString() ?? "20",
            duration_weeks: app.duration_weeks?.toString() ?? "12",
            stipend_naira: app.stipend_naira?.toString() ?? "",
            success_criteria: app.success_criteria ?? "",
            additional_notes: app.additional_notes ?? "",
          });
        }
      }

      // Load all past briefs by this recruiter (any cohort)
      const { data: briefs } = await supabase
        .from("intern_match_applications")
        .select("id, role_title, status, created_at, intern_match_assignments(id, status)")
        .eq("recruiter_user_id", user.id)
        .order("created_at", { ascending: false });
      setPastBriefs(briefs ?? []);
      setLoading(false);
    })();
  }, [user]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  const companyApproved = profile?.verification_status === "approved";

  const closesIn = useMemo(() => {
    if (!window) return "";
    const ms = new Date(window.closes_at).getTime() - Date.now();
    if (ms <= 0) return "closing today";
    const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
    return days === 1 ? "closes in 1 day" : `closes in ${days} days`;
  }, [window]);

  const submit = async () => {
    if (!user || !window) return;
    if (!form.role_title.trim()) return toast.error("Add a role title.");
    if (!form.role_description.trim()) return toast.error("Describe the role.");
    if (!form.success_criteria.trim()) return toast.error("Add what success looks like for this intern.");

    setSubmitting(true);
    try {
      const payload = {
        recruiter_user_id: user.id,
        cohort_id: window.id,
        role_title: form.role_title.trim(),
        role_description: form.role_description.trim(),
        required_skills: form.required_skills.split(",").map((s) => s.trim()).filter(Boolean),
        weekly_hours: form.weekly_hours ? parseInt(form.weekly_hours, 10) : null,
        duration_weeks: form.duration_weeks ? parseInt(form.duration_weeks, 10) : null,
        stipend_naira: form.stipend_naira ? parseInt(form.stipend_naira, 10) : null,
        success_criteria: form.success_criteria.trim(),
        additional_notes: form.additional_notes.trim() || null,
        status: "pending" as const,
      };
      let error;
      let savedId = existing?.id as string | undefined;
      if (existing && existing.status === "pending") {
        ({ error } = await supabase
          .from("intern_match_applications")
          .update(payload)
          .eq("id", existing.id));
      } else {
        const ins = await supabase.from("intern_match_applications").insert(payload).select("id").maybeSingle();
        error = ins.error;
        savedId = ins.data?.id;
      }
      if (error) throw error;

      // Auto-run the matching engine for this brief
      if (savedId) {
        try {
          await supabase.functions.invoke("shortlist-intern-matches", { body: { brief_id: savedId } });
        } catch (_) { /* non-blocking */ }
      }

      toast.success("Submitted! We're scoring vetted interns against your brief — matches will appear in minutes.");
      if (savedId) navigate(`/recruiter/intern-match/${savedId}/matches`);
      else navigate("/recruiter");
    } catch (e: any) {
      toast.error(e.message || "Could not submit application");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground text-sm">Loading…</div>;

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-[1200px] mx-auto w-full">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-[12.5px] text-muted-foreground hover:text-foreground mb-3">
        <ArrowLeft className="w-3.5 h-3.5" /> Back
      </button>

      <div className="flex items-center gap-2 mb-1.5">
        <Sparkles className="w-4 h-4 text-primary" />
        <span className="text-[11px] font-bold uppercase tracking-wider text-primary">Intern Match · Free</span>
      </div>
      <h1 className="text-[28px] md:text-[34px] font-serif text-foreground">Get matched with a <em>vetted intern</em>, each quarter.</h1>
      <p className="text-[13.5px] text-muted-foreground mt-1.5 leading-relaxed">
        Intern Match opens once a quarter. Submit a brief, and our team hand-picks 3–5 interns from the
        Remote Workher Internship Program for you. <strong className="text-foreground">It's free</strong> — but applications
        are limited to founders with an <strong className="text-foreground">approved company page</strong>.
      </p>

      {!window && (
        <div className="mt-5 p-5 rounded-2xl border border-border bg-muted/40 flex items-start gap-3">
          <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
          <div>
            <div className="text-[14px] font-semibold text-foreground">Applications are closed right now</div>
            <p className="text-[12.5px] text-muted-foreground mt-1">
              Intern Match opens once per quarter. Make sure your company page is complete and approved so you're
              ready when the next cohort opens.
            </p>
            <button
              onClick={() => navigate("/recruiter/company")}
              className="mt-3 px-3.5 py-2 rounded-lg border border-border text-[12.5px] font-semibold hover:bg-muted"
            >
              Review my company page →
            </button>
          </div>
        </div>
      )}

      {window && (
        <div className="mt-5 p-4 rounded-xl bg-primary-tint/40 border border-primary-border text-[13px] text-foreground flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          <span><strong>{window.cohort_name}</strong> is open — {closesIn}.</span>
        </div>
      )}

      {window && !companyApproved && (
        <div className="mt-5 p-5 rounded-2xl border border-amber-200 bg-amber-50 text-amber-900">
          <div className="flex items-center gap-2 font-bold text-[14px]"><Lock className="w-4 h-4" /> Your company page isn't approved yet</div>
          <p className="text-[12.5px] mt-1.5 leading-relaxed">
            To keep Intern Match high quality for interns, only founders with an approved company page can apply.
            Complete every field, submit for review, and we'll approve typically within 1–2 business days.
          </p>
          <button
            onClick={() => navigate("/recruiter/company")}
            className="mt-3 px-4 py-2 rounded-lg bg-amber-900 text-amber-50 text-[12.5px] font-semibold"
          >
            Complete my company page →
          </button>
        </div>
      )}

      {window && existing && (
        <div className={`mt-5 p-4 rounded-xl text-[13px] flex items-center gap-2 ${
          existing.status === "approved" ? "bg-emerald-50 border border-emerald-200 text-emerald-800" :
          existing.status === "rejected" ? "bg-rose-50 border border-rose-200 text-rose-800" :
          "bg-amber-50 border border-amber-200 text-amber-800"
        }`}>
          {existing.status === "approved" ? <Check className="w-4 h-4" /> :
           existing.status === "rejected" ? <X className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
          <span>
            {existing.status === "approved" && "You're in this cohort. We'll send your shortlist soon."}
            {existing.status === "rejected" && "Not selected for this cohort. You can re-apply next quarter."}
            {existing.status === "pending" && "Application under review. You can still edit below."}
            {existing.status === "waitlist" && "You're on the waitlist for this cohort."}
            {existing.status === "matched" && "You've been matched! Check your email for next steps."}
          </span>
        </div>
      )}

      {window && companyApproved && (!existing || existing.status === "pending") && (
        <div className="mt-5 bg-card border border-border rounded-2xl p-5 md:p-6 space-y-5">
          <Field label="Role title *">
            <input value={form.role_title} onChange={(e) => set("role_title", e.target.value)} placeholder="e.g. Marketing Intern" className={inputCls} />
          </Field>
          <Field label="What will this intern do? *" hint="Be specific. The clearer the brief, the better the match.">
            <textarea value={form.role_description} onChange={(e) => set("role_description", e.target.value)} rows={5} className={inputCls} />
          </Field>
          <Field label="Required skills (comma-separated)">
            <input value={form.required_skills} onChange={(e) => set("required_skills", e.target.value)} placeholder="Copywriting, Canva, Notion" className={inputCls} />
          </Field>
          <div className="grid md:grid-cols-3 gap-4">
            <Field label="Weekly hours">
              <input value={form.weekly_hours} onChange={(e) => set("weekly_hours", e.target.value)} type="number" min={1} className={inputCls} />
            </Field>
            <Field label="Duration (weeks)">
              <input value={form.duration_weeks} onChange={(e) => set("duration_weeks", e.target.value)} type="number" min={1} className={inputCls} />
            </Field>
            <Field label="Monthly stipend (₦)" hint="Optional but recommended.">
              <input value={form.stipend_naira} onChange={(e) => set("stipend_naira", e.target.value)} type="number" placeholder="50000" className={inputCls} />
            </Field>
          </div>
          <Field label="What does success look like? *" hint="One concrete outcome the intern should help you achieve.">
            <textarea value={form.success_criteria} onChange={(e) => set("success_criteria", e.target.value)} rows={3} className={inputCls} />
          </Field>
          <Field label="Anything else?">
            <textarea value={form.additional_notes} onChange={(e) => set("additional_notes", e.target.value)} rows={3} className={inputCls} />
          </Field>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <button onClick={() => navigate("/recruiter")} className="px-4 py-2.5 rounded-xl border border-border text-[13px] font-semibold hover:bg-muted">
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary-dark disabled:opacity-60 inline-flex items-center gap-1.5"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {existing ? "Update application" : "Submit application"}
            </button>
          </div>
        </div>
      )}

      {pastBriefs.length > 0 && (
        <div className="mt-6 bg-card border border-border rounded-2xl p-5">
          <div className="text-[13px] font-bold text-foreground mb-3">Your briefs & matches</div>
          <div className="space-y-2">
            {pastBriefs.map((b: any) => {
              const interested = (b.intern_match_assignments ?? []).filter((x: any) => x.status === "interested" || x.status === "accepted").length;
              const total = (b.intern_match_assignments ?? []).length;
              return (
                <button
                  key={b.id}
                  onClick={() => navigate(`/recruiter/intern-match/${b.id}/matches`)}
                  className="w-full text-left flex items-center justify-between gap-3 p-3 rounded-xl border border-border hover:border-primary/40 hover:bg-muted/30 transition"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-[13.5px] text-foreground truncate">{b.role_title}</div>
                    <div className="text-[11.5px] text-muted-foreground">{total} shortlisted · {interested} interested</div>
                  </div>
                  <span className="text-[12px] font-semibold text-primary shrink-0">View matches →</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-6 bg-card border border-border rounded-2xl p-5">
        <div className="text-[13px] font-bold text-foreground mb-2">How Intern Match works</div>
        <ol className="space-y-2 text-[12.5px] text-muted-foreground list-decimal pl-5">
          <li>Once a quarter, applications open for ~2 weeks.</li>
          <li>Only founders with an approved company page can apply (free).</li>
          <li>Our team hand-picks 3–5 vetted interns per accepted brief.</li>
          <li>You meet your shortlist, pick one, and we kick off the placement.</li>
        </ol>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[12px] font-semibold text-foreground">{label}</label>
      {children}
      {hint && <p className="text-[11.5px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
