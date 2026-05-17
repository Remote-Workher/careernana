import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck, Check, Clock, X, ArrowRight, Lock, Briefcase, Sparkles, Users, Mail, Loader2, GraduationCap, CalendarDays } from "lucide-react";
import { usePlanTier } from "@/hooks/usePlanTier";
import { openUpgradeModal } from "@/lib/upgrade-modal";
import { useSEO } from "@/components/SEO";
import { toast } from "sonner";

type Profile = {
  vetted_status: "none" | "pending" | "approved" | "rejected";
  vetted_at: string | null;
  vetted_notes: string | null;
};

type Assignment = {
  id: string;
  status: string;
  intro_message: string | null;
  created_at: string;
  brief: {
    id: string;
    role_title: string;
    role_description: string;
    required_skills: string[];
    weekly_hours: number | null;
    duration_weeks: number | null;
    stipend_naira: number | null;
  } | null;
};

export default function InternshipProgram() {
  useSEO({ title: "Remote Workher Internship Program" });
  const navigate = useNavigate();
  const { tier, isPaidActive, loading: tierLoading } = usePlanTier();
  const isMember = isPaidActive && (tier === "standard" || tier === "premium");
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }

      const [{ data: prof }, { data: rows }] = await Promise.all([
        supabase
          .from("profiles")
          .select("vetted_status, vetted_at, vetted_notes")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("intern_match_assignments")
          .select("id, status, intro_message, created_at, brief:intern_match_applications(id, role_title, role_description, required_skills, weekly_hours, duration_weeks, stipend_naira)")
          .eq("talent_user_id", user.id)
          .order("created_at", { ascending: false }),
      ]);
      setProfile((prof as any) ?? null);
      setAssignments((rows as any) ?? []);
      setLoading(false);
    })();
  }, [navigate]);

  const status = profile?.vetted_status ?? "none";

  const respond = async (id: string, newStatus: "accepted" | "declined") => {
    setUpdatingId(id);
    const { error } = await supabase
      .from("intern_match_assignments")
      .update({ status: newStatus })
      .eq("id", id);
    setUpdatingId(null);
    if (error) return toast.error(error.message || "Could not update");
    setAssignments((rows) => rows.map((r) => (r.id === id ? { ...r, status: newStatus } : r)));
    toast.success(newStatus === "accepted" ? "Great — we'll introduce you to the founder." : "Got it. We'll keep looking.");
  };

  if (loading || tierLoading) {
    return <div className="p-8 text-center text-muted-foreground text-sm">Loading…</div>;
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-[1100px] mx-auto w-full">
      {/* Hero */}
      <div className="rounded-2xl border border-border bg-card p-5 md:p-7">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-full bg-primary-tint text-primary flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold uppercase tracking-wider text-primary">Internship Program</span>
              <StatusPill status={status} />
            </div>
            <h1 className="font-serif text-[26px] md:text-[32px] text-foreground mt-1">Remote Workher Internship Program</h1>
            <p className="text-[13.5px] text-muted-foreground mt-2 leading-relaxed max-w-[680px]">
              A private internship pool curated by our team. Apply once, get reviewed in 3–5 days, and when a founder
              submits an Intern Match brief that fits you, we'll reach out here and by email. You're never made
              public or browsable.
            </p>

            {/* Action row */}
            <div className="mt-4">
              {!isMember ? (
                <MembersOnlyCta />
              ) : status === "none" ? (
                <button
                  onClick={() => navigate("/vetted-talent")}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-[13.5px] font-semibold hover:bg-primary-dark"
                >
                  Apply to the program <ArrowRight className="w-4 h-4" />
                </button>
              ) : status === "pending" ? (
                <div className="flex items-center gap-3 flex-wrap">
                  <p className="text-[12.5px] text-muted-foreground">Our team is reviewing your application (3–5 days).</p>
                  <button
                    onClick={() => navigate("/vetted-talent")}
                    className="text-[12.5px] font-semibold text-primary hover:underline inline-flex items-center gap-1"
                  >
                    Edit application <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : status === "rejected" ? (
                <div className="space-y-2">
                  {profile?.vetted_notes && (
                    <p className="text-[12.5px] text-muted-foreground">
                      <span className="font-semibold text-foreground">Reviewer notes:</span> {profile.vetted_notes}
                    </p>
                  )}
                  <button
                    onClick={() => navigate("/vetted-talent")}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary-dark"
                  >
                    Re-apply <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3 flex-wrap">
                  <p className="text-[12.5px] text-emerald-700">
                    You're in the pool{profile?.vetted_at ? ` since ${new Date(profile.vetted_at).toLocaleDateString()}` : ""}.
                  </p>
                  <button
                    onClick={() => navigate("/vetted-talent")}
                    className="text-[12.5px] font-semibold text-primary hover:underline inline-flex items-center gap-1"
                  >
                    Update details <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="mt-6 grid md:grid-cols-3 gap-3">
        <HowCard icon={ShieldCheck} title="1. Apply once" body="Tell us about your skills, wins, and what you're open to. Reviewed in 3–5 days." />
        <HowCard icon={Sparkles} title="2. We match you" body="When a founder posts a brief in our quarterly Intern Match window, we hand-pick a shortlist." />
        <HowCard icon={Mail} title="3. Get introduced" body="We send the brief here and by email. You decide if you'd like to be introduced to the founder." />
      </div>

      {/* Matches */}
      <div className="mt-8">
        <div className="flex items-center gap-2 mb-3">
          <Briefcase className="w-4 h-4 text-primary" />
          <h2 className="font-serif text-[20px] text-foreground">Your matches</h2>
          {assignments.length > 0 && (
            <span className="text-[11px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{assignments.length}</span>
          )}
        </div>

        {status !== "approved" ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-6 text-center">
            <Users className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
            <p className="text-[13px] text-muted-foreground">
              {status === "none" && "Apply and get accepted to start receiving founder briefs that match your profile."}
              {status === "pending" && "Once you're accepted, matched briefs from founders will show up here."}
              {status === "rejected" && "Re-apply to be considered for upcoming Intern Match briefs."}
            </p>
          </div>
        ) : assignments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-6 text-center">
            <Users className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
            <p className="text-[13px] text-muted-foreground">
              No matches yet. Our team reviews founder briefs every quarter — we'll notify you here and by email
              the moment we shortlist you.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {assignments.map((a) => (
              <MatchCard key={a.id} a={a} updating={updatingId === a.id} onRespond={respond} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  if (status === "approved")
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10.5px] font-semibold">
        <Check className="w-3 h-3" /> In the pool
      </span>
    );
  if (status === "pending")
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10.5px] font-semibold">
        <Clock className="w-3 h-3" /> Under review
      </span>
    );
  if (status === "rejected")
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10.5px] font-semibold">
        <X className="w-3 h-3" /> Not approved
      </span>
    );
  return null;
}

