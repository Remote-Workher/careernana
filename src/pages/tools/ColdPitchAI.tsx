import { useState } from "react";
import { ArrowLeft, Copy, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { requireSignedIn } from "@/lib/require-signed-in";
import { useSEO } from "@/components/SEO";


const channels = ["Email", "DM", "LinkedIn DM", "WhatsApp"] as const;
const lengths = ["Short", "Medium", "Long"] as const;

type Channel = typeof channels[number];
type Length = typeof lengths[number];

export default function ColdPitchAI() {
  useSEO({ title: "AI Cold Pitch Generator" });
  const navigate = useNavigate();

  const [recipient, setRecipient] = useState("");
  const [observation, setObservation] = useState("");
  const [ask, setAsk] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [channel, setChannel] = useState<Channel>("Email");
  const [length, setLength] = useState<Length>("Medium");

  const [loading, setLoading] = useState(false);
  const [pitch, setPitch] = useState("");
  const [error, setError] = useState("");

  const canGenerate = recipient.trim().length > 1;

  const handleGenerate = async () => {
    setLoading(true);
    setError("");
    setPitch("");
    try {
      const user = await requireSignedIn(navigate, "Sign up to generate a pitch.");
      if (!user) return;
      const { data, error: fnError } = await supabase.functions.invoke("generate-cold-pitch", {
        body: { recipient, observation, ask, channel, length, job_description: jobDescription },
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

  return (
    <div className="max-w-[1200px] animate-fade-in">
      <button
        onClick={() => navigate("/tools")}
        className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to AI Tools
      </button>
      <h1 className="text-[22px] font-bold text-foreground mb-1">✍️ Cold Pitch Writer</h1>
      <p className="text-[13px] text-muted-foreground mb-6">
        Short, specific messages that get one thing: a reply.
      </p>

      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
        {/* LEFT — form */}
        <div className="flex-1 min-w-0">
          <div
            className="bg-card rounded-[14px] border border-[#EBE6E2] p-5 space-y-4"
            style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
          >
            <Field
              label="Who are you pitching?"
              value={recipient}
              onChange={setRecipient}
              placeholder="e.g. Tola, Head of Marketing at Flutterwave"
            />

            <Field
              label="What did you notice about them? (the observation)"
              value={observation}
              onChange={setObservation}
              placeholder="e.g. Their last campaign in Lagos but the captions felt UK-coded"
              multiline
            />
            <p className="text-[10px] text-muted-foreground -mt-2">
              The single most important line in any cold pitch. Be specific.
            </p>

            <Field
              label="What do you want them to say yes to?"
              value={ask}
              onChange={setAsk}
              placeholder="e.g. A 15-min call / permission to send a quick sample"
              multiline
            />

            <div>
              <Label>Pasting a job description? (optional)</Label>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the JD here and AI will mirror its keywords + tailor the pitch to that role…"
                className="w-full mt-2 min-h-[100px] px-3 py-2 rounded-[9px] border border-[#EBE6E2] bg-card text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-y transition-colors"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Great for pitching a hiring manager about a specific role.
              </p>
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
                    ✓ {length}
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
                  className="w-full min-h-[480px] px-4 py-4 rounded-[9px] border border-[#EBE6E2] text-[13px] text-foreground leading-[1.9] resize-none focus:outline-none focus:border-[#E0487A] transition-colors whitespace-pre-wrap"
                  style={{ background: "#FAFEFF" }}
                />
              </div>

              <div className="px-5 pb-4">
                <p className="text-[10px] text-muted-foreground">
                  {channel} · {length} — edit freely before sending
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
                Tell us who, what you noticed about them, and the small ask.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

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
