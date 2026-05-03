import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePlanTier } from "@/hooks/usePlanTier";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  Sparkles,
  Crown,
  Send,
  Check,
  X,
  Flame,
  Video,
  CalendarDays,
  Trophy,
  MessageCircle,
  ClipboardList,
  ArrowLeft,
  Plus,
} from "lucide-react";

type Tab = "match" | "requests" | "dashboard";
type Pref = {
  id?: string;
  user_id?: string;
  goal: string;
  role: string;
  experience_level: string;
  availability: string;
  checkin_days: string[];
  is_searching: boolean;
  goal_type?: string | null;
  goal_timeline?: string | null;
  career_stage?: string | null;
  target_industry?: string | null;
  current_position?: string | null;
};
type ProfileLite = {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  job_title: string | null;
  city: string | null;
  location: string | null;
};
type Match = ProfileLite & {
  pref: Pref;
  match_score: number;
  weekly_apps: number;
  streak: number;
  active_today: boolean;
  reasons?: string[];
};
type Partnership = {
  id: string;
  user_a: string;
  user_b: string;
  jitsi_room: string;
  weekly_call_day: string | null;
  weekly_call_time: string | null;
  streak: number;
  status: string;
};
type DemoRequest = {
  id: string;
  user: Match;
  direction: "incoming" | "outgoing";
  message: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
  expires_at: string;
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const GOALS = ["Get a job", "Freelance", "Switch careers"];
const EXPERIENCE = ["0–1 years", "1–3 years", "3+ years"];
const AVAILABILITY = ["Daily", "3x per week", "Weekly"];
const GOAL_TYPES = [
  "Land my first remote job",
  "Switch to a new industry",
  "Get promoted in my current field",
  "Land an international role",
  "Return to work after a break",
  "Go full-time freelance",
];
const GOAL_TIMELINES = ["Within 30 days", "Within 60 days", "Within 90 days"];
const CAREER_STAGES = [
  "Entry level (0–1 yrs)",
  "Junior (1–3 yrs)",
  "Mid level (3–5 yrs)",
  "Senior (5–8 yrs)",
  "Lead / Manager (8+ yrs)",
];
const INDUSTRIES = [
  "Tech / Software",
  "Product & Design",
  "Marketing & Comms",
  "Finance & Fintech",
  "Data & Analytics",
  "Operations & PM",
  "Sales & Customer Success",
  "HR & People Ops",
  "Healthcare",
  "Education",
  "Other",
];

export default function Accountability() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { tier, signedIn, loading: tierLoading } = usePlanTier();
  const [uid, setUid] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("match");
  const [partnership, setPartnership] = useState<Partnership | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null));
  }, []);

  // Load active partnership
  useEffect(() => {
    if (!uid) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("accountability_partnerships" as any)
        .select("*")
        .or(`user_a.eq.${uid},user_b.eq.${uid}`)
        .eq("status", "active")
        .maybeSingle();
      setPartnership((data as any) || null);
      if (data) setTab("dashboard");
      setLoading(false);
    })();
  }, [uid]);

  if (tierLoading || loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  }

  if (!signedIn) {
    return (
      <Gate
        title="Sign in to find your partner"
        body="Accountability partners help you stay consistent and apply daily."
        cta="Sign in"
        onClick={() => navigate("/login")}
      />
    );
  }

  if (tier !== "premium") {
    return (
      <Gate
        title="Accountability is a Premium feature"
        body="Get matched with a partner, daily check-ins, weekly calls and shared challenges to stay consistent and get hired faster."
        cta="Upgrade to Premium"
        onClick={() => navigate("/payment?tier=premium")}
      />
    );
  }

  return (
    <div className="w-full space-y-5 animate-fade-in">
      <div>
        <h1 className="text-[26px] sm:text-[30px] font-bold text-foreground leading-tight">
          Accountability
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Find a partner, check in daily, and ship together.
        </p>
      </div>

      <div className="flex items-center gap-2 border-b border-border overflow-x-auto -mx-1 px-1">
        {([
          ["match", "Find Partner", Sparkles],
          ["requests", "Requests", Send],
          ["dashboard", "Dashboard", Trophy],
        ] as const).map(([k, label, Icon]) => {
          const active = tab === k;
          const disabled = k === "dashboard" && !partnership;
          return (
            <button
              key={k}
              disabled={disabled}
              onClick={() => setTab(k)}
              className={`relative inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-2.5 text-[12.5px] font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
              {active && (
                <span className="absolute left-2 right-2 -bottom-px h-[2px] bg-primary rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {tab === "match" && uid && (
        <MatchTab
          uid={uid}
          onPartnered={(p) => {
            setPartnership(p);
            setTab("dashboard");
          }}
        />
      )}
      {tab === "requests" && uid && (
        <RequestsTab
          uid={uid}
          onAccepted={(p) => {
            setPartnership(p);
            setTab("dashboard");
          }}
        />
      )}
      {tab === "dashboard" && uid && partnership && (
        <DashboardTab
          uid={uid}
          partnership={partnership}
          onEnded={() => {
            setPartnership(null);
            setTab("match");
          }}
        />
      )}
    </div>
  );
}

/* ───────── Premium gate ───────── */
function Gate({
  title,
  body,
  cta,
  onClick,
}: {
  title: string;
  body: string;
  cta: string;
  onClick: () => void;
}) {
  return (
    <div className="w-full min-h-[60vh] flex items-center justify-center animate-fade-in">
      <div className="text-center max-w-md px-6">
        <div className="w-16 h-16 rounded-2xl bg-primary-tint flex items-center justify-center mx-auto mb-5">
          <Crown className="w-7 h-7 text-primary" />
        </div>
        <h1 className="text-[26px] sm:text-[30px] font-serif text-foreground tracking-[-0.02em] leading-tight">
          {title}
        </h1>
        <p className="text-[14px] text-muted-foreground mt-3 leading-relaxed">{body}</p>
        <Button
          onClick={onClick}
          className="mt-6 rounded-full bg-primary hover:bg-primary-dark text-primary-foreground h-11 px-6 text-sm font-semibold"
        >
          {cta}
        </Button>
      </div>
    </div>
  );
}

/* ───────── MATCH TAB ───────── */
function MatchTab({
  uid,
  onPartnered,
}: {
  uid: string;
  onPartnered: (p: Partnership) => void;
}) {
  const { toast } = useToast();
  const [pref, setPref] = useState<Pref>({
    goal: "Get a job",
    role: "",
    experience_level: "1–3 years",
    availability: "Daily",
    checkin_days: ["Mon", "Wed", "Fri"],
    is_searching: true,
    goal_type: "Land my first remote job",
    goal_timeline: "Within 90 days",
    career_stage: "Junior (1–3 yrs)",
    target_industry: "Tech / Software",
    current_position: "",
  });
  const [poolSize, setPoolSize] = useState(0);
  const [matches, setMatches] = useState<Match[]>([]);
  const [searching, setSearching] = useState(false);
  const [requestModal, setRequestModal] = useState<Match | null>(null);
  const [reqMessage, setReqMessage] = useState("");
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());
  const [demoRequests, setDemoRequests] = useState<DemoRequest[]>(DEMO_REQUESTS);
  const [demoPartner, setDemoPartner] = useState<Match | null>(null);
  const [demoRequestModal, setDemoRequestModal] = useState<Match | null>(null);
  const [demoReqMessage, setDemoReqMessage] = useState("");

  // Load existing pref
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("accountability_prefs" as any)
        .select("*")
        .eq("user_id", uid)
        .maybeSingle();
      if (data) setPref({ ...(data as any) });
      const { data: sent } = await supabase
        .from("accountability_requests" as any)
        .select("to_user_id")
        .eq("from_user_id", uid)
        .eq("status", "pending");
      if (sent) setSentTo(new Set((sent as any[]).map((r) => r.to_user_id)));
    })();
  }, [uid]);

  const toggleDay = (d: string) =>
    setPref((p) => ({
      ...p,
      checkin_days: p.checkin_days.includes(d)
        ? p.checkin_days.filter((x) => x !== d)
        : [...p.checkin_days, d],
    }));

  const findMatches = async () => {
    setSearching(true);
    // Save prefs
    await supabase
      .from("accountability_prefs" as any)
      .upsert({ ...pref, user_id: uid }, { onConflict: "user_id" });

    // Fetch other searching users
    const { data: prefs } = await supabase
      .from("accountability_prefs" as any)
      .select("*")
      .eq("is_searching", true)
      .neq("user_id", uid);
    const userIds = ((prefs as any[]) || []).map((p) => p.user_id);
    if (userIds.length === 0) {
      setMatches([]);
      setSearching(false);
      return;
    }
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, avatar_url, job_title, city, location")
      .in("user_id", userIds);

    const profMap = new Map<string, ProfileLite>(
      ((profiles as any[]) || []).map((p) => [p.user_id, p]),
    );

    // Match score breakdown — see why-you-match chips on each card
    const score = (other: Pref) => {
      let s = 30;
      const reasons: string[] = [];
      // Goal type + timeline (highest weight)
      if (other.goal_type && other.goal_type === pref.goal_type) {
        s += 25;
        reasons.push("Same goal");
      }
      if (other.goal_timeline && other.goal_timeline === pref.goal_timeline) {
        s += 10;
        reasons.push("Same timeline");
      }
      // Career stage + target role
      if (other.career_stage && other.career_stage === pref.career_stage) {
        s += 15;
        reasons.push("Same career stage");
      }
      if (
        other.role &&
        pref.role &&
        other.role.toLowerCase().slice(0, 4) ===
          pref.role.toLowerCase().slice(0, 4)
      ) {
        s += 15;
        reasons.push("Same target role");
      }
      if (
        other.target_industry &&
        other.target_industry === pref.target_industry
      ) {
        s += 5;
        reasons.push("Same industry");
      }
      // Logistics
      if (other.availability === pref.availability) s += 3;
      const overlap = other.checkin_days.filter((d) =>
        pref.checkin_days.includes(d),
      ).length;
      s += Math.min(overlap, 5);
      return { score: Math.min(s, 99), reasons };
    };

    const built: (Match & { reasons: string[] })[] = ((prefs as any[]) || [])
      .map((p) => {
        const prof = profMap.get(p.user_id);
        if (!prof) return null;
        const { score: sc, reasons } = score(p);
        return {
          ...prof,
          pref: p,
          match_score: sc,
          reasons,
          weekly_apps: Math.floor(Math.random() * 12) + 1,
          streak: Math.floor(Math.random() * 14),
          active_today: Math.random() > 0.4,
        } as Match & { reasons: string[] };
      })
      .filter(Boolean) as (Match & { reasons: string[] })[];

    built.sort((a, b) => b.match_score - a.match_score);
    setPoolSize(built.length);
    // Adaptive: if pool >= 20, only show high-fit (>= 70). Otherwise show top 3 anyway.
    const filtered = built.length >= 20
      ? built.filter((m) => m.match_score >= 70)
      : built;
    setMatches(filtered.slice(0, 3));
    setSearching(false);
  };

  const sendRequest = async () => {
    if (!requestModal) return;
    const { error } = await supabase
      .from("accountability_requests" as any)
      .insert({
        from_user_id: uid,
        to_user_id: requestModal.user_id,
        message: reqMessage || null,
      });
    if (error) {
      toast({
        title: "Could not send",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    setSentTo((s) => new Set(s).add(requestModal.user_id));
    toast({
      title: "Request sent ✓",
      description: "They have 48 hours to respond.",
    });
    setRequestModal(null);
    setReqMessage("");
  };

  const requestDemoPartner = (match: Match) => {
    setDemoRequestModal(match);
    setDemoReqMessage(
      `Hi ${match.full_name?.split(" ")[0]}, I’m trying to stay consistent this week. Want to be accountability partners?`,
    );
  };

  const sendDemoRequest = () => {
    if (!demoRequestModal) return;
    const alreadySent = demoRequests.some(
      (r) => r.direction === "outgoing" && r.user.user_id === demoRequestModal.user_id && r.status === "pending",
    );
    if (!alreadySent) {
      setDemoRequests((rows) => [
        {
          id: `demo-out-${demoRequestModal.user_id}`,
          user: demoRequestModal,
          direction: "outgoing",
          message: demoReqMessage,
          status: "pending",
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        },
        ...rows,
      ]);
    }
    setDemoRequestModal(null);
    setDemoReqMessage("");
    toast({ title: "Demo request sent ✓", description: "Open Requests to accept one and test the dashboard." });
  };

  const acceptDemoRequest = (requestId: string) => {
    const request = demoRequests.find((r) => r.id === requestId);
    if (!request) return;
    setDemoRequests((rows) =>
      rows.map((r) => (r.id === requestId ? { ...r, status: "accepted" } : r)),
    );
    setDemoPartner(request.user);
    toast({ title: "Demo partner connected 🎉", description: "Use the dashboard below like a real partnership." });
  };

  const declineDemoRequest = (requestId: string) => {
    setDemoRequests((rows) =>
      rows.map((r) => (r.id === requestId ? { ...r, status: "declined" } : r)),
    );
  };

  return (
    <div className="space-y-6">
      {/* Mock sandbox — request partners and use the dashboard without waiting for real users */}
      <div className="bg-gradient-to-br from-primary-tint via-card to-secondary-tint border border-primary/30 rounded-2xl p-4 sm:p-5">
        <div className="flex items-start gap-3 flex-wrap">
          <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[14px] font-bold text-foreground">
              Test accountability with mock users
            </h3>
            <p className="text-[12.5px] text-muted-foreground mt-0.5 leading-relaxed">
              Request a mock partner, accept an incoming request, then use the dashboard below with check-ins, chat, challenges and weekly calls.
            </p>
          </div>
        </div>
      </div>

      <MockAccountabilitySandbox
        requests={demoRequests}
        partner={demoPartner}
        onRequest={requestDemoPartner}
        onAccept={acceptDemoRequest}
        onDecline={declineDemoRequest}
        onReset={() => {
          setDemoRequests(DEMO_REQUESTS);
          setDemoPartner(null);
        }}
      />

      {/* Form */}
      <div className="bg-card border border-border rounded-2xl p-5 sm:p-6">
        <h2 className="text-lg font-bold text-foreground">
          Find your Accountability Partner
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          We match you with women chasing the same goal, on the same timeline,
          at the same career stage.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          <div className="sm:col-span-2">
            <Label>What's your main goal?</Label>
            <Select
              value={pref.goal_type || ""}
              onValueChange={(v) => setPref({ ...pref, goal_type: v })}
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Pick the one closest to your reality" />
              </SelectTrigger>
              <SelectContent>
                {GOAL_TYPES.map((g) => (
                  <SelectItem key={g} value={g}>
                    {g}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>By when?</Label>
            <Select
              value={pref.goal_timeline || ""}
              onValueChange={(v) => setPref({ ...pref, goal_timeline: v })}
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Timeline" />
              </SelectTrigger>
              <SelectContent>
                {GOAL_TIMELINES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Career stage</Label>
            <Select
              value={pref.career_stage || ""}
              onValueChange={(v) => setPref({ ...pref, career_stage: v })}
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Where are you now" />
              </SelectTrigger>
              <SelectContent>
                {CAREER_STAGES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Target role</Label>
            <Input
              className="mt-1.5"
              value={pref.role}
              onChange={(e) => setPref({ ...pref, role: e.target.value })}
              placeholder="e.g. Product Manager, VA, Brand Designer"
            />
          </div>
          <div>
            <Label>Target industry</Label>
            <Select
              value={pref.target_industry || ""}
              onValueChange={(v) => setPref({ ...pref, target_industry: v })}
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Industry" />
              </SelectTrigger>
              <SelectContent>
                {INDUSTRIES.map((i) => (
                  <SelectItem key={i} value={i}>
                    {i}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Check-in frequency</Label>
            <Select
              value={pref.availability}
              onValueChange={(v) => setPref({ ...pref, availability: v })}
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AVAILABILITY.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-4">
          <Label>Preferred check-in days</Label>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {DAYS.map((d) => {
              const on = pref.checkin_days.includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDay(d)}
                  className={`px-3 py-1.5 rounded-full text-[12px] font-bold border transition-colors ${
                    on
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-foreground border-border hover:bg-muted"
                  }`}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </div>

        <Button
          onClick={findMatches}
          disabled={searching}
          className="mt-5 rounded-full bg-primary hover:bg-primary-dark text-primary-foreground h-11 px-6 text-sm font-semibold"
        >
          {searching ? "Finding…" : "Find Matches"}
        </Button>
      </div>

      {/* Results */}
      {matches.length > 0 && (
        <div>
          <div className="flex items-baseline justify-between mb-2 px-1">
            <h3 className="text-sm font-bold text-foreground">
              Your top {matches.length} match{matches.length === 1 ? "" : "es"} today
            </h3>
            <span className="text-[11px] text-muted-foreground">
              {poolSize >= 20
                ? `Filtered from ${poolSize} active members`
                : `From ${poolSize} active member${poolSize === 1 ? "" : "s"} • refreshes daily`}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {matches.map((m) => (
              <MatchCard
                key={m.user_id}
                m={m}
                alreadySent={sentTo.has(m.user_id)}
                onRequest={() => setRequestModal(m)}
              />
            ))}
          </div>
        </div>
      )}

      {matches.length === 0 && !searching && (
        <div className="bg-card border border-dashed border-border rounded-2xl py-12 text-center text-sm text-muted-foreground">
          Fill in your goal and stage above, then tap "Find Matches".
        </div>
      )}

      <Dialog open={!!requestModal} onOpenChange={(o) => !o && setRequestModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request {requestModal?.full_name || "partner"}</DialogTitle>
          </DialogHeader>
          {requestModal && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Avatar profile={requestModal} size={48} />
                <div>
                  <div className="text-sm font-bold">{requestModal.full_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {requestModal.job_title || "—"}
                  </div>
                </div>
              </div>
              <div>
                <Label>Optional message</Label>
                <Textarea
                  rows={4}
                  value={reqMessage}
                  onChange={(e) => setReqMessage(e.target.value)}
                  placeholder="Hi! I'd love to be accountability partners — I'm applying daily and want someone to check in with."
                  className="mt-1.5"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRequestModal(null)}>
              Cancel
            </Button>
            <Button
              onClick={sendRequest}
              className="rounded-full bg-primary hover:bg-primary-dark text-primary-foreground"
            >
              Send Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!demoRequestModal} onOpenChange={(o) => !o && setDemoRequestModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request {demoRequestModal?.full_name}</DialogTitle>
          </DialogHeader>
          {demoRequestModal && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Avatar profile={demoRequestModal} size={48} />
                <div>
                  <div className="text-sm font-bold">{demoRequestModal.full_name}</div>
                  <div className="text-xs text-muted-foreground">{demoRequestModal.job_title}</div>
                </div>
              </div>
              <div>
                <Label>Message</Label>
                <Textarea
                  rows={4}
                  value={demoReqMessage}
                  onChange={(e) => setDemoReqMessage(e.target.value)}
                  className="mt-1.5"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDemoRequestModal(null)}>Cancel</Button>
            <Button onClick={sendDemoRequest} className="rounded-full bg-primary hover:bg-primary-dark text-primary-foreground">
              Send Mock Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MockAccountabilitySandbox({
  requests,
  partner,
  onRequest,
  onAccept,
  onDecline,
  onReset,
}: {
  requests: DemoRequest[];
  partner: Match | null;
  onRequest: (m: Match) => void;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
  onReset: () => void;
}) {
  const incoming = requests.filter((r) => r.direction === "incoming" && r.status === "pending");
  const outgoing = requests.filter((r) => r.direction === "outgoing");

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap px-1">
        <div>
          <p className="text-[11px] uppercase tracking-wider font-bold text-primary">Mock system</p>
          <h2 className="text-lg font-serif text-foreground leading-tight">Request partners and test the dashboard</h2>
        </div>
        <Button variant="outline" size="sm" onClick={onReset} className="rounded-full text-[12px] font-bold">
          Reset mock data
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_0.7fr] gap-4">
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {DEMO_MATCHES.map((m) => {
              const requested = requests.some(
                (r) => r.direction === "outgoing" && r.user.user_id === m.user_id && r.status === "pending",
              );
              const connected = partner?.user_id === m.user_id;
              return (
                <MatchCard
                  key={m.user_id}
                  m={m}
                  alreadySent={requested || connected}
                  onRequest={() => onRequest(m)}
                />
              );
            })}
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-foreground">Mock requests</h3>
            <p className="text-[12px] text-muted-foreground mt-0.5">Accept one incoming request to unlock the live test dashboard.</p>
          </div>
          <div className="space-y-2">
            {incoming.map((r) => (
              <div key={r.id} className="border border-border rounded-xl p-3">
                <div className="flex items-center gap-2">
                  <Avatar profile={r.user} size={34} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-bold text-foreground truncate">{r.user.full_name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">Incoming · expires in 38h</p>
                  </div>
                </div>
                <p className="text-[12px] text-foreground/85 mt-2 line-clamp-2">“{r.message}”</p>
                <div className="flex gap-2 mt-3">
                  <Button variant="outline" size="sm" onClick={() => onDecline(r.id)} className="flex-1 rounded-full text-[12px]">
                    Decline
                  </Button>
                  <Button size="sm" onClick={() => onAccept(r.id)} className="flex-1 rounded-full bg-primary hover:bg-primary-dark text-primary-foreground text-[12px]">
                    Accept
                  </Button>
                </div>
              </div>
            ))}
            {incoming.length === 0 && (
              <div className="border border-dashed border-border rounded-xl p-4 text-center text-[12px] text-muted-foreground">
                No pending incoming mock requests.
              </div>
            )}
          </div>

          {outgoing.length > 0 && (
            <div className="pt-3 border-t border-border space-y-2">
              <p className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">Sent</p>
              {outgoing.slice(0, 3).map((r) => (
                <div key={r.id} className="flex items-center gap-2 text-[12px]">
                  <Avatar profile={r.user} size={28} />
                  <span className="font-semibold text-foreground flex-1 truncate">{r.user.full_name}</span>
                  <span className="capitalize text-muted-foreground">{r.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {partner ? (
        <MockPartnerDashboard partner={partner} />
      ) : (
        <div className="bg-card border border-dashed border-border rounded-2xl p-6 text-center text-sm text-muted-foreground">
          Accept a mock request or send one above to feel how the partnership dashboard works.
        </div>
      )}
    </section>
  );
}

function MockPartnerDashboard({ partner }: { partner: Match }) {
  const [subTab, setSubTab] = useState<"checkin" | "history" | "apps" | "chat" | "challenges" | "call">("checkin");
  const [todayDone, setTodayDone] = useState(false);
  const [appsToday, setAppsToday] = useState(2);
  const [reflection, setReflection] = useState("Tailored my CV and sent two outreach DMs.");
  const [messages, setMessages] = useState([
    { who: "partner", text: "Morning! I’m doing 4 applications before lunch." },
    { who: "me", text: "I’m in. I’ll do 3 and update here." },
  ]);
  const [body, setBody] = useState("");
  const [challenge, setChallenge] = useState({ me: 7, partner: 9 });
  const [callDay, setCallDay] = useState("Sun");
  const [callTime, setCallTime] = useState("19:00");

  const send = (text?: string) => {
    const value = (text ?? body).trim();
    if (!value) return;
    setMessages((rows) => [...rows, { who: "me", text: value }]);
    setBody("");
  };

  return (
    <div className="bg-card border border-primary/25 rounded-2xl p-4 sm:p-5 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">You</div>
          <span className="text-xl text-muted-foreground">+</span>
          <Avatar profile={partner} size={48} />
          <div>
            <p className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">Mock dashboard unlocked</p>
            <p className="text-sm font-bold text-foreground">You & {partner.full_name?.split(" ")[0]}</p>
          </div>
        </div>
        <div className="rounded-full bg-primary-tint text-primary px-3 py-1.5 text-[12px] font-bold inline-flex items-center gap-1.5">
          <Flame className="w-4 h-4" /> 12-day streak
        </div>
      </div>

      <div className="flex items-center gap-1 border-b border-border overflow-x-auto -mx-1 px-1">
        {([
          ["checkin", "Check-in", ClipboardList],
          ["history", "History", CalendarDays],
          ["apps", "Apps", Sparkles],
          ["chat", "Chat", MessageCircle],
          ["challenges", "Challenge", Trophy],
          ["call", "Call", Video],
        ] as const).map(([k, label, Icon]) => (
          <button key={k} onClick={() => setSubTab(k)} className={`relative inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-2 text-[12px] font-bold transition-colors ${subTab === k ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
            <Icon className="w-3.5 h-3.5" /> {label}
            {subTab === k && <span className="absolute left-2 right-2 -bottom-px h-[2px] bg-primary rounded-full" />}
          </button>
        ))}
      </div>

      {subTab === "checkin" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-border rounded-2xl p-4">
            <h3 className="text-sm font-bold text-foreground">Your check-in today</h3>
            <button onClick={() => setTodayDone((v) => !v)} className={`mt-3 w-full h-11 rounded-xl text-sm font-bold ${todayDone ? "bg-success/10 text-success border border-success/30" : "bg-primary text-primary-foreground"}`}>
              {todayDone ? "✓ Checked in" : "Mark today as done"}
            </button>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <Label className="text-[12px]">Apps today</Label>
                <Input type="number" min={0} value={appsToday} onChange={(e) => setAppsToday(Number(e.target.value || 0))} className="mt-1.5" />
              </div>
              <div className="bg-muted/40 rounded-xl p-3 text-center self-end">
                <p className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">Week</p>
                <p className="text-lg font-extrabold text-foreground">{11 + appsToday} apps</p>
              </div>
            </div>
            <Textarea rows={3} value={reflection} onChange={(e) => setReflection(e.target.value)} className="mt-3" />
          </div>
          <div className="border border-border rounded-2xl p-4">
            <h3 className="text-sm font-bold text-foreground">{partner.full_name?.split(" ")[0]}'s check-in</h3>
            <div className="mt-3 rounded-xl bg-success/10 text-success px-4 py-3 text-sm font-bold">✓ Done · 4 apps today</div>
            <p className="text-[13px] text-foreground/85 mt-3">“Sent applications to two fintech roles and followed up with one recruiter.”</p>
          </div>
        </div>
      )}

      {subTab === "history" && <MockHistory partner={partner} todayDone={todayDone} />}
      {subTab === "apps" && <MockApps appsToday={appsToday} partner={partner} />}
      {subTab === "chat" && (
        <div className="border border-border rounded-2xl p-4 space-y-3">
          {messages.map((m, i) => <div key={i} className={`flex ${m.who === "me" ? "justify-end" : "justify-start"}`}><div className={`max-w-[80%] px-3 py-2 rounded-2xl text-[13px] ${m.who === "me" ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted text-foreground rounded-bl-sm"}`}>{m.text}</div></div>)}
          <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border">
            {["I’m checking in now", "Can we do 3 more today?", "Done for today 🎉"].map((s) => <button key={s} onClick={() => send(s)} className="text-[11.5px] font-semibold px-2.5 py-1 rounded-full bg-muted hover:bg-muted/70 text-foreground">{s}</button>)}
          </div>
          <div className="flex gap-2"><Input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Type a mock message…" /><Button onClick={() => send()} className="rounded-full bg-primary hover:bg-primary-dark text-primary-foreground"><Send className="w-4 h-4" /></Button></div>
        </div>
      )}
      {subTab === "challenges" && (
        <div className="border border-border rounded-2xl p-4">
          <h3 className="text-sm font-bold text-foreground">15 applications in 7 days</h3>
          <p className="text-[12px] text-muted-foreground mt-1">Click log progress and watch your score move.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            <div className="bg-muted/40 rounded-xl p-3"><ProgressBar label="You" value={(challenge.me / 15) * 100} count={`${challenge.me}/15`} mine /></div>
            <div className="bg-muted/40 rounded-xl p-3"><ProgressBar label={partner.full_name?.split(" ")[0] || "Partner"} value={(challenge.partner / 15) * 100} count={`${challenge.partner}/15`} /></div>
          </div>
          <Button onClick={() => setChallenge((c) => ({ ...c, me: Math.min(15, c.me + 1) }))} className="mt-4 rounded-full bg-primary hover:bg-primary-dark text-primary-foreground">+ Log progress</Button>
        </div>
      )}
      {subTab === "call" && (
        <div className="border border-border rounded-2xl p-4">
          <h3 className="text-sm font-bold text-foreground">Weekly sync</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            <Select value={callDay} onValueChange={setCallDay}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{DAYS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select>
            <Input type="time" value={callTime} onChange={(e) => setCallTime(e.target.value)} />
          </div>
          <p className="text-[12px] text-muted-foreground mt-3">Mock call scheduled for {callDay} at {callTime} WAT.</p>
          <Button className="mt-3 rounded-full bg-primary hover:bg-primary-dark text-primary-foreground"><Video className="w-4 h-4 mr-1" /> Join mock call</Button>
        </div>
      )}
    </div>
  );
}

function MockHistory({ partner, todayDone }: { partner: Match; todayDone: boolean }) {
  const week = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const rows = [
    { name: "You", days: [true, true, true, todayDone, false, false, false] },
    { name: partner.full_name?.split(" ")[0] || "Partner", days: [true, true, true, true, false, false, false] },
  ];
  return <div className="border border-border rounded-2xl p-4 space-y-3">{rows.map((row) => <div key={row.name}><p className="text-[12px] font-bold text-foreground mb-1.5">{row.name}</p><div className="grid grid-cols-7 gap-1.5">{row.days.map((done, i) => <div key={week[i]} className="text-center"><div className={`h-9 rounded-lg flex items-center justify-center text-[11px] font-bold ${done ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>{done ? "✓" : "·"}</div><p className="text-[9.5px] uppercase tracking-wider text-muted-foreground mt-1">{week[i]}</p></div>)}</div></div>)}</div>;
}

function MockApps({ appsToday, partner }: { appsToday: number; partner: Match }) {
  const mine = Array.from({ length: Math.max(appsToday, 1) }).map((_, i) => ({ id: i, job_title: ["Remote Operations Associate", "Product Assistant", "Customer Success Analyst", "Junior PM"][i % 4], company: ["Moniepoint", "Paystack", "Flutterwave", "Andela"][i % 4] }));
  const theirs = ["Growth PM", "Product Analyst", "Fintech PM", "Associate PM"].map((job_title, i) => ({ id: i, job_title, company: ["LemFi", "PiggyVest", "Kuda", "M-KOPA"][i] }));
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><AppList title="Your mock applications today" rows={mine} /><AppList title={`${partner.full_name?.split(" ")[0]}'s applications today`} rows={theirs} /></div>;
}

function MatchCard({
  m,
  alreadySent,
  onRequest,
}: {
  m: Match;
  alreadySent: boolean;
  onRequest: () => void;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4 hover:border-primary/40 transition-colors flex flex-col">
      <div className="flex items-start gap-3">
        <Avatar profile={m} size={48} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-foreground truncate">
              {m.full_name || "Member"}
            </h3>
            <span className="text-[10.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary-tint text-primary">
              {m.match_score}% match
            </span>
          </div>
          <p className="text-[12px] text-muted-foreground truncate">
            {m.job_title || "—"}
          </p>
          <p className="text-[11.5px] text-muted-foreground truncate">
            {m.city || m.location || ""}
          </p>
        </div>
      </div>
      {m.reasons && m.reasons.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {m.reasons.slice(0, 3).map((r) => (
            <span
              key={r}
              className="text-[10.5px] font-medium px-2 py-0.5 rounded-full bg-muted text-foreground/80"
            >
              ✓ {r}
            </span>
          ))}
        </div>
      )}
      <div className="grid grid-cols-3 gap-2 mt-3 text-center">
        <Stat label="This wk" value={`${m.weekly_apps}`} />
        <Stat label="Streak" value={`${m.streak}d`} />
        <Stat
          label="Status"
          value={m.active_today ? "Today" : "Yesterday"}
          tone={m.active_today ? "good" : "muted"}
        />
      </div>
      <div className="flex gap-2 mt-4">
        <Button
          variant="outline"
          className="flex-1 h-9 rounded-full text-[12px] font-bold"
        >
          View
        </Button>
        <Button
          disabled={alreadySent}
          onClick={onRequest}
          className="flex-1 h-9 rounded-full bg-primary hover:bg-primary-dark text-primary-foreground text-[12px] font-bold disabled:opacity-50"
        >
          {alreadySent ? "Sent" : "Request"}
        </Button>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "muted",
}: {
  label: string;
  value: string;
  tone?: "good" | "muted";
}) {
  return (
    <div className="bg-muted/40 rounded-lg py-1.5">
      <div
        className={`text-[12px] font-bold ${
          tone === "good" ? "text-success" : "text-foreground"
        }`}
      >
        {value}
      </div>
      <div className="text-[9.5px] uppercase tracking-wider text-muted-foreground font-semibold">
        {label}
      </div>
    </div>
  );
}

function Avatar({
  profile,
  size = 40,
}: {
  profile: ProfileLite;
  size?: number;
}) {
  const initial = (profile.full_name || "?").charAt(0).toUpperCase();
  if (profile.avatar_url) {
    return (
      <img
        src={profile.avatar_url}
        alt={profile.full_name || ""}
        className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="rounded-full bg-primary-tint text-primary font-bold flex items-center justify-center shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initial}
    </div>
  );
}

/* ───────── REQUESTS TAB ───────── */
function RequestsTab({
  uid,
  onAccepted,
}: {
  uid: string;
  onAccepted: (p: Partnership) => void;
}) {
  const { toast } = useToast();
  const [incoming, setIncoming] = useState<any[]>([]);
  const [outgoing, setOutgoing] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Map<string, ProfileLite>>(new Map());
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    (async () => {
      const { data: incData } = await supabase
        .from("accountability_requests" as any)
        .select("*")
        .eq("to_user_id", uid)
        .eq("status", "pending")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });
      const { data: outData } = await supabase
        .from("accountability_requests" as any)
        .select("*")
        .eq("from_user_id", uid)
        .order("created_at", { ascending: false });
      const inc = (incData as any[]) || [];
      const out = (outData as any[]) || [];
      setIncoming(inc);
      setOutgoing(out);
      const ids = Array.from(
        new Set([...inc.map((r) => r.from_user_id), ...out.map((r) => r.to_user_id)]),
      );
      if (ids.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url, job_title, city, location")
          .in("user_id", ids);
        setProfiles(
          new Map(((profs as any[]) || []).map((p) => [p.user_id, p])),
        );
      }
    })();
  }, [uid, refresh]);

  const accept = async (req: any) => {
    const a = uid < req.from_user_id ? uid : req.from_user_id;
    const b = uid < req.from_user_id ? req.from_user_id : uid;
    const { data: p, error } = await supabase
      .from("accountability_partnerships" as any)
      .insert({ user_a: a, user_b: b })
      .select()
      .single();
    if (error) {
      toast({ title: "Could not accept", description: error.message, variant: "destructive" });
      return;
    }
    await supabase
      .from("accountability_requests" as any)
      .update({ status: "accepted" })
      .eq("id", req.id);
    // Mark both not searching
    await supabase
      .from("accountability_prefs" as any)
      .update({ is_searching: false })
      .in("user_id", [a, b]);
    toast({ title: "You're partners 🎉" });
    onAccepted(p as any);
  };

  const decline = async (req: any) => {
    await supabase
      .from("accountability_requests" as any)
      .update({ status: "declined" })
      .eq("id", req.id);
    setRefresh((x) => x + 1);
  };

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-sm font-bold text-foreground mb-3">
          Incoming ({incoming.length})
        </h2>
        {incoming.length === 0 && (
          <div className="bg-card border border-dashed border-border rounded-2xl py-8 text-center text-sm text-muted-foreground">
            No incoming requests right now.
          </div>
        )}
        <div className="space-y-2">
          {incoming.map((r) => {
            const p = profiles.get(r.from_user_id);
            const hoursLeft = Math.max(
              0,
              Math.round(
                (new Date(r.expires_at).getTime() - Date.now()) / 3600000,
              ),
            );
            return (
              <div
                key={r.id}
                className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3"
              >
                {p && <Avatar profile={p} />}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold truncate">
                    {p?.full_name || "Member"}
                  </div>
                  <div className="text-[12px] text-muted-foreground truncate">
                    {p?.job_title || "—"} · expires in {hoursLeft}h
                  </div>
                  {r.message && (
                    <p className="text-[12.5px] text-foreground mt-1.5 line-clamp-2">
                      "{r.message}"
                    </p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={() => decline(r)}
                >
                  <X className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  className="rounded-full bg-primary hover:bg-primary-dark text-primary-foreground"
                  onClick={() => accept(r)}
                >
                  <Check className="w-4 h-4 mr-1" /> Accept
                </Button>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-bold text-foreground mb-3">
          Sent ({outgoing.length})
        </h2>
        {outgoing.length === 0 && (
          <div className="bg-card border border-dashed border-border rounded-2xl py-8 text-center text-sm text-muted-foreground">
            You haven't sent any requests.
          </div>
        )}
        <div className="space-y-2">
          {outgoing.map((r) => {
            const p = profiles.get(r.to_user_id);
            return (
              <div
                key={r.id}
                className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3"
              >
                {p && <Avatar profile={p} />}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold truncate">
                    {p?.full_name || "Member"}
                  </div>
                  <div className="text-[12px] text-muted-foreground">
                    {r.status}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

/* ───────── DASHBOARD TAB ───────── */
function DashboardTab({
  uid,
  partnership,
  onEnded,
}: {
  uid: string;
  partnership: Partnership;
  onEnded: () => void;
}) {
  const { toast } = useToast();
  const partnerId = partnership.user_a === uid ? partnership.user_b : partnership.user_a;
  const [me, setMe] = useState<ProfileLite | null>(null);
  const [partner, setPartner] = useState<ProfileLite | null>(null);
  const [subTab, setSubTab] = useState<"checkin" | "history" | "apps" | "chat" | "challenges" | "call">(
    "checkin",
  );

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, job_title, city, location")
        .in("user_id", [uid, partnerId]);
      const map = new Map(((data as any[]) || []).map((p) => [p.user_id, p]));
      setMe(map.get(uid) || null);
      setPartner(map.get(partnerId) || null);
    })();
  }, [uid, partnerId]);

  const endPartnership = async () => {
    if (!confirm("End this partnership? This cannot be undone.")) return;
    await supabase
      .from("accountability_partnerships" as any)
      .update({ status: "ended" })
      .eq("id", partnership.id);
    toast({ title: "Partnership ended" });
    onEnded();
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-card border border-border rounded-2xl p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 sm:gap-5">
            {me && <Avatar profile={me} size={56} />}
            <div className="text-3xl text-muted-foreground font-light">+</div>
            {partner && <Avatar profile={partner} size={56} />}
            <div className="ml-2">
              <p className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">
                You're accountability partners
              </p>
              <p className="text-base font-bold text-foreground">
                {me?.full_name?.split(" ")[0]} & {partner?.full_name?.split(" ")[0]}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-amber-50 text-amber-700 rounded-full px-3 py-1.5 text-sm font-bold inline-flex items-center gap-1.5">
              <Flame className="w-4 h-4 fill-amber-500 text-amber-500" />
              {partnership.streak}-day streak
            </div>
            <Button
              variant="outline"
              size="sm"
              className="rounded-full text-destructive border-destructive/40 hover:bg-destructive/10"
              onClick={endPartnership}
            >
              End
            </Button>
          </div>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex items-center gap-1 border-b border-border overflow-x-auto -mx-1 px-1">
        {([
          ["checkin", "Today's check-in", ClipboardList],
          ["history", "History", CalendarDays],
          ["apps", "Applications", Sparkles],
          ["chat", "Chat", MessageCircle],
          ["challenges", "Challenges", Trophy],
          ["call", "Weekly call", Video],
        ] as const).map(([k, label, Icon]) => {
          const active = subTab === k;
          return (
            <button
              key={k}
              onClick={() => setSubTab(k)}
              className={`relative inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-2 text-[12px] font-bold transition-colors ${
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
              {active && (
                <span className="absolute left-2 right-2 -bottom-px h-[2px] bg-primary rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {subTab === "checkin" && (
        <CheckinPanel uid={uid} partnership={partnership} partnerId={partnerId} />
      )}
      {subTab === "history" && (
        <HistoryPanel uid={uid} partnership={partnership} partnerId={partnerId} />
      )}
      {subTab === "apps" && <AppsPanel uid={uid} partnerId={partnerId} />}
      {subTab === "chat" && <ChatPanel uid={uid} partnership={partnership} />}
      {subTab === "challenges" && (
        <ChallengesPanel uid={uid} partnership={partnership} />
      )}
      {subTab === "call" && <CallPanel partnership={partnership} />}
    </div>
  );
}

/* ───────── Check-in ───────── */
function CheckinPanel({
  uid,
  partnership,
  partnerId,
}: {
  uid: string;
  partnership: Partnership;
  partnerId: string;
}) {
  const { toast } = useToast();
  const today = new Date().toISOString().slice(0, 10);
  const [applied, setApplied] = useState<boolean | null>(null);
  const [reflection, setReflection] = useState("");
  const [todayApps, setTodayApps] = useState(0);
  const [partnerCheckin, setPartnerCheckin] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [existing, setExisting] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const { data: mine } = await supabase
        .from("accountability_checkins" as any)
        .select("*")
        .eq("partnership_id", partnership.id)
        .eq("user_id", uid)
        .eq("checkin_date", today)
        .maybeSingle();
      if (mine) {
        const m = mine as any;
        setExisting(m);
        setApplied(m.applied);
        setReflection(m.reflection || "");
      }
      const { data: theirs } = await supabase
        .from("accountability_checkins" as any)
        .select("*")
        .eq("partnership_id", partnership.id)
        .eq("user_id", partnerId)
        .eq("checkin_date", today)
        .maybeSingle();
      setPartnerCheckin(theirs);

      // count today's applications from my "applications" table
      const { count } = await supabase
        .from("applications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", uid)
        .gte("applied_date", today + "T00:00:00")
        .lte("applied_date", today + "T23:59:59");
      setTodayApps(count || 0);
    })();
  }, [uid, partnership.id, partnerId, today]);

  const save = async () => {
    if (applied === null) return;
    setSaving(true);
    const payload = {
      partnership_id: partnership.id,
      user_id: uid,
      checkin_date: today,
      applied,
      applications_count: applied ? todayApps : 0,
      reflection: reflection || null,
    };
    const { error } = await supabase
      .from("accountability_checkins" as any)
      .upsert(payload, { onConflict: "partnership_id,user_id,checkin_date" });
    setSaving(false);
    if (error) {
      toast({ title: "Could not save", description: error.message, variant: "destructive" });
      return;
    }
    // bump streak/last_activity
    await supabase
      .from("accountability_partnerships" as any)
      .update({
        last_activity_at: new Date().toISOString(),
        streak: applied ? (partnership.streak || 0) + (existing ? 0 : 1) : partnership.streak,
      })
      .eq("id", partnership.id);
    toast({ title: "Check-in saved ✓" });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="bg-card border border-border rounded-2xl p-5">
        <h3 className="text-base font-bold text-foreground">Today's check-in</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Did you apply to any jobs today?
        </p>
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setApplied(true)}
            className={`flex-1 px-4 py-3 rounded-xl border-2 text-sm font-bold transition-colors ${
              applied === true
                ? "border-success bg-success/10 text-success"
                : "border-border bg-card text-foreground hover:bg-muted"
            }`}
          >
            Yes, I applied
          </button>
          <button
            onClick={() => setApplied(false)}
            className={`flex-1 px-4 py-3 rounded-xl border-2 text-sm font-bold transition-colors ${
              applied === false
                ? "border-destructive bg-destructive/10 text-destructive"
                : "border-border bg-card text-foreground hover:bg-muted"
            }`}
          >
            No, not today
          </button>
        </div>

        {applied && (
          <div className="mt-4 p-3 rounded-xl bg-primary-tint">
            <p className="text-[12px] font-bold text-primary uppercase tracking-wider">
              Pulled from My Applications
            </p>
            <p className="text-2xl font-bold text-foreground mt-0.5">
              {todayApps} {todayApps === 1 ? "application" : "applications"} today
            </p>
          </div>
        )}

        <div className="mt-4">
          <Label>Reflection (optional)</Label>
          <Textarea
            rows={3}
            className="mt-1.5"
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            placeholder="What worked? What blocked you?"
          />
        </div>

        <Button
          disabled={applied === null || saving}
          onClick={save}
          className="mt-4 rounded-full bg-primary hover:bg-primary-dark text-primary-foreground h-10 px-5 text-sm font-semibold w-full sm:w-auto"
        >
          {saving ? "Saving…" : existing ? "Update check-in" : "Save check-in"}
        </Button>
      </div>

      <div className="bg-card border border-border rounded-2xl p-5">
        <h3 className="text-base font-bold text-foreground">
          Partner's check-in today
        </h3>
        {partnerCheckin ? (
          <div className="mt-3 space-y-3">
            <div
              className={`px-4 py-3 rounded-xl text-sm font-bold ${
                partnerCheckin.applied
                  ? "bg-success/10 text-success"
                  : "bg-destructive/10 text-destructive"
              }`}
            >
              {partnerCheckin.applied
                ? `✓ Applied to ${partnerCheckin.applications_count} jobs today`
                : "✗ Did not apply today"}
            </div>
            {partnerCheckin.reflection && (
              <div className="bg-muted/40 rounded-xl p-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Reflection
                </p>
                <p className="text-[13.5px] text-foreground mt-1">
                  {partnerCheckin.reflection}
                </p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground mt-3">
            Your partner hasn't checked in yet today.
          </p>
        )}
      </div>
    </div>
  );
}

/* ───────── History ───────── */
function HistoryPanel({
  uid,
  partnership,
  partnerId,
}: {
  uid: string;
  partnership: Partnership;
  partnerId: string;
}) {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("accountability_checkins" as any)
        .select("*")
        .eq("partnership_id", partnership.id)
        .order("checkin_date", { ascending: false })
        .limit(30);
      setRows((data as any[]) || []);
    })();
  }, [partnership.id]);

  // Group by date
  const grouped = useMemo(() => {
    const m = new Map<string, { mine?: any; theirs?: any }>();
    rows.forEach((r) => {
      const e = m.get(r.checkin_date) || {};
      if (r.user_id === uid) e.mine = r;
      else e.theirs = r;
      m.set(r.checkin_date, e);
    });
    return Array.from(m.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [rows, uid]);

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="text-left px-4 py-3">Date</th>
            <th className="text-center px-4 py-3">You</th>
            <th className="text-center px-4 py-3">Partner</th>
            <th className="text-right px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {grouped.length === 0 && (
            <tr>
              <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                No check-ins yet.
              </td>
            </tr>
          )}
          {grouped.map(([date, { mine, theirs }]) => (
            <tr key={date} className="border-t border-border">
              <td className="px-4 py-3 font-semibold text-foreground">{date}</td>
              <td className="px-4 py-3 text-center">
                {mine ? `${mine.applications_count} apps` : "—"}
              </td>
              <td className="px-4 py-3 text-center">
                {theirs ? `${theirs.applications_count} apps` : "—"}
              </td>
              <td className="px-4 py-3 text-right">
                {mine && theirs ? (
                  <span className="text-success font-bold text-xs">Both checked in</span>
                ) : mine || theirs ? (
                  <span className="text-amber-600 font-bold text-xs">1 checked in</span>
                ) : (
                  <span className="text-destructive font-bold text-xs">Missed</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ───────── Apps panel ───────── */
function AppsPanel({ uid, partnerId }: { uid: string; partnerId: string }) {
  const today = new Date().toISOString().slice(0, 10);
  const [mine, setMine] = useState<any[]>([]);
  const [theirs, setTheirs] = useState<any[]>([]);
  useEffect(() => {
    (async () => {
      const { data: a } = await supabase
        .from("applications")
        .select("id, job_title, company, applied_date")
        .eq("user_id", uid)
        .gte("applied_date", today + "T00:00:00")
        .lte("applied_date", today + "T23:59:59")
        .order("applied_date", { ascending: false });
      setMine((a as any[]) || []);
      const { data: b } = await supabase
        .from("applications")
        .select("id, job_title, company, applied_date")
        .eq("user_id", partnerId)
        .gte("applied_date", today + "T00:00:00")
        .lte("applied_date", today + "T23:59:59")
        .order("applied_date", { ascending: false });
      setTheirs((b as any[]) || []);
    })();
  }, [uid, partnerId, today]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <AppList title="Your applications today" rows={mine} />
      <AppList title="Partner's applications today" rows={theirs} />
    </div>
  );
}

function AppList({ title, rows }: { title: string; rows: any[] }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <h3 className="text-sm font-bold text-foreground mb-3">{title}</h3>
      {rows.length === 0 && (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No applications yet today.
        </p>
      )}
      <div className="space-y-2">
        {rows.map((r) => (
          <div
            key={r.id}
            className="flex items-center justify-between gap-3 border border-border rounded-xl p-3"
          >
            <div className="min-w-0">
              <p className="text-sm font-bold text-foreground truncate">
                {r.job_title}
              </p>
              <p className="text-[12px] text-muted-foreground truncate">
                {r.company}
              </p>
            </div>
            <span className="text-[11px] text-muted-foreground shrink-0">
              {r.applied_date
                ? new Date(r.applied_date).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ───────── Chat ───────── */
const CHAT_SUGGESTIONS = [
  "I applied to 5 jobs today 💪",
  "Did you check in?",
  "Let's both apply to 3 more before end of day",
];

function ChatPanel({
  uid,
  partnership,
}: {
  uid: string;
  partnership: Partnership;
}) {
  const [messages, setMessages] = useState<any[]>([]);
  const [body, setBody] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("accountability_messages" as any)
        .select("*")
        .eq("partnership_id", partnership.id)
        .order("created_at", { ascending: true })
        .limit(200);
      setMessages((data as any[]) || []);
      setTimeout(() => scrollRef.current?.scrollTo(0, 99999), 50);
    })();

    const ch = supabase
      .channel(`acc-msg-${partnership.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "accountability_messages",
          filter: `partnership_id=eq.${partnership.id}`,
        },
        (payload) => {
          setMessages((m) => [...m, payload.new]);
          setTimeout(() => scrollRef.current?.scrollTo(0, 99999), 50);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [partnership.id]);

  const send = async (text?: string) => {
    const txt = (text ?? body).trim();
    if (!txt) return;
    setBody("");
    await supabase
      .from("accountability_messages" as any)
      .insert({ partnership_id: partnership.id, user_id: uid, body: txt });
  };

  return (
    <div className="bg-card border border-border rounded-2xl flex flex-col h-[560px]">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            Say hi to your partner 👋
          </p>
        )}
        {messages.map((m) => {
          const mine = m.user_id === uid;
          return (
            <div
              key={m.id}
              className={`flex ${mine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] px-3.5 py-2 rounded-2xl text-sm ${
                  mine
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-muted text-foreground rounded-bl-md"
                }`}
              >
                <p className="whitespace-pre-wrap">{m.body}</p>
                <p
                  className={`text-[10px] mt-1 ${
                    mine ? "text-primary-foreground/70" : "text-muted-foreground"
                  }`}
                >
                  {new Date(m.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="border-t border-border p-3 space-y-2">
        <div className="flex flex-wrap gap-1.5">
          {CHAT_SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="text-[11.5px] font-semibold px-2.5 py-1 rounded-full bg-muted hover:bg-muted/70 text-foreground"
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Type a message…"
          />
          <Button
            onClick={() => send()}
            className="rounded-full bg-primary hover:bg-primary-dark text-primary-foreground"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ───────── Partner challenges ───────── */
function ChallengesPanel({
  uid,
  partnership,
}: {
  uid: string;
  partnership: Partnership;
}) {
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    duration_days: 7,
    daily_target: 3,
  });
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("accountability_partner_challenges" as any)
        .select("*")
        .eq("partnership_id", partnership.id)
        .order("created_at", { ascending: false });
      setItems((data as any[]) || []);
    })();
  }, [partnership.id, refresh]);

  const create = async () => {
    if (!form.title.trim()) return;
    const { error } = await supabase
      .from("accountability_partner_challenges" as any)
      .insert({
        partnership_id: partnership.id,
        title: form.title,
        description: form.description || null,
        duration_days: form.duration_days,
        daily_target: form.daily_target,
      });
    if (error) {
      toast({ title: "Could not create", description: error.message, variant: "destructive" });
      return;
    }
    setOpen(false);
    setForm({ title: "", description: "", duration_days: 7, daily_target: 3 });
    setRefresh((x) => x + 1);
    toast({ title: "Challenge created 🎯" });
  };

  const logProgress = async (c: any) => {
    const isA = partnership.user_a === uid;
    const field = isA ? "user_a_progress" : "user_b_progress";
    const { error } = await supabase
      .from("accountability_partner_challenges" as any)
      .update({ [field]: (isA ? c.user_a_progress : c.user_b_progress) + 1 })
      .eq("id", c.id);
    if (!error) setRefresh((x) => x + 1);
  };

  return (
    <div className="space-y-4">
      <div className="bg-primary-tint border border-primary/20 rounded-2xl p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-base font-bold text-foreground">
              Tackle challenges together
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5 max-w-xl">
              Set a shared goal — like "10 applications a day for 7 days." Both partners log progress; whoever hits 100% first wins bragging rights and a streak boost.
            </p>
          </div>
          <Button
            onClick={() => setOpen(true)}
            className="rounded-full bg-primary hover:bg-primary-dark text-primary-foreground"
          >
            <Plus className="w-4 h-4 mr-1" /> New challenge
          </Button>
        </div>
      </div>

      {items.length === 0 && (
        <div className="bg-card border border-dashed border-border rounded-2xl py-12 text-center text-sm text-muted-foreground">
          No partner challenges yet.
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {items.map((c) => {
          const isA = partnership.user_a === uid;
          const myP = isA ? c.user_a_progress : c.user_b_progress;
          const theirP = isA ? c.user_b_progress : c.user_a_progress;
          const total = c.duration_days * c.daily_target;
          const myPct = Math.min(100, Math.round((myP / total) * 100));
          const theirPct = Math.min(100, Math.round((theirP / total) * 100));
          return (
            <div key={c.id} className="bg-card border border-border rounded-2xl p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-sm font-bold text-foreground">{c.title}</h4>
                  {c.description && (
                    <p className="text-[12px] text-muted-foreground mt-0.5">
                      {c.description}
                    </p>
                  )}
                </div>
                <span className="text-[10.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">
                  {c.duration_days}d · {c.daily_target}/day
                </span>
              </div>
              <div className="mt-3 space-y-2">
                <ProgressBar label="You" value={myPct} count={`${myP}/${total}`} mine />
                <ProgressBar label="Partner" value={theirPct} count={`${theirP}/${total}`} />
              </div>
              <Button
                size="sm"
                onClick={() => logProgress(c)}
                className="mt-3 rounded-full bg-primary hover:bg-primary-dark text-primary-foreground w-full"
              >
                + Log progress
              </Button>
            </div>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New partner challenge</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. 10 applications a day"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Textarea
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="mt-1.5"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Duration (days)</Label>
                <Input
                  type="number"
                  value={form.duration_days}
                  onChange={(e) =>
                    setForm({ ...form, duration_days: parseInt(e.target.value) || 1 })
                  }
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Daily target</Label>
                <Input
                  type="number"
                  value={form.daily_target}
                  onChange={(e) =>
                    setForm({ ...form, daily_target: parseInt(e.target.value) || 1 })
                  }
                  className="mt-1.5"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={create}
              className="rounded-full bg-primary hover:bg-primary-dark text-primary-foreground"
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProgressBar({
  label,
  value,
  count,
  mine,
}: {
  label: string;
  value: number;
  count: string;
  mine?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground">
        <span>{label}</span>
        <span>{count}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden mt-1">
        <div
          className={`h-full rounded-full ${mine ? "bg-primary" : "bg-secondary"}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

/* ───────── Weekly call ───────── */
function CallPanel({ partnership }: { partnership: Partnership }) {
  const { toast } = useToast();
  const [day, setDay] = useState(partnership.weekly_call_day || "Sun");
  const [time, setTime] = useState(partnership.weekly_call_time || "18:00");

  const meetUrl = `https://meet.jit.si/${partnership.jitsi_room}`;

  // next call date
  const nextDate = useMemo(() => {
    const map: Record<string, number> = {
      Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
    };
    const target = map[day] ?? 0;
    const now = new Date();
    const diff = (target - now.getDay() + 7) % 7 || 7;
    const d = new Date(now);
    d.setDate(now.getDate() + diff);
    const [h, m] = time.split(":");
    d.setHours(parseInt(h), parseInt(m), 0, 0);
    return d;
  }, [day, time]);

  const save = async () => {
    await supabase
      .from("accountability_partnerships" as any)
      .update({ weekly_call_day: day, weekly_call_time: time })
      .eq("id", partnership.id);
    toast({ title: "Schedule updated" });
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-5 sm:p-6">
      <div className="flex items-start gap-4 flex-wrap">
        <div className="w-14 h-14 rounded-2xl bg-primary-tint flex items-center justify-center shrink-0">
          <Video className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1 min-w-[260px]">
          <h3 className="text-lg font-bold text-foreground">Weekly call</h3>
          <p className="text-sm text-muted-foreground">
            Your private meeting room — works on any device, no sign-in needed.
          </p>
          <div className="mt-3 text-sm">
            <p className="font-semibold text-foreground">
              Next: {nextDate.toLocaleDateString(undefined, {
                weekday: "long",
                month: "short",
                day: "numeric",
              })}{" "}
              at{" "}
              {nextDate.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
            <p className="text-xs text-muted-foreground mt-1 break-all">{meetUrl}</p>
          </div>
        </div>
        <Button
          asChild
          className="rounded-full bg-primary hover:bg-primary-dark text-primary-foreground h-11 px-5"
        >
          <a href={meetUrl} target="_blank" rel="noopener">
            <Video className="w-4 h-4 mr-1.5" /> Join Call
          </a>
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5 pt-5 border-t border-border">
        <div>
          <Label>Day</Label>
          <Select value={day} onValueChange={setDay}>
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DAYS.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Time</Label>
          <Input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="mt-1.5"
          />
        </div>
      </div>
      <Button
        onClick={save}
        variant="outline"
        className="mt-3 rounded-full"
      >
        Reschedule
      </Button>
    </div>
  );
}

/* ───────── Demo data + preview modal ───────── */
const DEMO_MATCHES: Match[] = [
  {
    user_id: "demo-1",
    full_name: "Adaeze Okafor",
    avatar_url: null,
    job_title: "Junior Product Manager → Senior PM",
    city: "Lagos, NG",
    location: "Lagos, NG",
    pref: {
      goal: "Land a senior PM role in 90 days",
      role: "Product Manager",
      experience_level: "Junior (1–3 yrs)",
      availability: "Evenings",
      checkin_days: ["Mon", "Wed", "Fri"],
      is_searching: true,
      goal_type: "land_role",
      goal_timeline: "90_days",
      career_stage: "Junior (1–3 yrs)",
      target_industry: "Tech / Software",
    },
    match_score: 94,
    weekly_apps: 11,
    streak: 12,
    active_today: true,
    reasons: ["Same goal", "Same timeline", "Same target role"],
  },
  {
    user_id: "demo-2",
    full_name: "Chiamaka Nwosu",
    avatar_url: null,
    job_title: "Marketing Lead → Head of Growth",
    city: "Abuja, NG",
    location: "Abuja, NG",
    pref: {
      goal: "Switch to Head of Growth in 6 months",
      role: "Growth / Marketing",
      experience_level: "Mid (3–6 yrs)",
      availability: "Mornings",
      checkin_days: ["Tue", "Thu"],
      is_searching: true,
      goal_type: "switch_role",
      goal_timeline: "6_months",
      career_stage: "Mid (3–6 yrs)",
      target_industry: "Tech / Software",
    },
    match_score: 81,
    weekly_apps: 6,
    streak: 5,
    active_today: true,
    reasons: ["Same career stage", "Same industry"],
  },
  {
    user_id: "demo-3",
    full_name: "Funmi Adebayo",
    avatar_url: null,
    job_title: "Data Analyst → Remote Data Scientist",
    city: "Ibadan, NG",
    location: "Ibadan, NG",
    pref: {
      goal: "Land a remote data role in 90 days",
      role: "Data / Analytics",
      experience_level: "Junior (1–3 yrs)",
      availability: "Weekends",
      checkin_days: ["Mon", "Wed", "Fri"],
      is_searching: true,
      goal_type: "land_role",
      goal_timeline: "90_days",
      career_stage: "Junior (1–3 yrs)",
      target_industry: "Tech / Software",
    },
    match_score: 76,
    weekly_apps: 9,
    streak: 8,
    active_today: false,
    reasons: ["Same goal", "Same timeline", "Same career stage"],
  },
];

const DEMO_REQUESTS: DemoRequest[] = [
  {
    id: "demo-incoming-1",
    user: DEMO_MATCHES[0],
    direction: "incoming",
    message: "Your goal and timeline look close to mine. Want to do daily check-ins this week?",
    status: "pending",
    created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    expires_at: new Date(Date.now() + 38 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "demo-incoming-2",
    user: DEMO_MATCHES[2],
    direction: "incoming",
    message: "I’m trying to stay consistent with remote applications. We can push each other.",
    status: "pending",
    created_at: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString(),
    expires_at: new Date(Date.now() + 31 * 60 * 60 * 1000).toISOString(),
  },
];

function DemoDashboardPreview({ open, onClose }: { open: boolean; onClose: () => void }) {
  const partner = DEMO_MATCHES[0];
  const [subTab, setSubTab] = useState<"checkin" | "history" | "chat" | "challenges" | "call">(
    "checkin",
  );
  const [todayDone, setTodayDone] = useState(false);
  const [reflection, setReflection] = useState("");
  const [appsToday, setAppsToday] = useState(0);

  const week = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const myWeek = [true, true, true, false, false, false, false];
  const partnerWeek = [true, true, true, true, false, false, false];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="inline-flex items-center gap-2">
            Demo partnership
            <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-secondary-tint text-secondary">
              Preview
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* Header */}
        <div className="bg-card border border-border rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-base">
                Y
              </div>
              <div className="text-2xl text-muted-foreground font-light">+</div>
              <div className="w-12 h-12 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center font-bold text-base">
                {partner.full_name?.charAt(0)}
              </div>
              <div className="ml-1">
                <p className="text-[10.5px] uppercase tracking-wider font-bold text-muted-foreground">
                  Accountability partners
                </p>
                <p className="text-[14px] font-bold text-foreground">
                  You & {partner.full_name?.split(" ")[0]}
                </p>
              </div>
            </div>
            <div className="bg-amber-50 text-amber-700 rounded-full px-3 py-1.5 text-[12.5px] font-bold inline-flex items-center gap-1.5">
              <Flame className="w-4 h-4 fill-amber-500 text-amber-500" />
              12-day streak
            </div>
          </div>
        </div>

        {/* Sub-tabs */}
        <div className="flex items-center gap-1 border-b border-border overflow-x-auto -mx-1 px-1">
          {([
            ["checkin", "Today's check-in", ClipboardList],
            ["history", "History", CalendarDays],
            ["chat", "Chat", MessageCircle],
            ["challenges", "Challenges", Trophy],
            ["call", "Weekly call", Video],
          ] as const).map(([k, label, Icon]) => {
            const active = subTab === k;
            return (
              <button
                key={k}
                onClick={() => setSubTab(k)}
                className={`relative inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-2 text-[12px] font-bold transition-colors ${
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
                {active && (
                  <span className="absolute left-2 right-2 -bottom-px h-[2px] bg-primary rounded-full" />
                )}
              </button>
            );
          })}
        </div>

        {subTab === "checkin" && (
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-2xl p-5">
              <p className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground mb-2">
                Your check-in · today
              </p>
              <button
                onClick={() => setTodayDone((v) => !v)}
                className={`w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl text-[13px] font-bold transition-colors ${
                  todayDone
                    ? "bg-success/10 text-success border border-success/30"
                    : "bg-primary text-primary-foreground"
                }`}
              >
                {todayDone ? (
                  <>
                    <Check className="w-4 h-4" /> I applied today
                  </>
                ) : (
                  "Mark today as done"
                )}
              </button>
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div>
                  <Label className="text-[12px]">Apps sent today</Label>
                  <Input
                    type="number"
                    min={0}
                    value={appsToday}
                    onChange={(e) => setAppsToday(Number(e.target.value || 0))}
                    className="mt-1.5 h-10"
                  />
                </div>
                <div className="bg-muted/40 rounded-xl p-3 text-center self-end">
                  <div className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">
                    This week
                  </div>
                  <div className="text-[18px] font-extrabold text-foreground">
                    {11 + appsToday} apps
                  </div>
                </div>
              </div>
              <div className="mt-3">
                <Label className="text-[12px]">What did you ship?</Label>
                <Textarea
                  rows={3}
                  value={reflection}
                  onChange={(e) => setReflection(e.target.value)}
                  placeholder="Tailored CV for Stripe PM role, sent 3 outreach DMs…"
                  className="mt-1.5 text-[13px]"
                />
              </div>
            </div>
            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <p className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">
                  {partner.full_name?.split(" ")[0]}'s check-in · today
                </p>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-success">
                  <Check className="w-3.5 h-3.5" /> Done · 4 apps
                </span>
              </div>
              <p className="text-[13px] text-foreground/85 leading-relaxed mt-2">
                "Recorded 2 Loom intros for PM roles at Flutterwave + Paystack. Going to follow up tomorrow morning."
              </p>
            </div>
          </div>
        )}

        {subTab === "history" && (
          <div className="bg-card border border-border rounded-2xl p-5">
            <p className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground mb-3">
              This week
            </p>
            <div className="space-y-3">
              {[{ name: "You", days: myWeek }, { name: partner.full_name?.split(" ")[0] || "Partner", days: partnerWeek }].map((row) => (
                <div key={row.name}>
                  <div className="text-[12px] font-bold text-foreground mb-1.5">{row.name}</div>
                  <div className="grid grid-cols-7 gap-1.5">
                    {row.days.map((done, i) => (
                      <div key={i} className="text-center">
                        <div
                          className={`h-9 rounded-lg flex items-center justify-center text-[11px] font-bold ${
                            done ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {done ? "✓" : "·"}
                        </div>
                        <div className="text-[9.5px] uppercase tracking-wider text-muted-foreground mt-1">
                          {week[i]}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {subTab === "chat" && (
          <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
            {[
              { who: "partner", text: "Morning! Did you finish the Stripe application?" },
              { who: "me", text: "Yes! Sent it 6am. Going to do 2 more today." },
              { who: "partner", text: "Amazing. I'll do 4. Let's both hit 15 this week." },
              { who: "me", text: "Deal 🤝" },
            ].map((m, i) => (
              <div key={i} className={`flex ${m.who === "me" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-2xl text-[13px] ${
                    m.who === "me"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted text-foreground rounded-bl-sm"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            <div className="flex gap-2 pt-2 border-t border-border">
              <Input placeholder="Type a message…" className="flex-1 h-10" disabled />
              <Button disabled className="rounded-full bg-primary text-primary-foreground">
                Send
              </Button>
            </div>
          </div>
        )}

        {subTab === "challenges" && (
          <div className="bg-card border border-border rounded-2xl p-5">
            <p className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground mb-3">
              Active challenge
            </p>
            <h3 className="text-[15px] font-bold text-foreground">15 applications in 7 days</h3>
            <p className="text-[12.5px] text-muted-foreground mt-1">
              First to 15 picks the next challenge. Both win if you both finish.
            </p>
            <div className="grid grid-cols-2 gap-3 mt-4">
              {[
                { name: "You", val: 11 },
                { name: partner.full_name?.split(" ")[0] || "Partner", val: 13 },
              ].map((p) => (
                <div key={p.name} className="bg-muted/40 rounded-xl p-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[12px] font-bold text-foreground">{p.name}</span>
                    <span className="text-[12px] font-bold text-foreground">{p.val}/15</span>
                  </div>
                  <div className="h-2 rounded-full bg-card mt-2 overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${(p.val / 15) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {subTab === "call" && (
          <div className="bg-card border border-border rounded-2xl p-5 text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary-tint text-primary flex items-center justify-center mx-auto mb-3">
              <Video className="w-7 h-7" />
            </div>
            <h3 className="text-[15px] font-bold text-foreground">Sunday, 7:00 PM WAT</h3>
            <p className="text-[12.5px] text-muted-foreground mt-1">
              Your weekly 30-min sync. Review wins, plan next week, hold each other to it.
            </p>
            <Button disabled className="mt-4 rounded-full bg-primary text-primary-foreground">
              Join call (in 2 days)
            </Button>
          </div>
        )}

        <DialogFooter className="pt-2">
          <p className="text-[11.5px] text-muted-foreground mr-auto">
            This is a preview — pair with a real partner to use it for real.
          </p>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
