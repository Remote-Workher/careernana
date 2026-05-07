import { useState } from "react";
import { ArrowLeft, Copy, RefreshCw, Linkedin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { requireSignedIn } from "@/lib/require-signed-in";

const postTypes = [
  { id: "story", label: "Personal story" },
  { id: "lesson", label: "Lesson / framework" },
  { id: "career_milestone", label: "Career milestone" },
  { id: "win", label: "Win announcement" },
  { id: "how_to", label: "How-to / tutorial" },
  { id: "list", label: "List post" },
  { id: "hot_take", label: "Hot take" },
  { id: "observation", label: "Observation / trend" },
  { id: "question", label: "Engagement question" },
] as const;

const tones = [
  "Conversational",
  "Confident",
  "Vulnerable",
  "Bold & punchy",
  "Warm & encouraging",
  "Professional",
] as const;

type PostType = typeof postTypes[number]["id"];
type Tone = typeof tones[number];

export default function LinkedInPostGenerator() {
  const navigate = useNavigate();
  const [postType, setPostType] = useState<PostType>("lesson");
  const [topic, setTopic] = useState("");
  const [keyPoints, setKeyPoints] = useState("");
  const [audience, setAudience] = useState("");
  const [cta, setCta] = useState("");
  const [tone, setTone] = useState<Tone>("Conversational");
  const [includeEmojis, setIncludeEmojis] = useState(true);
  const [includeHashtags, setIncludeHashtags] = useState(true);
  const [loading, setLoading] = useState(false);
  const [post, setPost] = useState("");
  const [error, setError] = useState("");

  const canGenerate = topic.trim().length > 4;
  const charCount = post.length;
  const overLimit = charCount > 1300;

  const handleGenerate = async () => {
    setLoading(true);
    setError("");
    setPost("");
    try {
      const user = await requireSignedIn(navigate, "Sign up to generate LinkedIn posts.");
      if (!user) return;
      const { data, error: fnError } = await supabase.functions.invoke("generate-linkedin-post", {
        body: {
          topic,
          post_type: postType,
          tone,
          include_emojis: includeEmojis,
          include_hashtags: includeHashtags,
          audience,
          key_points: keyPoints,
          cta,
        },
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      if (data?.post) setPost(data.post);
    } catch (e: any) {
      setError(e?.message || "Generation failed");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(post);
    toast({ title: "Copied! ✓", description: "Post copied to clipboard." });
  };

  const Chip = ({ active, onClick, children }: any) => (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all",
        active
          ? "text-[#0A66C2] bg-[#E6F0FA] border-[#0A66C2]"
          : "text-muted-foreground bg-card border-[#EBE6E2] hover:border-[#A8CDEE]"
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
      <h1 className="text-[22px] font-bold text-foreground mb-1 flex items-center gap-2">
        <Linkedin className="w-5 h-5 text-[#0A66C2]" /> LinkedIn Post Generator
      </h1>
      <p className="text-[13px] text-muted-foreground mb-6">
        Write scroll-stopping LinkedIn posts using proven viral formulas.
      </p>

      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
        {/* LEFT — form */}
        <div className="flex-1 min-w-0">
          <div
            className="bg-card rounded-[14px] border border-[#EBE6E2] p-5 space-y-4"
            style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
          >
            <div>
              <Label>Post type</Label>
              <div className="flex gap-2 mt-2 flex-wrap">
                {postTypes.map((p) => (
                  <Chip key={p.id} active={postType === p.id} onClick={() => setPostType(p.id)}>
                    {p.label}
                  </Chip>
                ))}
              </div>
            </div>

            <div>
              <Label>What's the post about? *</Label>
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. How I landed my first remote PM role after switching from teaching"
                className="w-full mt-1 min-h-[80px] px-3 py-2.5 rounded-[9px] border border-[#EBE6E2] bg-card text-[12px] resize-none focus:outline-none focus:border-[#0A66C2] transition-colors"
              />
            </div>

            <div>
              <Label>Key points to include (optional)</Label>
              <textarea
                value={keyPoints}
                onChange={(e) => setKeyPoints(e.target.value)}
                placeholder="One per line — specific stories, stats, or lessons"
                className="w-full mt-1 min-h-[70px] px-3 py-2.5 rounded-[9px] border border-[#EBE6E2] bg-card text-[12px] resize-none focus:outline-none focus:border-[#0A66C2] transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Audience (optional)</Label>
                <input
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  placeholder="e.g. Career switchers in Lagos"
                  className="w-full mt-1 px-3 py-2.5 rounded-[9px] border border-[#EBE6E2] bg-card text-[12px] focus:outline-none focus:border-[#0A66C2] transition-colors"
                />
              </div>
              <div>
                <Label>Call to action (optional)</Label>
                <input
                  value={cta}
                  onChange={(e) => setCta(e.target.value)}
                  placeholder="e.g. DM me 'PM' for my notes"
                  className="w-full mt-1 px-3 py-2.5 rounded-[9px] border border-[#EBE6E2] bg-card text-[12px] focus:outline-none focus:border-[#0A66C2] transition-colors"
                />
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

            <div className="flex flex-wrap gap-3 pt-1">
              <label className="flex items-center gap-2 text-[12px] text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeEmojis}
                  onChange={(e) => setIncludeEmojis(e.target.checked)}
                  className="w-4 h-4 accent-[#0A66C2]"
                />
                Include emojis
              </label>
              <label className="flex items-center gap-2 text-[12px] text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeHashtags}
                  onChange={(e) => setIncludeHashtags(e.target.checked)}
                  className="w-4 h-4 accent-[#0A66C2]"
                />
                Include hashtags
              </label>
            </div>

            <button
              onClick={handleGenerate}
              disabled={!canGenerate || loading}
              className="w-full py-3 rounded-[9px] text-[13px] font-semibold text-white disabled:opacity-50 transition-all"
              style={{ background: "linear-gradient(135deg, #0A66C2, #084d92)" }}
            >
              {loading ? "Writing your post..." : "✨ Generate LinkedIn Post"}
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
          {post ? (
            <div
              className="bg-card rounded-[14px] border border-[#EBE6E2]"
              style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-5 py-3 border-b border-[#EBE6E2]">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold text-[#0A66C2] bg-[#E6F0FA] border border-[#A8CDEE]">
                    LinkedIn
                  </span>
                  <span
                    className={cn(
                      "inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold",
                      overLimit
                        ? "bg-[#FDF1F5] text-destructive border border-[#F7CDD9]"
                        : "bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]"
                    )}
                  >
                    {charCount} / 1300
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
                  value={post}
                  onChange={(e) => setPost(e.target.value)}
                  className="w-full min-h-[480px] px-4 py-4 rounded-[9px] border border-[#EBE6E2] text-[13px] text-foreground leading-[1.9] resize-none focus:outline-none focus:border-[#0A66C2] transition-colors whitespace-pre-wrap"
                  style={{ background: "#FAFEFF" }}
                />
              </div>

              <div className="px-5 pb-4">
                <p className="text-[10px] text-muted-foreground">
                  {postType.replace("_", " ")} · {tone} — edit freely before posting
                </p>
              </div>
            </div>
          ) : (
            <div
              className="bg-card rounded-[14px] border border-[#EBE6E2] p-12 text-center"
              style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
            >
              <p className="text-[36px] mb-3">💼</p>
              <p className="text-[16px] font-bold text-foreground mb-1">
                Your LinkedIn post will appear here
              </p>
              <p className="text-[13px] text-muted-foreground">
                Pick a post type, drop your topic, and hit generate.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
