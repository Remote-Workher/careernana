import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, MessageSquare, Send, Sparkles, ShieldCheck, Linkedin, Globe, Mail, FileText, User as UserIcon, Instagram, Loader2, Clock, Trash2 } from "lucide-react";
import { useSEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { openSignupModal } from "@/lib/signup-modal";

const KINDS = [
  { id: "LinkedIn", icon: Linkedin },
  { id: "Portfolio", icon: Globe },
  { id: "Pitch", icon: Mail },
  { id: "Website", icon: Globe },
  { id: "Resume", icon: FileText },
  { id: "Bio", icon: UserIcon },
  { id: "Instagram", icon: Instagram },
  { id: "Other", icon: Sparkles },
] as const;

type Post = {
  id: string;
  user_id: string;
  kind: string;
  title: string;
  content: string | null;
  url: string | null;
  goal: string | null;
  audience: string | null;
  comment_count: number;
  created_at: string;
  author?: { full_name: string | null; avatar_url: string | null } | null;
  is_expert?: boolean;
};

type Comment = {
  id: string;
  post_id: string;
  user_id: string;
  body: string;
  created_at: string;
  author?: { full_name: string | null; avatar_url: string | null } | null;
  is_expert?: boolean;
};

function timeAgo(iso: string) {
  const d = (Date.now() - +new Date(iso)) / 1000;
  if (d < 60) return "just now";
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  if (d < 604800) return `${Math.floor(d / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

function initials(name: string | null | undefined, fallback = "M") {
  if (!name) return fallback;
  return name.split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

async function attachAuthors<T extends { user_id: string }>(rows: T[]) {
  const ids = Array.from(new Set(rows.map((r) => r.user_id)));
  if (ids.length === 0) return rows.map((r) => ({ ...r, author: null, is_expert: false }));
  const [{ data: profiles }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", ids),
    supabase.from("user_roles").select("user_id, role").in("user_id", ids),
  ]);
  const profMap = new Map<string, any>((profiles || []).map((p: any) => [p.user_id, p]));
  const expertSet = new Set<string>(
    (roles || []).filter((r: any) => r.role === "career_expert" || r.role === "admin").map((r: any) => r.user_id),
  );
  return rows.map((r) => ({
    ...r,
    author: profMap.get(r.user_id) ?? null,
    is_expert: expertSet.has(r.user_id),
  }));
}

export default function FeedbackPost() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useSEO({ title: post ? `${post.title} — Feedback` : "Feedback — Remote Workher" });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const load = async () => {
    if (!postId) return;
    setLoading(true);
    const [{ data: p }, { data: c }] = await Promise.all([
      supabase.from("feedback_posts").select("*").eq("id", postId).maybeSingle(),
      supabase.from("feedback_comments").select("*").eq("post_id", postId).order("created_at", { ascending: true }),
    ]);
    if (!p) {
      setLoading(false);
      setPost(null);
      return;
    }
    const [pWith] = await attachAuthors([p as any]);
    const cWith = await attachAuthors((c || []) as any);
    setPost(pWith as Post);
    setComments(cWith as Comment[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  const submit = async () => {
    if (!userId) {
      openSignupModal({ heading: "Sign in to leave feedback" });
      return;
    }
    const text = body.trim();
    if (text.length < 4) {
      toast.error("Write at least a few words.");
      return;
    }
    setPosting(true);
    const { error } = await supabase.from("feedback_comments").insert({
      post_id: postId,
      user_id: userId,
      body: text.slice(0, 4000),
    });
    setPosting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setBody("");
    load();
  };

  const onDelete = async () => {
    if (!post) return;
    if (!confirm("Delete this post? This can't be undone.")) return;
    setDeleting(true);
    const { error } = await supabase.from("feedback_posts").delete().eq("id", post.id);
    setDeleting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Post deleted.");
    navigate("/feedback");
  };

  if (loading) {
    return (
      <div className="w-full py-20 text-center text-[13px] text-muted-foreground">Loading…</div>
    );
  }

  if (!post) {
    return (
      <div className="w-full py-20 text-center">
        <p className="text-[14px] text-muted-foreground mb-4">Post not found.</p>
        <Link to="/feedback" className="text-primary text-[13px] font-semibold underline">Back to feedback</Link>
      </div>
    );
  }

  const Icon = KINDS.find((k) => k.id === post.kind)?.icon || Sparkles;
  const isOwner = userId && userId === post.user_id;

  return (
    <div className="w-full animate-fade-in max-w-3xl mx-auto">
      <button
        onClick={() => navigate("/feedback")}
        className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> All feedback
      </button>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {/* Post header */}
        <div className="p-5 border-b border-border bg-muted/30">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="w-9 h-9 rounded-full bg-primary-tint border border-primary-border flex items-center justify-center">
                {post.author?.avatar_url ? (
                  <img src={post.author.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <span className="text-[11px] font-bold text-primary">{initials(post.author?.full_name, "M")}</span>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[13px] font-semibold text-foreground">
                    {post.author?.full_name || "Member"}
                  </span>
                  {post.is_expert && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[9.5px] font-bold uppercase tracking-wider">
                      <ShieldCheck className="w-2.5 h-2.5" /> Expert
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {timeAgo(post.created_at)}
                  <span className="mx-1">·</span>
                  <Icon className="w-3 h-3" /> {post.kind}
                </div>
              </div>
            </div>
            {isOwner && (
              <button
                onClick={onDelete}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-[12px] font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-60"
              >
                {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                Delete
              </button>
            )}
          </div>

          <h1 className="text-[20px] sm:text-[24px] font-serif text-foreground leading-tight mb-3">
            {post.title}
          </h1>

          {post.url && (
            <a
              href={post.url}
              target="_blank"
              rel="noreferrer noopener"
              className="block text-[13px] text-primary underline break-all mb-3"
            >
              {post.url}
            </a>
          )}
          {post.content && (
            <pre className="whitespace-pre-wrap font-sans text-[13.5px] text-foreground leading-relaxed">
              {post.content}
            </pre>
          )}
          {(post.goal || post.audience) && (
            <div className="mt-3 grid sm:grid-cols-2 gap-2 text-[12px]">
              {post.goal && (
                <div className="bg-card border border-border rounded-lg px-2.5 py-1.5">
                  <span className="font-bold text-foreground">Goal:</span>{" "}
                  <span className="text-muted-foreground">{post.goal}</span>
                </div>
              )}
              {post.audience && (
                <div className="bg-card border border-border rounded-lg px-2.5 py-1.5">
                  <span className="font-bold text-foreground">Audience:</span>{" "}
                  <span className="text-muted-foreground">{post.audience}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Comments */}
        <div className="p-5 space-y-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-sidebar-muted">
            {comments.length} {comments.length === 1 ? "review" : "reviews"}
          </div>
          {comments.length === 0 ? (
            <div className="text-[13px] text-muted-foreground py-6 text-center border border-dashed border-border rounded-xl">
              No reviews yet. Be the first to share your take.
            </div>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary-tint border border-primary-border flex items-center justify-center shrink-0">
                  {c.author?.avatar_url ? (
                    <img src={c.author.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <span className="text-[10.5px] font-bold text-primary">{initials(c.author?.full_name, "M")}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-[12.5px] font-semibold text-foreground">
                      {c.author?.full_name || "Member"}
                    </span>
                    {c.is_expert && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[9.5px] font-bold uppercase tracking-wider">
                        <ShieldCheck className="w-2.5 h-2.5" /> Expert review
                      </span>
                    )}
                    <span className="text-[10.5px] text-muted-foreground">· {timeAgo(c.created_at)}</span>
                  </div>
                  <div
                    className={`rounded-xl p-3 text-[13px] leading-relaxed whitespace-pre-wrap ${
                      c.is_expert
                        ? "bg-primary-tint/60 border border-primary-border text-foreground"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    {c.body}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Composer */}
        <div className="p-4 border-t border-border bg-card sticky bottom-0">
          <div className="flex gap-2">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={userId ? "Leave your feedback…" : "Sign in to leave feedback"}
              rows={2}
              maxLength={4000}
              disabled={!userId}
              className="flex-1 px-3 py-2 rounded-xl border border-border bg-background text-[13px] focus:outline-none focus:border-primary resize-none disabled:opacity-60"
            />
            <button
              onClick={submit}
              disabled={posting || !userId}
              className="shrink-0 self-end inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-[12.5px] font-bold hover:bg-primary-dark disabled:opacity-60"
            >
              {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
