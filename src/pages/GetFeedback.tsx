import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { useNavigate } from "react-router-dom";
import { ArrowLeft, MessageSquare, Send, Sparkles, Plus, ShieldCheck, Linkedin, Globe, Mail, FileText, User as UserIcon, Instagram, X, Loader2, Clock, Trash2, Pencil, Paperclip } from "lucide-react";
import { useSEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { openSignupModal } from "@/lib/signup-modal";

type Kind = "LinkedIn" | "Portfolio" | "Website" | "Pitch" | "Resume" | "Bio" | "Instagram" | "Other";

const KINDS: { id: Kind; label: string; icon: any }[] = [
  { id: "LinkedIn", label: "LinkedIn", icon: Linkedin },
  { id: "Portfolio", label: "Portfolio", icon: Globe },
  { id: "Pitch", label: "Pitch / email", icon: Mail },
  { id: "Website", label: "Website", icon: Globe },
  { id: "Resume", label: "Resume", icon: FileText },
  { id: "Bio", label: "Bio", icon: UserIcon },
  { id: "Instagram", label: "Instagram / X", icon: Instagram },
  { id: "Other", label: "Other", icon: Sparkles },
];

type Post = {
  id: string;
  user_id: string;
  kind: string;
  title: string;
  content: string | null;
  url: string | null;
  goal: string | null;
  audience: string | null;
  status: string;
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

async function attachAuthors<T extends { user_id: string }>(rows: T[]): Promise<(T & { author: any; is_expert: boolean })[]> {
  const ids = Array.from(new Set(rows.map((r) => r.user_id)));
  if (ids.length === 0) return rows.map((r) => ({ ...r, author: null, is_expert: false }));
  const [{ data: profiles }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", ids),
    supabase.from("user_roles").select("user_id, role").in("user_id", ids).eq("role", "career_expert"),
  ]);
  const profMap = new Map<string, any>((profiles || []).map((p: any) => [p.user_id, p]));
  const expertSet = new Set<string>((roles || []).map((r: any) => r.user_id));
  return rows.map((r) => ({
    ...r,
    author: profMap.get(r.user_id) ?? null,
    is_expert: expertSet.has(r.user_id),
  }));
}

export default function GetFeedback() {
  useSEO({
    title: "Get Feedback — Remote Workher",
    description: "Drop your LinkedIn, portfolio, pitch, or resume and get real reviews from Omotoyosi & Ruby — our career experts — and the Remote Workher community.",
  });
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [filter, setFilter] = useState<Kind | "All">("All");
  const [composerOpen, setComposerOpen] = useState(false);

  const PAGE_SIZE = 10;
  const SELECT_FIELDS = "id,user_id,kind,title,content,url,goal,audience,status,comment_count,created_at";

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const loadPosts = async (reset = true) => {
    if (reset) {
      setLoading(true);
      setHasMore(true);
    } else {
      setLoadingMore(true);
    }
    const offset = reset ? 0 : posts.length;
    const { data, error } = await supabase
      .from("feedback_posts")
      .select(SELECT_FIELDS)
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) {
      console.error(error);
      toast.error("Couldn't load feedback posts.");
      setLoading(false);
      setLoadingMore(false);
      return;
    }
    const rows = (data || []) as any[];
    const withAuthors = await attachAuthors(rows as any);
    setPosts((prev) => (reset ? (withAuthors as Post[]) : [...prev, ...(withAuthors as Post[])]));
    setHasMore(rows.length === PAGE_SIZE);
    setLoading(false);
    setLoadingMore(false);
  };

  useEffect(() => {
    loadPosts(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(
    () => (filter === "All" ? posts : posts.filter((p) => p.kind === filter)),
    [posts, filter],
  );

  const requireAuth = () => {
    if (!userId) {
      openSignupModal({
        heading: "Sign in to post for feedback",
        subtext: "Members can post their LinkedIn, portfolio, pitches and more to get reviewed by Omotoyosi, Ruby and the community.",
      });
      return false;
    }
    return true;
  };

  return (
    <div className="w-full animate-fade-in">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">

          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-tint border border-primary-border text-[10.5px] font-bold text-primary uppercase tracking-wider mb-3">
              <MessageSquare className="w-3 h-3" /> Discussions · Get feedback
            </div>
            <h1 className="text-[26px] sm:text-[34px] font-serif text-foreground leading-tight tracking-tight">
              Drop your work. Get real feedback.
            </h1>
            <p className="text-[13.5px] sm:text-[14.5px] text-muted-foreground leading-relaxed mt-2 max-w-2xl">
              Post your LinkedIn, portfolio, pitch, resume, or bio and get reviews from{" "}
              <span className="font-semibold text-foreground">Omotoyosi & Ruby</span> — our career experts — and the Remote Workher community.
            </p>
          </div>
          <button
            onClick={() => requireAuth() && setComposerOpen(true)}
            className="shrink-0 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-[13.5px] hover:bg-primary-dark transition-colors"
          >
            <Plus className="w-4 h-4" /> Ask for feedback
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-5">
          {(["All", ...KINDS.map((k) => k.id)] as (Kind | "All")[]).map((k) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-colors ${
                filter === k
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/50"
              }`}
            >
              {k}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="text-[13px] text-muted-foreground py-12 text-center">Loading posts…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-14 border border-dashed border-border rounded-xl">
            <MessageSquare className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-[13px] text-muted-foreground">
              {filter === "All"
                ? "No posts yet. Be the first to ask for feedback."
                : `No ${filter} posts yet.`}
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {filtered.map((p) => (
                <PostCard
                  key={p.id}
                  post={p}
                  currentUserId={userId}
                  onDeleted={() => loadPosts(true)}
                  onCommentChange={() => loadPosts(true)}
                  onUpdated={() => loadPosts(true)}
                />
              ))}
            </div>
            {filter === "All" && hasMore && (
              <div className="mt-5 flex justify-center">
                <button
                  onClick={() => loadPosts(false)}
                  disabled={loadingMore}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border bg-card text-[12.5px] font-semibold text-foreground hover:bg-muted disabled:opacity-60"
                >
                  {loadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Load more
                </button>
              </div>
            )}
          </>
        )}



      {composerOpen && (
        <Composer
          onClose={() => setComposerOpen(false)}
          onCreated={() => {
            setComposerOpen(false);
            loadPosts(true);
          }}
        />
      )}
    </div>
  );
}

function PostCard({
  post,
  currentUserId,
  onDeleted,
  onCommentChange,
  onUpdated,
}: {
  post: Post;
  currentUserId: string | null;
  onDeleted: () => void;
  onCommentChange: () => void;
  onUpdated: () => void;
}) {
  const Icon = KINDS.find((k) => k.id === post.kind)?.icon || Sparkles;
  const isOwner = currentUserId && currentUserId === post.user_id;
  const [deleting, setDeleting] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const COMMENTS_PAGE_SIZE = 5;
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [loadingMoreComments, setLoadingMoreComments] = useState(false);
  const [totalComments, setTotalComments] = useState<number>(post.comment_count || 0);
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(post.title);
  const [editContent, setEditContent] = useState(post.content || "");
  const [editUrl, setEditUrl] = useState(post.url || "");
  const [savingEdit, setSavingEdit] = useState(false);

  const handleDelete = async () => {
    if (!confirm("Delete this post? This can't be undone.")) return;
    setDeleting(true);
    const { error } = await supabase.from("feedback_posts").delete().eq("id", post.id);
    setDeleting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Post deleted.");
    onDeleted();
  };

  const handleSaveEdit = async () => {
    if (editTitle.trim().length < 4) {
      toast.error("Title needs at least 4 characters.");
      return;
    }
    if (!editUrl.trim() && !editContent.trim()) {
      toast.error("Add a link or content.");
      return;
    }
    setSavingEdit(true);
    const { error } = await supabase
      .from("feedback_posts")
      .update({
        title: editTitle.trim().slice(0, 160),
        content: editContent.trim().slice(0, 6000) || null,
        url: editUrl.trim().slice(0, 500) || null,
      })
      .eq("id", post.id);
    setSavingEdit(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Post updated.");
    setEditing(false);
    onUpdated();
  };

  // Load the most recent page first; "Load earlier" prepends older ones.
  const loadComments = async () => {
    setLoadingComments(true);
    const { data, count } = await supabase
      .from("feedback_comments")
      .select("*", { count: "exact" })
      .eq("post_id", post.id)
      .order("created_at", { ascending: false })
      .range(0, COMMENTS_PAGE_SIZE - 1);
    const ordered = (data || []).slice().reverse();
    const withAuthors = await attachAuthors(ordered as any);
    setComments(withAuthors as Comment[]);
    setTotalComments(count ?? ordered.length);
    setLoadingComments(false);
  };

  const loadEarlierComments = async () => {
    if (loadingMoreComments) return;
    setLoadingMoreComments(true);
    const from = comments.length;
    const to = from + COMMENTS_PAGE_SIZE - 1;
    const { data, count } = await supabase
      .from("feedback_comments")
      .select("*", { count: "exact" })
      .eq("post_id", post.id)
      .order("created_at", { ascending: false })
      .range(from, to);
    const ordered = (data || []).slice().reverse();
    const withAuthors = await attachAuthors(ordered as any);
    setComments([...(withAuthors as Comment[]), ...comments]);
    if (typeof count === "number") setTotalComments(count);
    setLoadingMoreComments(false);
  };

  const toggleComments = () => {
    const next = !commentsOpen;
    setCommentsOpen(next);
    if (next && comments.length === 0) loadComments();
  };

  const submitComment = async () => {
    if (!currentUserId) {
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
      post_id: post.id,
      user_id: currentUserId,
      body: text.slice(0, 4000),
    });
    setPosting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setBody("");
    loadComments();
    onCommentChange();
  };

  const longContent = !!post.content && post.content.length > 280;
  const displayContent =
    expanded || !longContent ? post.content : post.content!.slice(0, 280) + "…";

  return (
    <div className="w-full bg-card border border-border rounded-2xl p-4 sm:p-5 transition-all">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-primary-tint border border-primary-border flex items-center justify-center shrink-0">
          {post.author?.avatar_url ? (
            <img src={post.author.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
          ) : (
            <span className="text-[11.5px] font-bold text-primary">{initials(post.author?.full_name, "M")}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-[12.5px] font-semibold text-foreground truncate">
              {post.author?.full_name || "Member"}
            </span>
            {post.is_expert && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[9.5px] font-bold uppercase tracking-wider">
                <ShieldCheck className="w-2.5 h-2.5" /> Expert
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-[10.5px] text-muted-foreground">
              <Clock className="w-3 h-3" /> {timeAgo(post.created_at)}
            </span>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-muted text-foreground/70 text-[10px] font-semibold">
              <Icon className="w-2.5 h-2.5" /> {post.kind}
            </span>
          </div>
          {editing ? (
            <div className="space-y-2 mt-1">
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                maxLength={160}
                placeholder="Title"
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-[13px] focus:outline-none focus:border-primary"
              />
              <input
                type="url"
                value={editUrl}
                onChange={(e) => setEditUrl(e.target.value)}
                maxLength={500}
                placeholder="Link (optional)"
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-[12.5px] focus:outline-none focus:border-primary"
              />
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={4}
                maxLength={6000}
                placeholder="Content"
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-[13px] focus:outline-none focus:border-primary resize-y"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setEditing(false);
                    setEditTitle(post.title);
                    setEditContent(post.content || "");
                    setEditUrl(post.url || "");
                  }}
                  className="px-3 py-1.5 rounded-lg border border-border text-[12px] font-semibold text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={savingEdit}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-[12px] font-bold hover:bg-primary-dark disabled:opacity-60"
                >
                  {savingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  Save
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="text-[14.5px] font-semibold text-foreground leading-snug mb-1.5">
                {post.title}
              </div>
              {post.url && (
                <a
                  href={post.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="block text-[12.5px] text-primary underline break-all mb-2"
                >
                  {post.url}
                </a>
              )}
              {displayContent && (
                <pre className="whitespace-pre-wrap font-sans text-[13px] text-foreground/90 leading-relaxed mb-1">
                  {displayContent}
                </pre>
              )}
              {longContent && (
                <button
                  onClick={() => setExpanded((v) => !v)}
                  className="text-[12px] font-semibold text-primary hover:underline mb-1"
                >
                  {expanded ? "Show less" : "Read more"}
                </button>
              )}
            </>
          )}

          {/* Action bar */}
          <div className="flex items-center gap-1 mt-3 pt-3 border-t border-border">
            <button
              onClick={toggleComments}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-foreground hover:bg-muted transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              {post.comment_count} {post.comment_count === 1 ? "comment" : "comments"}
            </button>
            {isOwner && !editing && (
              <button
                onClick={() => setEditing(true)}
                className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </button>
            )}
            {isOwner && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className={`${editing ? "ml-auto" : ""} inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-60`}
              >
                {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                Delete
              </button>
            )}
          </div>


          {/* Inline comments */}
          {commentsOpen && (
            <div className="mt-3 space-y-3">
              {loadingComments ? (
                <div className="text-[12.5px] text-muted-foreground">Loading…</div>
              ) : comments.length === 0 ? (
                <div className="text-[12.5px] text-muted-foreground italic">
                  No comments yet. Be the first.
                </div>
              ) : (
                <>
                  {comments.length < totalComments && (
                    <button
                      type="button"
                      onClick={loadEarlierComments}
                      disabled={loadingMoreComments}
                      className="text-[12px] font-semibold text-primary hover:underline disabled:opacity-60"
                    >
                      {loadingMoreComments
                        ? "Loading…"
                        : `Load earlier comments (${totalComments - comments.length} more)`}
                    </button>
                  )}
                  {comments.map((c) => (
                  <div key={c.id} className="flex gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-primary-tint border border-primary-border flex items-center justify-center shrink-0">
                      {c.author?.avatar_url ? (
                        <img src={c.author.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <span className="text-[10px] font-bold text-primary">{initials(c.author?.full_name, "M")}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div
                        className={`rounded-2xl px-3 py-2 ${
                          c.is_expert
                            ? "bg-primary-tint/60 border border-primary-border"
                            : "bg-muted"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                          <span className="text-[12px] font-semibold text-foreground">
                            {c.author?.full_name || "Member"}
                          </span>
                          {c.is_expert && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[9px] font-bold uppercase tracking-wider">
                              <ShieldCheck className="w-2.5 h-2.5" /> Expert
                            </span>
                          )}
                        </div>
                        <div className="text-[12.5px] text-foreground whitespace-pre-wrap leading-relaxed">
                          {c.body}
                        </div>
                      </div>
                      <div className="text-[10.5px] text-muted-foreground mt-0.5 ml-1">
                        {timeAgo(c.created_at)}
                      </div>
                    </div>
                  </div>
                  ))}
                </>
              )}

              {/* Inline composer */}
              <div className="flex gap-2 pt-1">
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder={currentUserId ? "Write a comment…" : "Sign in to comment"}
                  rows={2}
                  maxLength={4000}
                  disabled={!currentUserId}
                  className="flex-1 px-3 py-2 rounded-xl border border-border bg-background text-[12.5px] focus:outline-none focus:border-primary resize-none disabled:opacity-60"
                />
                <button
                  onClick={submitComment}
                  disabled={posting || !currentUserId}
                  className="shrink-0 self-end inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-[12px] font-bold hover:bg-primary-dark disabled:opacity-60"
                >
                  {posting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Send
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Composer({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [kind, setKind] = useState<Kind>("LinkedIn");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Max 10MB.");
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Please sign in first.");
      return;
    }
    setUploadingFile(true);
    const ext = file.name.split(".").pop() || "pdf";
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
    const path = `${user.id}/feedback-${Date.now()}-${safe}`;
    const { error: upErr } = await supabase.storage
      .from("resource-files")
      .upload(path, file, { contentType: file.type || `application/${ext}`, upsert: false });
    if (upErr) {
      setUploadingFile(false);
      toast.error(upErr.message || "Couldn't upload file.");
      return;
    }
    const { data: pub } = supabase.storage.from("resource-files").getPublicUrl(path);
    setUrl(pub.publicUrl);
    setUploadedFileName(file.name);
    setUploadingFile(false);
    toast.success("File uploaded.");
    e.target.value = "";
  };

  const submit = async () => {
    if (!title.trim() || title.trim().length < 4) {
      toast.error("Give your post a short title (at least 4 characters).");
      return;
    }
    if (!url.trim() && !content.trim()) {
      toast.error("Paste a link, upload a file, or add the text you want feedback on.");
      return;
    }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Please sign in first.");
      setSaving(false);
      return;
    }
    const { error } = await supabase.from("feedback_posts").insert({
      user_id: user.id,
      kind,
      title: title.trim().slice(0, 160),
      content: content.trim().slice(0, 6000) || null,
      url: url.trim().slice(0, 500) || null,
    });
    setSaving(false);
    if (error) {
      console.error(error);
      toast.error(error.message || "Couldn't post. Try again.");
      return;
    }
    toast.success("Posted. Reviews will come in soon.");
    onCreated();
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-foreground/50 backdrop-blur-sm sm:p-4">
      <div className="bg-card w-full sm:max-w-xl sm:rounded-2xl rounded-t-2xl border border-border h-[92vh] sm:h-auto sm:max-h-[92vh] flex flex-col shadow-strong">

        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-[15px] font-bold text-foreground">Ask for feedback</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 sm:p-5 overflow-y-auto">
          <label className="block text-[11px] font-bold text-foreground uppercase tracking-wider mb-1.5">Type</label>
          <div className="flex flex-wrap gap-1.5 mb-4">
            {KINDS.map((k) => {
              const Icon = k.icon;
              const active = k.id === kind;
              return (
                <button
                  key={k.id}
                  onClick={() => setKind(k.id)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11.5px] font-semibold border ${
                    active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground/80 hover:border-primary/40"
                  }`}
                >
                  <Icon className="w-3 h-3" /> {k.label}
                </button>
              );
            })}
          </div>

          <label className="block text-[11px] font-bold text-foreground uppercase tracking-wider mb-1.5">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What do you want reviewed? e.g. 'Roast my LinkedIn headline'"
            maxLength={160}
            className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-[13.5px] focus:outline-none focus:border-primary mb-4"
          />

          <label className="block text-[11px] font-bold text-foreground uppercase tracking-wider mb-1.5">
            Link <span className="text-muted-foreground font-normal normal-case">(optional)</span>
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://linkedin.com/in/yourname"
            maxLength={500}
            className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-[13.5px] focus:outline-none focus:border-primary mb-4"
          />

          <label className="block text-[11px] font-bold text-foreground uppercase tracking-wider mb-1.5">Or paste the content</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={5}
            maxLength={6000}
            placeholder="Paste your bio, pitch, headline, summary, or anything you want feedback on…"
            className="w-full px-3.5 py-3 rounded-xl border border-border bg-background text-[13.5px] focus:outline-none focus:border-primary resize-y mb-1"
          />
          <div className="text-[10.5px] text-muted-foreground text-right mb-4">{content.length}/6000</div>

          <label className="block text-[11px] font-bold text-foreground uppercase tracking-wider mb-1.5">
            Attach a file <span className="text-muted-foreground font-normal normal-case">(PDF, DOCX, image — optional)</span>
          </label>
          <label className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-dashed border-border bg-background text-[12.5px] font-semibold text-foreground hover:border-primary cursor-pointer">
            {uploadingFile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
            {uploadedFileName ? uploadedFileName : "Choose file"}
            <input
              type="file"
              accept=".pdf,.docx,.doc,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*"
              className="hidden"
              onChange={handleFileUpload}
              disabled={uploadingFile}
            />
          </label>
          {uploadedFileName && (
            <button
              onClick={() => {
                setUrl("");
                setUploadedFileName(null);
              }}
              className="ml-2 text-[11.5px] text-muted-foreground hover:text-destructive underline"
            >
              Remove
            </button>
          )}
        </div>
        <div className="p-4 border-t border-border flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-border bg-card text-[12.5px] font-semibold text-foreground hover:bg-muted"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-[12.5px] font-bold hover:bg-primary-dark disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Post
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );

}
