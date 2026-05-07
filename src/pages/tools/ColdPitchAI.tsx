import { useState, useEffect, useMemo } from "react";
import { ArrowLeft, Copy, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { requireSignedIn } from "@/lib/require-signed-in";

const pitchTypes = [
  { id: "job-application", label: "Job application" },
  { id: "follow-up", label: "Follow-up" },
  { id: "networking", label: "Networking" },
  { id: "cold-outreach", label: "Cold outreach" },
  { id: "thank-you", label: "Thank you" },
  { id: "referral-request", label: "Referral request" },
  { id: "salary-negotiation", label: "Salary negotiation" },
  { id: "resignation", label: "Resignation" },
] as const;

const channels = ["Email", "DM", "LinkedIn DM", "WhatsApp"] as const;
const tones = ["Professional", "Friendly", "Formal", "Confident"] as const;
const lengths = [
  "Short (under 100 words)",
  "Medium (150–250 words)",
  "Full email (250–350 words)",
] as const;

type PitchType = typeof pitchTypes[number]["id"];
type Channel = typeof channels[number];
type Tone = typeof tones[number];
type Length = typeof lengths[number];

type AppRow = {
  id: string;
  job_title: string;
  company: string;
  status: string;
  applied_date: string | null;
  description: string | null;
  location: string | null;
  notes: string | null;
};

export default function ColdPitchAI() {
  const navigate = useNavigate();
  const [pitchType, setPitchType] = useState<PitchType>("job-application");

  // Tracked applications
  const [apps, setApps] = useState<AppRow[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<string>("");

  // Contextual minimal fields (only some shown per pitch type)
  const [recipient, setRecipient] = useState(""); // person / company name
  const [context, setContext] = useState(""); // free-form context (what to say / what they did / why)
  const [extra, setExtra] = useState(""); // secondary field used by a few types

  const [channel, setChannel] = useState<Channel>("Email");
  const [tone, setTone] = useState<Tone>("Professional");
  const [length, setLength] = useState<Length>("Medium (150–250 words)");
  const [loading, setLoading] = useState(false);
  const [pitch, setPitch] = useState("");
  const [error, setError] = useState("");

  // Load applications: both tracked (applications) AND submitted (job_applications)
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [trackedRes, submittedRes] = await Promise.all([
        supabase
          .from("applications")
          .select("id,job_title,company,status,applied_date,description,location,notes")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("job_applications")
          .select("id, job_id, status, created_at")
          .eq("applicant_user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

      const tracked = (trackedRes.data || []) as AppRow[];
      const subs = submittedRes.data || [];

      let submittedRows: AppRow[] = [];
      if (subs.length > 0) {
        const jobIds = Array.from(new Set(subs.map((s: any) => s.job_id)));
        const { data: jobs } = await supabase
          .from("recruiter_jobs")
          .select("id, title, location, user_id, description")
          .in("id", jobIds);
        const recruiterIds = Array.from(new Set((jobs || []).map((j: any) => j.user_id)));
        const { data: recs } = recruiterIds.length
          ? await supabase
              .from("recruiter_profiles")
              .select("user_id, company_name")
              .in("user_id", recruiterIds)
          : { data: [] as any[] };
        const jobMap = new Map((jobs || []).map((j: any) => [j.id, j]));
        const recMap = new Map((recs || []).map((r: any) => [r.user_id, r.company_name]));
        submittedRows = subs.map((s: any) => {
          const j: any = jobMap.get(s.job_id);
          return {
            id: s.id,
            job_title: j?.title || "Job",
            company: (j ? recMap.get(j.user_id) : null) || "Recruiter",
            status: s.status,
            applied_date: s.created_at,
            description: j?.description ?? null,
            location: j?.location ?? null,
            notes: null,
          };
        });
      }

      setApps([...submittedRows, ...tracked]);
    })();
  }, []);

  const selectedApp = useMemo(
    () => apps.find((a) => a.id === selectedAppId) || null,
    [apps, selectedAppId]
  );

  // Reset secondary state when type changes
  useEffect(() => {
    setSelectedAppId("");
    setRecipient("");
    setContext("");
    setExtra("");
    setPitch("");
    setError("");
  }, [pitchType]);

  const usesAppPicker = pitchType === "job-application" || pitchType === "follow-up" || pitchType === "salary-negotiation";

  const canGenerate = (() => {
    switch (pitchType) {
      case "job-application":
        return !!selectedAppId || (recipient.trim().length > 1 && extra.trim().length > 1);
      case "follow-up":
        return !!selectedAppId || recipient.trim().length > 1;
      case "salary-negotiation":
        return (!!selectedAppId || recipient.trim().length > 1) && extra.trim().length > 0;
      case "resignation":
        return recipient.trim().length > 1 && extra.trim().length > 0;
      default:
        return recipient.trim().length > 1;
    }
  })();

  const handleGenerate = async () => {
    setLoading(true);
    setError("");
    setPitch("");
    try {
      const user = await requireSignedIn(navigate, "Sign up to generate a pitch.");
      if (!user) return;
      const { data, error: fnError } = await supabase.functions.invoke("generate-cold-pitch", {
        body: {
          pitch_type: pitchType,
          application: selectedApp,
          recipient,
          context,
          extra,
          channel,
          tone,
          length,
        },
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      if (data?.pitch) setPitch(data.pitch);
    } catch (e: any) {
      setError(e?.message || "Generation failed");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(pitch);
    toast({ title: "Copied! ✓", description: "Pitch copied to clipboard." });
  };

  const Chip = ({ active, onClick, children }: any) => (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all",
        active
          ? "text-[#E0487A] bg-[#FDF1F5] border-[#E0487A]"
          : "text-muted-foreground bg-card border-[#EBE6E2] hover:border-[#F7CDD9]"
      )}
    >
      {children}
    </button>
  );

  const Label = ({ children }: any) => (
    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
      {children}
    </label>
  );

  // Contextual field configs per pitch type
  const renderContextualFields = () => {
    switch (pitchType) {
      case "job-application":
        return (
          <>
            <AppPicker apps={apps} value={selectedAppId} onChange={setSelectedAppId} required />
            {!selectedAppId && (
              <>
                <Field label="Role you're applying for" value={recipient} onChange={setRecipient} placeholder="e.g. Marketing Manager at Flutterwave" />
                <Field label="Why this role / what makes you a fit (optional)" value={extra} onChange={setExtra} placeholder="One line about why you" multiline />
              </>
            )}
            {selectedAppId && (
              <Field
                label="Anything specific to add? (optional)"
                value={context}
                onChange={setContext}
                placeholder="e.g. mention I have a referral / loved their recent product launch"
                multiline
              />
            )}
          </>
        );
      case "follow-up":
        return (
          <>
            <Label>Who are you following up with?</Label>
            <div className="flex gap-2 mt-2">
              <Chip active={!!selectedAppId || (!recipient && !selectedAppId)} onClick={() => { setRecipient(""); }}>
                A job I applied to
              </Chip>
              <Chip active={!!recipient && !selectedAppId} onClick={() => { setSelectedAppId(""); setRecipient("Person"); }}>
                A person
              </Chip>
            </div>
            {recipient && !selectedAppId ? (
              <>
                <Field label="Who" value={recipient === "Person" ? "" : recipient} onChange={setRecipient} placeholder="e.g. Tola, hiring manager I met at the meetup" />
                <Field label="What was the last touchpoint? (optional)" value={context} onChange={setContext} placeholder="e.g. Coffee chat 2 weeks ago about the PM role" multiline />
              </>
            ) : (
              <>
                <AppPicker apps={apps} value={selectedAppId} onChange={setSelectedAppId} required />
                <Field label="Anything new to mention? (optional)" value={context} onChange={setContext} placeholder="e.g. I've since shipped X / completed Y certification" multiline />
              </>
            )}
          </>
        );
      case "networking":
        return (
          <>
            <Field label="Who are you reaching out to?" value={recipient} onChange={setRecipient} placeholder="e.g. Senior PM at Paystack" />
            <Field label="Why them? (optional)" value={context} onChange={setContext} placeholder="e.g. Their post on payments infra / shared alma mater" multiline />
          </>
        );
      case "cold-outreach":
        return (
          <>
            <Field label="Who are you pitching?" value={recipient} onChange={setRecipient} placeholder="e.g. The marketing lead at Flutterwave" />
            <Field label="What do you want from them? (optional)" value={context} onChange={setContext} placeholder="e.g. A 15-min call to explore working together" multiline />
          </>
        );
      case "thank-you":
        return (
          <>
            <Field label="Who are you thanking?" value={recipient} onChange={setRecipient} placeholder="e.g. Sarah, who interviewed me" />
            <Field label="What are you thanking them for? (optional)" value={context} onChange={setContext} placeholder="e.g. The interview / intro / advice" multiline />
          </>
        );
      case "referral-request":
        return (
          <>
            <Field label="Who are you asking?" value={recipient} onChange={setRecipient} placeholder="e.g. Ada, an old colleague at Andela" />
            <Field label="Role / company you want a referral for" value={context} onChange={setContext} placeholder="e.g. Senior Designer at Paystack" multiline />
          </>
        );
      case "salary-negotiation":
        return (
          <>
            <AppPicker apps={apps} value={selectedAppId} onChange={setSelectedAppId} hint="Pick the offer (optional)" />
            {!selectedAppId && (
              <Field label="Role / company" value={recipient} onChange={setRecipient} placeholder="e.g. Senior PM offer at Paystack" />
            )}
            <Field label="What number / range are you asking for?" value={extra} onChange={setExtra} placeholder="e.g. ₦12M base, up from ₦9.5M" />
            <Field label="Justification (optional)" value={context} onChange={setContext} placeholder="e.g. Market data, scope, prior impact" multiline />
          </>
        );
      case "resignation":
        return (
          <>
            <Field label="Manager's name + company" value={recipient} onChange={setRecipient} placeholder="e.g. James at Andela" />
            <Field label="Last working day" value={extra} onChange={setExtra} placeholder="e.g. Friday, 30 May 2026" />
            <Field label="Reason / context (optional)" value={context} onChange={setContext} placeholder="e.g. Taking on a new role / relocating" multiline />
          </>
        );
    }
  };

  return (
    <div className="max-w-[1200px] animate-fade-in">
      <button
        onClick={() => navigate("/tools")}
        className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to AI Tools
      </button>
      <h1 className="text-[22px] font-bold text-foreground mb-1">✍️ Pitch Writer</h1>
      <p className="text-[13px] text-muted-foreground mb-6">
        Pick the pitch type — we'll only ask what we need.
      </p>

      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
        {/* LEFT — form */}
        <div className="flex-1 min-w-0">
          <div
            className="bg-card rounded-[14px] border border-[#EBE6E2] p-5 space-y-4"
            style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
          >
            <div>
              <Label>Pitch type</Label>
              <div className="flex gap-2 mt-2 flex-wrap">
                {pitchTypes.map((p) => (
                  <Chip key={p.id} active={pitchType === p.id} onClick={() => setPitchType(p.id)}>
                    {p.label}
                  </Chip>
                ))}
              </div>
            </div>

            <div className="space-y-4 pt-2 border-t border-[#EBE6E2]">
              {renderContextualFields()}
            </div>

            <div className="pt-2 border-t border-[#EBE6E2] space-y-4">
              <div>
                <Label>Channel</Label>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {channels.map((c) => (
                    <Chip key={c} active={channel === c} onClick={() => setChannel(c)}>
                      {c}
                    </Chip>
                  ))}
                </div>
              </div>

              <div>
                <Label>Tone</Label>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {tones.map((t) => (
                    <Chip key={t} active={tone === t} onClick={() => setTone(t)}>
                      {t}
                    </Chip>
                  ))}
                </div>
              </div>

              <div>
                <Label>Length</Label>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {lengths.map((l) => (
                    <Chip key={l} active={length === l} onClick={() => setLength(l)}>
                      {l}
                    </Chip>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={!canGenerate || loading}
              className="w-full py-3 rounded-[9px] text-[13px] font-semibold text-white disabled:opacity-50 transition-all"
              style={{ background: "linear-gradient(135deg, #E0487A, #c73868)" }}
            >
              {loading ? "Writing your pitch..." : "✨ Generate Pitch"}
            </button>

            {error && (
              <div className="p-3 rounded-[9px] bg-[#FDF1F5] border border-[#F7CDD9]">
                <p className="text-[12px] text-destructive font-semibold">{error}</p>
              </div>
            )}

            {usesAppPicker && apps.length === 0 && (
              <p className="text-[11px] text-muted-foreground">
                Tip: track jobs in your Applications and they'll show up here.
              </p>
            )}
          </div>
        </div>

        {/* RIGHT — output */}
        <div className="flex-1 min-w-0">
          {pitch ? (
            <div
              className="bg-card rounded-[14px] border border-[#EBE6E2]"
              style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-5 py-3 border-b border-[#EBE6E2]">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold text-[#E0487A] bg-[#FDF1F5] border border-[#F7CDD9]">
                    {channel}
                  </span>
                  <span
                    className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold"
                    style={{ background: "#ECFDF5", color: "#059669", border: "1px solid #A7F3D0" }}
                  >
                    ✓ {tone}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={handleGenerate}
                    disabled={loading}
                    className="px-3 py-1.5 rounded-[9px] text-[11px] font-semibold text-muted-foreground bg-[#F5F7FA] hover:bg-[#EBE6E2] transition-colors flex items-center gap-1 disabled:opacity-50"
                  >
                    <RefreshCw className="w-3 h-3" /> Regenerate
                  </button>
                  <button
                    onClick={handleCopy}
                    className="px-3 py-1.5 rounded-[9px] text-[11px] font-semibold text-muted-foreground border border-[#EBE6E2] hover:bg-[#F5F7FA] transition-colors flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" /> Copy
                  </button>
                </div>
              </div>

              <div className="p-5">
                <textarea
                  value={pitch}
                  onChange={(e) => setPitch(e.target.value)}
                  className="w-full min-h-[480px] px-4 py-4 rounded-[9px] border border-[#EBE6E2] text-[13px] text-foreground leading-[1.7] resize-none focus:outline-none focus:border-[#E0487A] transition-colors whitespace-pre-wrap"
                  style={{ background: "#FAFEFF", fontFamily: "ui-sans-serif, system-ui, sans-serif" }}
                />
              </div>

              <div className="px-5 pb-4">
                <p className="text-[10px] text-muted-foreground">
                  {channel} · {tone} · {length} — edit freely before sending
                </p>
              </div>
            </div>
          ) : (
            <div
              className="bg-card rounded-[14px] border border-[#EBE6E2] p-12 text-center"
              style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
            >
              <p className="text-[36px] mb-3">✍️</p>
              <p className="text-[16px] font-bold text-foreground mb-1">
                Your pitch will appear here
              </p>
              <p className="text-[13px] text-muted-foreground">
                Pick a pitch type and answer just a couple of questions.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* --------- small helper components (kept in-file for cohesion) --------- */

function Field({
  label,
  value,
  onChange,
  placeholder,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  return (
    <div>
      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
        {label}
      </label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full mt-1 min-h-[70px] px-3 py-2.5 rounded-[9px] border border-[#EBE6E2] bg-card text-[12px] resize-none focus:outline-none focus:border-[#E0487A] transition-colors"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full mt-1 px-3 py-2.5 rounded-[9px] border border-[#EBE6E2] bg-card text-[12px] focus:outline-none focus:border-[#E0487A] transition-colors"
        />
      )}
    </div>
  );
}

function AppPicker({
  apps,
  value,
  onChange,
  required,
  hint,
}: {
  apps: AppRow[];
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div>
      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
        {hint || "Pick one of your tracked jobs"} {required && !hint && <span className="text-[#E0487A]">*</span>}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full mt-1 px-3 py-2.5 rounded-[9px] border border-[#EBE6E2] bg-card text-[12px] focus:outline-none focus:border-[#E0487A] transition-colors"
      >
        <option value="">{apps.length ? "— Select a job —" : "No tracked jobs yet"}</option>
        {apps.map((a) => (
          <option key={a.id} value={a.id}>
            {a.job_title} @ {a.company} {a.status ? `· ${a.status}` : ""}
          </option>
        ))}
      </select>
    </div>
  );
}