function HowCard({ icon: Icon, title, body }: { icon: any; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="w-8 h-8 rounded-full bg-primary-tint text-primary flex items-center justify-center mb-2">
        <Icon className="w-4 h-4" />
      </div>
      <div className="font-semibold text-[13.5px] text-foreground">{title}</div>
      <p className="text-[12.5px] text-muted-foreground mt-1 leading-relaxed">{body}</p>
    </div>
  );
}

function MatchCard({ a, updating, onRespond }: { a: Assignment; updating: boolean; onRespond: (id: string, s: "accepted" | "declined") => void }) {
  const brief = a.brief;
  if (!brief) return null;
  const decided = a.status === "accepted" || a.status === "declined" || a.status === "withdrawn";
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h3 className="font-serif text-[18px] text-foreground">{brief.role_title}</h3>
          <div className="flex items-center gap-3 flex-wrap text-[12px] text-muted-foreground mt-1">
            {brief.weekly_hours && <span className="inline-flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" />{brief.weekly_hours} hrs/wk</span>}
            {brief.duration_weeks && <span>· {brief.duration_weeks} weeks</span>}
            {brief.stipend_naira && <span>· ₦{brief.stipend_naira.toLocaleString()} stipend</span>}
          </div>
        </div>
        <AssignmentBadge status={a.status} />
      </div>

      {a.intro_message && (
        <div className="mt-3 p-3 rounded-xl bg-primary-tint/40 text-[12.5px] text-foreground border border-primary/15">
          <div className="font-semibold text-primary text-[11px] uppercase tracking-wider mb-1">Note from our team</div>
          {a.intro_message}
        </div>
      )}

      <p className="text-[13px] text-muted-foreground mt-3 leading-relaxed whitespace-pre-wrap">{brief.role_description}</p>

      {brief.required_skills?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {brief.required_skills.map((s) => (
            <span key={s} className="px-2 py-0.5 rounded-full bg-muted text-[11px] text-foreground">{s}</span>
          ))}
        </div>
      )}

      {!decided && (
        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={() => onRespond(a.id, "accepted")}
            disabled={updating}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-[12.5px] font-semibold hover:bg-primary-dark disabled:opacity-60"
          >
            {updating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Yes, introduce me
          </button>
          <button
            onClick={() => onRespond(a.id, "declined")}
            disabled={updating}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border bg-background text-foreground text-[12.5px] font-semibold hover:bg-muted disabled:opacity-60"
          >
            Not a fit
          </button>
        </div>
      )}
    </div>
  );
}

function AssignmentBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    shortlisted: { label: "Shortlisted", cls: "bg-amber-100 text-amber-700" },
    introduced: { label: "Introduced", cls: "bg-blue-100 text-blue-700" },
    accepted: { label: "You said yes", cls: "bg-emerald-100 text-emerald-700" },
    declined: { label: "You passed", cls: "bg-muted text-muted-foreground" },
    withdrawn: { label: "Withdrawn", cls: "bg-muted text-muted-foreground" },
  };
  const m = map[status] ?? map.shortlisted;
  return <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-semibold ${m.cls}`}>{m.label}</span>;
}

function MembersOnlyCta() {
  return (
    <div className="rounded-xl border border-dashed border-border bg-muted/40 p-3.5 max-w-[520px]">
      <div className="flex items-center gap-2 text-[12.5px] font-semibold text-foreground">
        <Lock className="w-3.5 h-3.5 text-primary" /> The Internship Program is for Standard & Premium members
      </div>
      <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">
        Upgrade to apply, get reviewed by our team, and be matched with founders hiring through Remote Workher.
      </p>
      <button
        onClick={() => openUpgradeModal({ heading: "Internship Program is for members", subtext: "Upgrade to apply and get matched with founders hiring through Remote Workher." })}
        className="mt-2.5 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-[12.5px] font-semibold hover:bg-primary-dark"
      >
        Upgrade to apply <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
