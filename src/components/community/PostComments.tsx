import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Heart, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { openSignupModal } from "@/lib/signup-modal";

type Reply = {
  id: string;
  post_id: string;
  user_id: string;
  body: string;
  created_at: string;
  author_name?: string;
  author_avatar_url?: string | null;
  reaction_count: number;
  liked?: boolean;
};

const AVATAR_COLORS = [
  "from-pink-400 to-rose-500",
  "from-violet-400 to-purple-500",
  "from-amber-400 to-orange-500",
  "from-emerald-400 to-teal-500",
  "from-sky-400 to-blue-500",
  "from-fuchsia-400 to-pink-500",
];
function avatarColor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

type Props = {
  postId: string;
  postLocked: boolean;
  user: { id: string } | null;
  isAdmin: boolean;
  onCountChange?: (delta: number) => void;
};

export default function PostComments({ postId, postLocked, user, isAdmin, onCountChange }: Props) {
  const { toast } = useToast();
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: rows } = await supabase
        .from("community_replies")
        .select("*")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });

      const list: Reply[] = (rows as any) || [];
      const userIds = [...new Set(list.map((r) => r.user_id))];

      let nameMap = new Map<string, { name: string; avatar?: string | null }>();
      if (userIds.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, full_name, email, avatar_url")
          .in("user_id", userIds);
        nameMap = new Map(
          (profs || []).map((p: any) => [
            p.user_id,
            { name: p.full_name || p.email?.split("@")[0] || "Member", avatar: p.avatar_url },
          ])
        );
      }

      let likedIds = new Set<string>();
      if (user && list.length) {
        const { data: reactions } = await supabase
          .from("community_reactions")
          .select("reply_id")
          .eq("user_id", user.id)
          .in("reply_id", list.map((r) => r.id));
        likedIds = new Set((reactions || []).map((r: any) => r.reply_id).filter(Boolean));
      }

      if (cancelled) return;
      setReplies(
        list.map((r) => ({
          ...r,
          author_name:
            (r as any).author_name || nameMap.get(r.user_id)?.name || "Member",
          author_avatar_url:
            (r as any).author_avatar_url || nameMap.get(r.user_id)?.avatar,
          liked: likedIds.has(r.id),
        }))
      );
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [postId, user?.id]);

  const requireAuth = () => {
    if (!user) {
      openSignupModal({ heading: "Join the community", subtext: "Sign up to comment." });
      return false;
    }
    return true;
  };

  const submit = async () => {
    if (!requireAuth()) return;
    const trimmed = body.trim();
    if (!trimmed) return;
    setSubmitting(true);
    const { data, error } = await supabase
      .from("community_replies")
      .insert({ post_id: postId, user_id: user!.id, body: trimmed })
      .select("*")
      .single();
    setSubmitting(false);
    if (error || !data) {
      toast({ title: "Couldn't comment", description: error?.message, variant: "destructive" });
      return;
    }
    const { data: prof } = await supabase
      .from("profiles")
      .select("full_name, email, avatar_url")
      .eq("user_id", user!.id)
      .maybeSingle();
    const author = prof?.full_name || prof?.email?.split("@")[0] || "Member";
    setReplies((prev) => [
      ...prev,
      { ...(data as any), author_name: author, author_avatar_url: prof?.avatar_url, liked: false },
    ]);
    setBody("");
    onCountChange?.(1);
  };

  const toggleLike = async (r: Reply) => {
    if (!requireAuth()) return;
    if (r.liked) {
      await supabase
        .from("community_reactions")
        .delete()
        .eq("user_id", user!.id)
        .eq("reply_id", r.id)
        .eq("emoji", "❤️");
    } else {
      await supabase
        .from("community_reactions")
        .insert({ user_id: user!.id, reply_id: r.id, emoji: "❤️" });
    }
    setReplies((prev) =>
      prev.map((x) =>
        x.id === r.id
          ? { ...x, liked: !x.liked, reaction_count: x.reaction_count + (x.liked ? -1 : 1) }
          : x
      )
    );
  };

  const remove = async (r: Reply) => {
    if (!confirm("Delete this comment?")) return;
    const { error } = await supabase.from("community_replies").delete().eq("id", r.id);
    if (error) {
      toast({ title: "Couldn't delete", description: error.message, variant: "destructive" });
      return;
    }
    setReplies((prev) => prev.filter((x) => x.id !== r.id));
    onCountChange?.(-1);
  };

  return (
    <div className="mt-4 pt-4 border-t border-border/70 space-y-3" onClick={(e) => e.stopPropagation()}>
      {/* Composer */}
      {!postLocked && (
        <div className="flex gap-2">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={user ? "Write a comment…" : "Sign up to comment"}
            className="min-h-[44px] max-h-32 text-[13.5px] resize-none rounded-xl bg-muted/40 border-border/70"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                submit();
              }
            }}
          />
          <Button
            onClick={submit}
            disabled={!body.trim() || submitting}
            className="rounded-full h-10 px-4 self-end bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Post
          </Button>
        </div>
      )}

      {/* Replies */}
      {loading ? (
        <div className="text-[12px] text-muted-foreground">Loading comments…</div>
      ) : replies.length === 0 ? (
        <div className="text-[12.5px] text-muted-foreground">No comments yet — start the conversation.</div>
      ) : (
        <div className="space-y-3">
          {replies.map((r) => (
            <div key={r.id} className="flex items-start gap-2.5">
              {r.author_avatar_url ? (
                <img
                  src={r.author_avatar_url}
                  alt={r.author_name}
                  className="w-8 h-8 rounded-full object-cover bg-muted shrink-0"
                  loading="lazy"
                />
              ) : (
                <div
                  className={`w-8 h-8 rounded-full bg-gradient-to-br ${avatarColor(
                    r.user_id
                  )} text-white flex items-center justify-center text-[11px] font-semibold shrink-0`}
                >
                  {(r.author_name || "M").charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="bg-muted/50 rounded-2xl px-3 py-2">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[12.5px] font-semibold text-foreground truncate">
                      {r.author_name}
                    </span>
                    <span className="text-[10.5px] text-muted-foreground">{timeAgo(r.created_at)}</span>
                  </div>
                  <p className="text-[13px] text-foreground/90 whitespace-pre-wrap leading-relaxed">
                    {r.body}
                  </p>
                </div>
                <div className="flex items-center gap-3 mt-1 ml-1">
                  <button
                    onClick={() => toggleLike(r)}
                    className={`flex items-center gap-1 text-[11.5px] font-medium ${
                      r.liked ? "text-primary" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${r.liked ? "fill-current" : ""}`} />
                    {r.reaction_count > 0 && <span>{r.reaction_count}</span>}
                    <span>Like</span>
                  </button>
                  {(isAdmin || user?.id === r.user_id) && (
                    <button
                      onClick={() => remove(r)}
                      className="flex items-center gap-1 text-[11.5px] font-medium text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
