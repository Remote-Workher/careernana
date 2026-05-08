import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Heart, Lock, Pin, Send, Trash2, Flag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { openSignupModal } from "@/lib/signup-modal";
import { useSEO } from "@/components/SEO";


type Reply = {
  id: string;
  user_id: string;
  body: string;
  reaction_count: number;
  created_at: string;
  author_name?: string;
  liked?: boolean;
};

function timeAgo(iso: string) {
  useSEO({ title: "Community Post" });
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return new Date(iso).toLocaleDateString();
}

export default function CommunityPost() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [post, setPost] = useState<any>(null);
  const [author, setAuthor] = useState<string>("Member");
  const [channel, setChannel] = useState<any>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [postLiked, setPostLiked] = useState(false);
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        setUser({ id: data.user.id });
        const { data: roleRow } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.user.id)
          .eq("role", "admin")
          .maybeSingle();
        setIsAdmin(!!roleRow);
      }
    });
  }, []);

  const load = async () => {
    if (!id) return;
    const { data: postRow } = await supabase
      .from("community_posts")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (!postRow) {
      setPost(null);
      return;
    }
    setPost(postRow);

    const [{ data: prof }, { data: ch }, { data: replyRows }] = await Promise.all([
      supabase.from("profiles").select("full_name, email").eq("user_id", postRow.user_id).maybeSingle(),
      supabase.from("community_channels").select("name, slug, icon").eq("id", postRow.channel_id).maybeSingle(),
      supabase
        .from("community_replies")
        .select("*")
        .eq("post_id", id)
        .order("created_at", { ascending: true }),
    ]);
    setAuthor((prof as any)?.full_name || (prof as any)?.email?.split("@")[0] || "Member");
    setChannel(ch);

    const replyList: Reply[] = replyRows || [];
    const userIds = [...new Set(replyList.map((r) => r.user_id))];
    let nameMap = new Map<string, string>();
    if (userIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", userIds);
      nameMap = new Map(
        (profs || []).map((p: any) => [p.user_id, p.full_name || p.email?.split("@")[0] || "Member"])
      );
    }

    let likedReplyIds = new Set<string>();
    let likedPost = false;
    if (user) {
      const { data: rxns } = await supabase
        .from("community_reactions")
        .select("post_id, reply_id")
        .eq("user_id", user.id)
        .or(`post_id.eq.${id},reply_id.in.(${replyList.map((r) => r.id).join(",") || "00000000-0000-0000-0000-000000000000"})`);
      (rxns || []).forEach((r: any) => {
        if (r.post_id === id) likedPost = true;
        if (r.reply_id) likedReplyIds.add(r.reply_id);
      });
    }
    setPostLiked(likedPost);
    setReplies(
      replyList.map((r) => ({
        ...r,
        author_name: nameMap.get(r.user_id) || "Member",
        liked: likedReplyIds.has(r.id),
      }))
    );
  };

  useEffect(() => {
    load();
  }, [id, user?.id]);

  const requireAuth = () => {
    if (!user) {
      openSignupModal({ heading: "Join the community", subtext: "Sign up to like and reply." });
      return false;
    }
    return true;
  };

  const togglePostLike = async () => {
    if (!requireAuth() || !post) return;
    if (postLiked) {
      await supabase
        .from("community_reactions")
        .delete()
        .eq("user_id", user!.id)
        .eq("post_id", post.id)
        .eq("emoji", "❤️");
      setPost({ ...post, reaction_count: Math.max(post.reaction_count - 1, 0) });
    } else {
      await supabase
        .from("community_reactions")
        .insert({ user_id: user!.id, post_id: post.id, emoji: "❤️" });
      setPost({ ...post, reaction_count: post.reaction_count + 1 });
    }
    setPostLiked(!postLiked);
  };

  const toggleReplyLike = async (reply: Reply) => {
    if (!requireAuth()) return;
    if (reply.liked) {
      await supabase
        .from("community_reactions")
        .delete()
        .eq("user_id", user!.id)
        .eq("reply_id", reply.id)
        .eq("emoji", "❤️");
    } else {
      await supabase
        .from("community_reactions")
        .insert({ user_id: user!.id, reply_id: reply.id, emoji: "❤️" });
    }
    setReplies((prev) =>
      prev.map((r) =>
        r.id === reply.id
          ? { ...r, liked: !r.liked, reaction_count: r.reaction_count + (r.liked ? -1 : 1) }
          : r
      )
    );
  };

  const submitReply = async () => {
    if (!requireAuth() || !post) return;
    if (!draft.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from("community_replies").insert({
      post_id: post.id,
      user_id: user!.id,
      body: draft.trim(),
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Couldn't reply", description: error.message, variant: "destructive" });
      return;
    }
    setDraft("");
    load();
  };

  const deleteReply = async (replyId: string) => {
    if (!confirm("Delete this reply?")) return;
    const { error } = await supabase.from("community_replies").delete().eq("id", replyId);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    setReplies((prev) => prev.filter((r) => r.id !== replyId));
  };

  const reportReply = async (replyId: string) => {
    if (!requireAuth()) return;
    const reason = prompt("Why are you reporting this reply?");
    if (!reason) return;
    const { error } = await supabase
      .from("community_reports")
      .insert({ reporter_user_id: user!.id, reply_id: replyId, reason });
    if (error) {
      toast({ title: "Report failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Reported", description: "Our team will review it." });
  };

  if (!post) {
    return (
      <div className="min-h-screen bg-[#F0EBE8] flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <h2 className="font-semibold mb-1">Post not found</h2>
          <Button variant="link" onClick={() => navigate("/community")}>
            Back to community
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0EBE8]">
      <div className="max-w-3xl mx-auto px-3 md:px-6 py-4 md:py-6">
        <button
          onClick={() => navigate(channel ? `/community/${channel.slug}` : "/community")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          {channel ? `${channel.icon} ${channel.name}` : "Community"}
        </button>

        <Card className="p-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-purple-500 text-primary-foreground flex items-center justify-center text-sm font-bold">
                {author.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="text-sm font-semibold">{author}</div>
                <div className="text-[11px] text-muted-foreground">{timeAgo(post.created_at)} ago</div>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {post.is_pinned && (
                <Badge variant="secondary" className="text-[10px]">
                  <Pin className="w-3 h-3 mr-1" />
                  Pinned
                </Badge>
              )}
              {post.is_locked && (
                <Badge variant="outline" className="text-[10px]">
                  <Lock className="w-3 h-3 mr-1" />
                  Locked
                </Badge>
              )}
            </div>
          </div>

          {post.title && <h1 className="font-serif text-2xl mb-2">{post.title}</h1>}
          <p className="text-sm whitespace-pre-wrap text-foreground/85">{post.body}</p>
          {post.image_url && (
            <img
              src={post.image_url}
              alt=""
              className="mt-4 rounded-lg max-h-[480px] w-full object-cover border border-border"
            />
          )}

          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border">
            <button
              onClick={togglePostLike}
              className={`flex items-center gap-1.5 text-sm font-medium ${
                postLiked ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Heart className={`w-4 h-4 ${postLiked ? "fill-current" : ""}`} />
              {post.reaction_count}
            </button>
            <span className="text-sm text-muted-foreground">
              {post.reply_count} {post.reply_count === 1 ? "reply" : "replies"}
            </span>
          </div>
        </Card>

        {/* Replies */}
        <div className="mt-5 space-y-3">
          {replies.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex items-start justify-between gap-3 mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                    {(r.author_name || "M").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-xs font-semibold">{r.author_name}</div>
                    <div className="text-[10px] text-muted-foreground">{timeAgo(r.created_at)} ago</div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {(isAdmin || user?.id === r.user_id) && (
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteReply(r.id)}>
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  )}
                  {user?.id !== r.user_id && (
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => reportReply(r.id)}>
                      <Flag className="w-3.5 h-3.5 text-muted-foreground" />
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-sm whitespace-pre-wrap text-foreground/85 ml-9">{r.body}</p>
              <button
                onClick={() => toggleReplyLike(r)}
                className={`ml-9 mt-2 flex items-center gap-1 text-[11px] font-medium ${
                  r.liked ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Heart className={`w-3 h-3 ${r.liked ? "fill-current" : ""}`} />
                {r.reaction_count}
              </button>
            </Card>
          ))}
          {replies.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-6">
              No replies yet — be the first to chime in.
            </div>
          )}
        </div>

        {/* Compose reply */}
        {!post.is_locked ? (
          <Card className="p-3 mt-5 sticky bottom-3 shadow-lg">
            <div className="flex gap-2">
              <Textarea
                placeholder=""
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={2}
                className="resize-none"
                onClick={() => {
                  if (!user) requireAuth();
                }}
                readOnly={!user}
              />
              <Button
                onClick={submitReply}
                disabled={submitting || !draft.trim()}
                className="bg-primary text-primary-foreground self-end"
                size="sm"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="p-4 mt-5 text-center text-sm text-muted-foreground">
            <Lock className="w-4 h-4 inline mr-1" />
            This post is locked. Replies are disabled.
          </Card>
        )}
      </div>
    </div>
  );
}
