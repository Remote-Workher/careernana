import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useRecruiterAuth } from "@/hooks/useRecruiterAuth";
import { useSEO } from "@/components/SEO";
import { ArrowLeft, Check, X, Loader2, MapPin, Briefcase, Star, Mail, ExternalLink, Sparkles } from "lucide-react";
import { toast } from "sonner";

type Assignment = {
  id: string;
  status: string;
  match_score: number | null;
  match_reasons: any;
  intro_message: string | null;
  invite_message: string | null;
  talent_user_id: string;
  created_at: string;
};

type TalentInfo = {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  city: string | null;
  location: string | null;
  years_experience?: number | null;
  current_role_title?: string | null;
  top_skills?: string[] | null;
  resume_url?: string | null;
  linkedin_url?: string | null;
  portfolio_url?: string | null;
  expected_salary_min?: number | null;
  expected_salary_max?: number | null;
};

export default function InternMatchMatches() {
  useSEO({ title: "Your matches — Intern Match" });
  const { briefId } = useParams<{ briefId: string }>();
  const navigate = useNavigate();
  const { user } = useRecruiterAuth();
  const [loading, setLoading] = useState(true);
  const [brief, setBrief] = useState<any>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [talents, setTalents] = useState<Record<string, TalentInfo>>({});
  const [actingId, setActingId] = useState<string | null>(null);
  const [inviteModal, setInviteModal] = useState<{ assignment: Assignment; talent: TalentInfo } | null>(null);
  const [inviteText, setInviteText] = useState("");
  const [reshortlisting, setReshortlisting] = useState(false);

  const load = async () => {
    if (!user || !briefId) return;
    setLoading(true);
    const [{ data: b }, { data: a }] = await Promise.all([
      supabase.from("intern_match_applications").select("*").eq("id", briefId).maybeSingle(),
      supabase
        .from("intern_match_assignments")
        .select("id, status, match_score, match_reasons, intro_message, invite_message, talent_user_id, created_at")
        .eq("brief_id", briefId)
        .order("match_score", { ascending: false }),
    ]);
    setBrief(b);
    const list = (a as Assignment[]) ?? [];
    setAssignments(list);
    if (list.length) {
      const userIds = list.map((x) => x.talent_user_id);
      const [{ data: profs }, { data: vets }] = await Promise.all([
        supabase.from("profiles").select("user_id, full_name, avatar_url, city, location").in("user_id", userIds),
        supabase
          .from("vetting_applications")
          .select("user_id, years_experience, current_role_title, top_skills, resume_url, linkedin_url, portfolio_url, expected_salary_min, expected_salary_max")
          .in("user_id", userIds)
          .eq("status", "approved"),
      ]);
      const map: Record<string, TalentInfo> = {};
      for (const p of profs ?? []) map[p.user_id] = { ...(map[p.user_id] || { user_id: p.user_id }), ...p } as TalentInfo;
      for (const v of vets ?? []) map[v.user_id] = { ...(map[v.user_id] || { user_id: v.user_id, full_name: null, avatar_url: null, city: null, location: null }), ...v };
      setTalents(map);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [user, briefId]);

  const grouped = useMemo(() => {
    const g: Record<string, Assignment[]> = { interested: [], invited: [], shortlisted: [], rejected_by_founder: [], not_interested: [] };
    for (const a of assignments) {
      if (a.status === "accepted" || a.status === "interested") g.interested.push(a);
      else if (a.status === "invited") g.invited.push(a);
      else if (a.status === "rejected_by_founder") g.rejected_by_founder.push(a);
      else if (a.status === "declined" || a.status === "not_interested" || a.status === "withdrawn") g.not_interested.push(a);
      else g.shortlisted.push(a);
    }
    return g;
  }, [assignments]);

  const founderAction = async (a: Assignment, action: "invite" | "pass") => {
    setActingId(a.id);
    const patch: any = action === "invite"
      ? { status: "invited", invite_message: inviteText.trim() || null }
      : { status: "rejected_by_founder" };
    const { error } = await supabase.from("intern_match_assignments").update(patch).eq("id", a.id);
    setActingId(null);
    if (error) return toast.error(error.message);

    if (action === "invite") {
      const t = talents[a.talent_user_id];
      const email = (t as any)?.email; // profile.email isn't fetched; fetch quickly
      // Send invite email via edge function (best-effort)
      try {
        const { data: prof } = await supabase.from("profiles").select("email, full_name").eq("user_id", a.talent_user_id).maybeSingle();
        if (prof?.email) {
          await supabase.functions.invoke("send-transactional-email", {
            body: {
              templateName: "intern-match-invited",
              recipientEmail: prof.email,
              idempotencyKey: `imatch-invited-${a.id}`,
              templateData: {
                name: prof.full_name,
                company: brief?.role_title ? undefined : undefined,
                role_title: brief?.role_title,
                invite_message: inviteText.trim() || undefined,
              },
            },
          });
        }
      } catch {}
      toast.success("Invite sent! She'll get an email and see it in her dashboard.");
      setInviteModal(null);
      setInviteText("");
    } else {
      toast.success("Passed on this candidate.");
    }
    load();
  };

  const runShortlist = async () => {
    if (!briefId) return;
    setReshortlisting(true);
    const { data, error } = await supabase.functions.invoke("shortlist-intern-matches", { body: { brief_id: briefId } });
    setReshortlisting(false);
    if (error) return toast.error(error.message);
    toast.success(`Shortlisted ${(data as any)?.shortlisted ?? 0} intern${(data as any)?.shortlisted === 1 ? "" : "s"}.`);
    load();
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground text-sm">Loading…</div>;
  if (!brief) return <div className="p-8 text-center text-muted-foreground text-sm">Brief not found.</div>;

  return (
    <div className="p-4 md:p-6 lg:p-8 w-full max-w-[1200px] mx-auto animate-fade-in">
      <button onClick={() => navigate("/recruiter/intern-match")} className="inline-flex items-center gap-1.5 text-[12.5px] text-muted-foreground hover:text-foreground mb-3">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Intern Match
      </button>

      {/* Brief summary */}
      <div className="bg-card border border-border rounded-2xl p-5 md:p-6 mb-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="eyebrow mb-1">Your brief</p>
            <h1 className="headline text-[24px] md:text-[30px] text-foreground leading-tight">{brief.role_title}</h1>
            <div className="flex items-center gap-2 flex-wrap text-[12.5px] text-muted-foreground mt-2">
              {brief.weekly_hours && <span>{brief.weekly_hours} hrs/wk</span>}
              {brief.duration_weeks && <span>· {brief.duration_weeks} weeks</span>}
              {brief.stipend_naira && <span>· ₦{brief.stipend_naira.toLocaleString()}/mo</span>}
            </div>
          </div>
          <button
            onClick={runShortlist}
            disabled={reshortlisting}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border text-[12.5px] font-semibold hover:bg-muted disabled:opacity-60"
            title="Re-run the matching engine"
          >
            {reshortlisting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            Re-run matching
          </button>
        </div>
        {brief.required_skills?.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {brief.required_skills.map((s: string) => (
              <span key={s} className="px-2 py-0.5 rounded-full bg-muted text-[11px] text-foreground">{s}</span>
            ))}
          </div>
        )}
      </div>

      {assignments.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-8 text-center">
          <p className="text-[13px] text-muted-foreground">
            No interns matched yet. Click "Re-run matching" to score the latest vetted talents against your brief.
          </p>
        </div>
      )}

      <Section title="Interested" subtitle="These talents said yes — decide whether to interview." items={grouped.interested}
        renderActions={(a) => (
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setInviteModal({ assignment: a, talent: talents[a.talent_user_id] || ({} as TalentInfo) }); setInviteText(""); }}
              disabled={actingId === a.id}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-[12.5px] font-semibold hover:bg-primary-dark disabled:opacity-60"
            >
              <Check className="w-3.5 h-3.5" /> Invite to interview
            </button>
            <button
              onClick={() => founderAction(a, "pass")}
              disabled={actingId === a.id}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border text-[12.5px] font-semibold hover:bg-muted disabled:opacity-60"
            >
              <X className="w-3.5 h-3.5" /> Pass
            </button>
          </div>
        )}
        talents={talents}
      />

      <Section title="Awaiting response" subtitle="Shortlisted — they haven't replied yet." items={grouped.shortlisted} talents={talents} />
      <Section title="Invited to interview" items={grouped.invited} talents={talents} muted />
      <Section title="Passed" items={[...grouped.rejected_by_founder, ...grouped.not_interested]} talents={talents} muted />

      {inviteModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end md:items-center justify-center p-4">
          <div className="bg-card rounded-2xl w-full max-w-[480px] p-5 md:p-6">
            <h3 className="font-serif text-[20px] text-foreground">Invite {inviteModal.talent?.full_name?.split(" ")[0] || "her"} to interview</h3>
            <p className="text-[12.5px] text-muted-foreground mt-1">She'll get an email with your note and see the invite on her dashboard.</p>
            <textarea
              value={inviteText}
              onChange={(e) => setInviteText(e.target.value)}
              rows={4}
              placeholder="Hi! Loved your background. Can we chat Thursday at 3pm? Send a Calendly or reply with times that work."
              className="mt-3 w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-[13.5px] focus:outline-none focus:border-primary"
            />
            <div className="flex items-center justify-end gap-2 mt-4">
              <button onClick={() => setInviteModal(null)} className="px-4 py-2 rounded-xl border border-border text-[12.5px] font-semibold hover:bg-muted">Cancel</button>
              <button
                onClick={() => founderAction(inviteModal.assignment, "invite")}
                disabled={actingId === inviteModal.assignment.id}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-[12.5px] font-semibold hover:bg-primary-dark disabled:opacity-60 inline-flex items-center gap-1.5"
              >
                {actingId === inviteModal.assignment.id && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Send invite
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({
  title, subtitle, items, talents, renderActions, muted,
}: {
  title: string;
  subtitle?: string;
  items: Assignment[];
  talents: Record<string, TalentInfo>;
  renderActions?: (a: Assignment) => React.ReactNode;
  muted?: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <div className="mt-6">
      <div className="flex items-center gap-2 mb-2">
        <h2 className="font-serif text-[18px] text-foreground">{title}</h2>
        <span className="text-[11px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{items.length}</span>
      </div>
      {subtitle && <p className="text-[12px] text-muted-foreground mb-3">{subtitle}</p>}
      <div className="space-y-3">
        {items.map((a) => (
          <TalentCard key={a.id} a={a} t={talents[a.talent_user_id]} actions={renderActions?.(a)} muted={muted} />
        ))}
      </div>
    </div>
  );
}

function TalentCard({ a, t, actions, muted }: { a: Assignment; t?: TalentInfo; actions?: React.ReactNode; muted?: boolean }) {
  const reasons = a.match_reasons || {};
  const hits: string[] = reasons.matched_skills ?? [];
  return (
    <div className={`rounded-2xl border border-border bg-card p-4 md:p-5 ${muted ? "opacity-75" : ""}`}>
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-full bg-primary-tint text-primary flex items-center justify-center font-semibold shrink-0 overflow-hidden">
          {t?.avatar_url ? <img src={t.avatar_url} alt="" className="w-full h-full object-cover" /> : (t?.full_name?.[0] || "?")}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-foreground text-[14.5px]">{t?.full_name || "Vetted intern"}</h3>
            {a.match_score != null && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10.5px] font-semibold">
                <Star className="w-3 h-3" /> {a.match_score}% match
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 flex-wrap text-[12px] text-muted-foreground mt-0.5">
            {t?.current_role_title && <span className="inline-flex items-center gap-1"><Briefcase className="w-3 h-3" />{t.current_role_title}</span>}
            {(t?.city || t?.location) && <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{t.city || t.location}</span>}
            {t?.years_experience != null && <span>· {t.years_experience} yr{t.years_experience === 1 ? "" : "s"} exp</span>}
          </div>

          {hits.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {hits.slice(0, 6).map((s) => (
                <span key={s} className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10.5px] font-medium">✓ {s}</span>
              ))}
            </div>
          )}

          <div className="mt-2 flex items-center gap-3 text-[12px]">
            {t?.resume_url && <a href={t.resume_url} target="_blank" rel="noreferrer" className="text-primary font-semibold inline-flex items-center gap-1 hover:underline">Resume <ExternalLink className="w-3 h-3" /></a>}
            {t?.linkedin_url && <a href={t.linkedin_url} target="_blank" rel="noreferrer" className="text-primary font-semibold inline-flex items-center gap-1 hover:underline">LinkedIn <ExternalLink className="w-3 h-3" /></a>}
            {t?.portfolio_url && <a href={t.portfolio_url} target="_blank" rel="noreferrer" className="text-primary font-semibold inline-flex items-center gap-1 hover:underline">Portfolio <ExternalLink className="w-3 h-3" /></a>}
          </div>

          {a.invite_message && (
            <div className="mt-3 p-3 rounded-xl bg-primary-tint/40 border border-primary/15 text-[12.5px] text-foreground">
              <div className="text-[10.5px] font-semibold uppercase text-primary mb-1">Your invite</div>
              {a.invite_message}
            </div>
          )}

          {actions && <div className="mt-3">{actions}</div>}
        </div>
      </div>
    </div>
  );
}
