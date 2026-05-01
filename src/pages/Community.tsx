import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import {
  Heart,
  MessageCircle,
  Pin,
  Lock,
  Image as ImageIcon,
  MoreHorizontal,
  Flag,
  Trash2,
  Plus,
  X,
  Type,
  BarChart3,
  HelpCircle,
  Trophy,
  Filter,
  Sparkles,
  Hash,
  Share2,
  Users,
  HandHelping,
  Briefcase,
} from "lucide-react";
import { openSignupModal } from "@/lib/signup-modal";

type Channel = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  admin_only_posting: boolean;
};

type Post = {
  id: string;
  channel_id: string;
  user_id: string;
  title: string | null;
  body: string;
  image_url: string | null;
  is_pinned: boolean;
  is_locked: boolean;
  reply_count: number;
  reaction_count: number;
  created_at: string;
  author_name?: string;
  author_avatar_url?: string;
  author_initial?: string;
  channel_name?: string;
  channel_slug?: string;
  liked?: boolean;
};

const ALL_TAB = "feed";

// Soft pastel colors for avatars (cycled by user_id hash)
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

function extractHashtags(text: string) {
  const tags = text.match(/#[A-Za-z0-9_]+/g) || [];
  return [...new Set(tags)].slice(0, 4);
}

export default function Community() {
  const navigate = useNavigate();
  const { channelSlug } = useParams();
  const { toast } = useToast();

  const [channels, setChannels] = useState<Channel[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [user, setUser] = useState<{ id: string; email?: string | null } | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeChannelId, setComposeChannelId] = useState<string | null>(null);
  const [composePrefill, setComposePrefill] = useState<string>("");

  const activeSlug = channelSlug || ALL_TAB;
  const activeChannel = useMemo(
    () => channels.find((c) => c.slug === activeSlug),
    [channels, activeSlug]
  );

  // Auth + profile
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const u = data.user;
      if (u) {
        setUser({ id: u.id, email: u.email });
        const [{ data: roleRow }, { data: profile }] = await Promise.all([
          supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", u.id)
            .eq("role", "admin")
            .maybeSingle(),
          supabase
            .from("profiles")
            .select("full_name, email")
            .eq("user_id", u.id)
            .maybeSingle(),
        ]);
        setIsAdmin(!!roleRow);
        setUserName(profile?.full_name || profile?.email?.split("@")[0] || "you");
      }
    });
  }, []);

  // Load channels
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("community_channels")
        .select("id, slug, name, description, icon, admin_only_posting")
        .eq("is_active", true)
        .order("position", { ascending: true });
      setChannels(data || []);
    })();
  }, []);

  // Load posts (filtered by channel or all)
  const loadPosts = async () => {
    if (channels.length === 0) return;
    setLoading(true);
    let query = supabase
      .from("community_posts")
      .select("*")
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50);
    if (activeChannel) query = query.eq("channel_id", activeChannel.id);

    const { data: postRows } = await query;
    const postList: Post[] = postRows || [];
    const userIds = [...new Set(postList.map((p) => p.user_id))];

    let nameMap = new Map<string, { name: string; avatar?: string | null }>();
    if (userIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, avatar_url")
        .in("user_id", userIds);
      nameMap = new Map(
        (profs || []).map((p: any) => [
          p.user_id,
          {
            name: p.full_name || p.email?.split("@")[0] || "Member",
            avatar: p.avatar_url,
          },
        ])
      );
    }

    let likedSet = new Set<string>();
    if (user && postList.length) {
      const { data: reactions } = await supabase
        .from("community_reactions")
        .select("post_id")
        .eq("user_id", user.id)
        .in("post_id", postList.map((p) => p.id));
      likedSet = new Set((reactions || []).map((r: any) => r.post_id));
    }

    const channelMap = new Map(channels.map((c) => [c.id, c]));
    setPosts(
      postList.map((p) => {
        const ch = channelMap.get(p.channel_id);
        const profile = nameMap.get(p.user_id);
        const author = (p as any).author_name || profile?.name || "Member";
        const avatar = (p as any).author_avatar_url || profile?.avatar || null;
        return {
          ...p,
          author_name: author,
          author_avatar_url: avatar || undefined,
          author_initial: author.charAt(0).toUpperCase(),
          channel_name: ch?.name,
          channel_slug: ch?.slug,
          liked: likedSet.has(p.id),
        };
      })
    );
    setLoading(false);
  };

  useEffect(() => {
    loadPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSlug, channels.length, user?.id]);

  const requireAuth = () => {
    if (!user) {
      openSignupModal({
        heading: "Join the community",
        subtext: "Sign up to like, reply and post.",
      });
      return false;
    }
    return true;
  };

  const openCompose = (preset?: { kind?: string }) => {
    if (!requireAuth()) return;
    // Pick channel: active one if posting allowed, otherwise default to first non-admin channel
    let target: Channel | undefined = activeChannel;
    if (!target || (target.admin_only_posting && !isAdmin)) {
      target = channels.find((c) => !c.admin_only_posting);
    }
    if (!target) {
      toast({
        title: "No channel available",
        description: "There's no open channel to post in right now.",
      });
      return;
    }
    setComposeChannelId(target.id);
    setComposePrefill(
      preset?.kind === "question"
        ? "Question: "
        : preset?.kind === "poll"
        ? "Poll: "
        : preset?.kind === "win"
        ? "Win: "
        : ""
    );
    setComposeOpen(true);
  };

  const toggleLike = async (post: Post) => {
    if (!requireAuth()) return;
    if (post.liked) {
      await supabase
        .from("community_reactions")
        .delete()
        .eq("user_id", user!.id)
        .eq("post_id", post.id)
        .eq("emoji", "❤️");
    } else {
      await supabase.from("community_reactions").insert({
        user_id: user!.id,
        post_id: post.id,
        emoji: "❤️",
      });
    }
    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? {
              ...p,
              liked: !p.liked,
              reaction_count: p.reaction_count + (p.liked ? -1 : 1),
            }
          : p
      )
    );
  };

  const deletePost = async (post: Post) => {
    if (!confirm("Delete this post?")) return;
    const { error } = await supabase.from("community_posts").delete().eq("id", post.id);
    if (error) {
      toast({ title: "Couldn't delete", description: error.message, variant: "destructive" });
      return;
    }
    setPosts((prev) => prev.filter((p) => p.id !== post.id));
  };

  const togglePin = async (post: Post) => {
    const { error } = await supabase
      .from("community_posts")
      .update({ is_pinned: !post.is_pinned })
      .eq("id", post.id);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
    loadPosts();
  };

  const toggleLock = async (post: Post) => {
    const { error } = await supabase
      .from("community_posts")
      .update({ is_locked: !post.is_locked })
      .eq("id", post.id);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
    loadPosts();
  };

  const reportPost = async (post: Post) => {
    if (!requireAuth()) return;
    const reason = prompt("Why are you reporting this post?");
    if (!reason) return;
    const { error } = await supabase.from("community_reports").insert({
      reporter_user_id: user!.id,
      post_id: post.id,
      reason,
    });
    if (error) {
      toast({ title: "Report failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Reported", description: "Our team will review it." });
  };

  // Trending hashtags from currently loaded posts
  const trendingTags = useMemo(() => {
    const counts = new Map<string, number>();
    posts.forEach((p) => {
      extractHashtags(`${p.title || ""} ${p.body}`).forEach((t) => {
        counts.set(t, (counts.get(t) || 0) + 1);
      });
    });
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag, count]) => ({ tag, count }));
  }, [posts]);

  // Top contributors from currently loaded posts
  const topContributors = useMemo(() => {
    const stats = new Map<string, { name: string; userId: string; pts: number }>();
    posts.forEach((p) => {
      const cur = stats.get(p.user_id) || {
        name: p.author_name || "Member",
        userId: p.user_id,
        pts: 0,
      };
      cur.pts += 10 + p.reaction_count * 2 + p.reply_count * 3 + (p.is_pinned ? 25 : 0);
      stats.set(p.user_id, cur);
    });
    return [...stats.values()].sort((a, b) => b.pts - a.pts).slice(0, 4);
  }, [posts]);

  const composeChannel = channels.find((c) => c.id === composeChannelId);

  const tabs: { slug: string; name: string }[] = [
    { slug: ALL_TAB, name: "Feed" },
    ...channels.map((c) => ({ slug: c.slug, name: c.name })),
  ];

  return (
    <div className="w-full animate-fade-in">
      {/* Header */}
      <div className="mb-4 sm:mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <p className="eyebrow mb-2">Community</p>
          <h1 className="headline text-[26px] sm:text-3xl md:text-4xl text-foreground leading-[1.15]">
            Connect, share & <em>grow together</em>
          </h1>
          <p className="text-[13px] sm:text-[14.5px] text-muted-foreground mt-2">
            Share wins, ask questions, and learn from Remote Workher members worldwide.
          </p>
        </div>
        <Button
          onClick={() => openCompose()}
          className="hidden md:inline-flex bg-primary hover:bg-primary/90 text-primary-foreground rounded-full h-10 px-5 shadow-[0_4px_14px_hsl(var(--primary)/0.35)]"
        >
          <Plus className="w-4 h-4 mr-1.5" /> Create Post
        </Button>
      </div>

        {/* Tabs */}
        <div className="flex items-center justify-between gap-3 border-b border-border mb-5 overflow-x-auto">
          <nav className="flex items-center gap-1 min-w-0">
            {tabs.map((t) => {
              const active = t.slug === activeSlug;
              return (
                <button
                  key={t.slug}
                  onClick={() =>
                    navigate(t.slug === ALL_TAB ? "/community" : `/community/${t.slug}`)
                  }
                  className={`shrink-0 px-3 md:px-4 py-3 text-[13.5px] font-medium border-b-2 -mb-px transition-colors ${
                    active
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.name}
                </button>
              );
            })}
          </nav>
          <button className="hidden md:inline-flex shrink-0 items-center gap-1.5 text-[12.5px] font-medium text-muted-foreground border border-border rounded-lg px-3 py-1.5 hover:text-foreground hover:border-foreground/20">
            <Filter className="w-3.5 h-3.5" />
            Filter
          </button>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] lg:grid-cols-[1fr_320px] gap-6">
          {/* Main feed */}
          <main className="min-w-0 space-y-4">
            {/* Composer */}
            <InlineComposer
              user={user}
              userName={userName}
              avatarColor={avatarColor}
              activeChannel={activeChannel}
              channels={channels}
              isAdmin={isAdmin}
              onRequireAuth={requireAuth}
              onPosted={loadPosts}
              onOpenAdvanced={(kind) => openCompose({ kind })}
            />

            {/* Posts */}
            {loading && (
              <div className="text-center py-10 text-sm text-muted-foreground">Loading…</div>
            )}
            {!loading && posts.length === 0 && (
              <Card className="p-10 text-center rounded-2xl">
                <div className="text-4xl mb-2">💬</div>
                <h3 className="font-semibold mb-1">No posts yet</h3>
                <p className="text-sm text-muted-foreground">
                  Be the first to start a conversation.
                </p>
              </Card>
            )}
            {posts.map((post) => {
              const tags = extractHashtags(`${post.title || ""} ${post.body}`);
              return (
                <Card
                  key={post.id}
                  className="p-5 rounded-2xl border-border/70 hover:border-primary/30 transition-colors cursor-pointer"
                  onClick={() => navigate(`/community/post/${post.id}`)}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {post.author_avatar_url ? (
                        <img
                          src={post.author_avatar_url}
                          alt={post.author_name || "Member"}
                          className="w-10 h-10 rounded-full object-cover bg-muted shrink-0"
                          loading="lazy"
                        />
                      ) : (
                        <div
                          className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarColor(
                            post.user_id
                          )} text-white flex items-center justify-center text-sm font-semibold shrink-0`}
                        >
                          {post.author_initial}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[14px] font-semibold text-foreground truncate">
                            {post.author_name}
                          </span>
                          {post.is_pinned && (
                            <Badge className="text-[10px] h-5 bg-primary/10 text-primary border-0 hover:bg-primary/10">
                              <Pin className="w-2.5 h-2.5 mr-1" /> Pinned
                            </Badge>
                          )}
                          {post.is_locked && (
                            <Badge variant="outline" className="text-[10px] h-5">
                              <Lock className="w-2.5 h-2.5 mr-1" /> Locked
                            </Badge>
                          )}
                        </div>
                        <div className="text-[11.5px] text-muted-foreground flex items-center gap-1.5">
                          <span>{timeAgo(post.created_at)}</span>
                          {post.channel_name && (
                            <>
                              <span>•</span>
                              <span>
                                in{" "}
                                <span className="text-foreground/70 font-medium">
                                  {post.channel_name}
                                </span>
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        {isAdmin && (
                          <>
                            <DropdownMenuItem onClick={() => togglePin(post)}>
                              <Pin className="w-4 h-4 mr-2" />
                              {post.is_pinned ? "Unpin" : "Pin"}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleLock(post)}>
                              <Lock className="w-4 h-4 mr-2" />
                              {post.is_locked ? "Unlock" : "Lock"}
                            </DropdownMenuItem>
                          </>
                        )}
                        {(isAdmin || user?.id === post.user_id) && (
                          <DropdownMenuItem
                            onClick={() => deletePost(post)}
                            className="text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        )}
                        {user?.id !== post.user_id && (
                          <DropdownMenuItem onClick={() => reportPost(post)}>
                            <Flag className="w-4 h-4 mr-2" /> Report
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Body */}
                  {post.title && (
                    <h3 className="font-semibold text-[16px] md:text-[17px] text-foreground mb-1.5 leading-snug">
                      {post.title}
                    </h3>
                  )}
                  <p className="text-[13.5px] text-foreground/85 whitespace-pre-wrap leading-relaxed line-clamp-4">
                    {post.body}
                  </p>
                  {post.image_url && (
                    <img
                      src={post.image_url}
                      alt=""
                      className="mt-3 max-h-80 w-full rounded-xl border border-border object-cover"
                      loading="lazy"
                    />
                  )}

                  {/* Tags */}
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {tags.map((t) => (
                        <span
                          key={t}
                          className="text-[11.5px] font-medium text-primary bg-primary/8 px-2 py-1 rounded-md"
                          style={{ backgroundColor: "hsl(var(--primary) / 0.08)" }}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/70">
                    <div className="flex items-center gap-2 min-w-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleLike(post);
                        }}
                        className={`flex items-center justify-center w-8 h-8 rounded-full transition-colors ${
                          post.liked
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground hover:text-foreground"
                        }`}
                        aria-label="Like"
                      >
                        <Heart className={`w-4 h-4 ${post.liked ? "fill-current" : ""}`} />
                      </button>
                      <span className="text-[12px] text-muted-foreground truncate">
                        {post.reaction_count > 0
                          ? `${post.liked ? "You" : ""}${
                              post.liked && post.reaction_count > 1 ? " and " : ""
                            }${
                              post.reaction_count - (post.liked ? 1 : 0) > 0
                                ? `${post.reaction_count - (post.liked ? 1 : 0)} other${
                                    post.reaction_count - (post.liked ? 1 : 0) === 1 ? "" : "s"
                                  }`
                                : ""
                            }`
                          : "Be the first to react"}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/community/post/${post.id}`);
                        }}
                        className="flex items-center gap-1.5 text-[12.5px] font-medium text-muted-foreground hover:text-foreground"
                      >
                        <MessageCircle className="w-4 h-4" />
                        {post.reply_count} {post.reply_count === 1 ? "Comment" : "Comments"}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const url = `${window.location.origin}/community/post/${post.id}`;
                          navigator.clipboard.writeText(url);
                          toast({ title: "Link copied" });
                        }}
                        className="flex items-center gap-1.5 text-[12.5px] font-medium text-muted-foreground hover:text-foreground"
                      >
                        <Share2 className="w-4 h-4" />
                        Share
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </main>

          {/* Right rail */}
          <aside className="space-y-4 md:sticky md:top-4 md:self-start">
            {/* Community Highlights — channels */}
            <Card className="p-4 rounded-2xl border-border/70">
              <h3 className="font-semibold text-[14px] text-foreground mb-3">
                Community Highlights
              </h3>
              <div className="space-y-2.5">
                {channels.slice(0, 5).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => navigate(`/community/${c.slug}`)}
                    className="w-full flex items-center gap-3 text-left group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-lg shrink-0 group-hover:bg-primary/10 transition-colors">
                      {c.icon || "#"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold text-foreground truncate group-hover:text-primary">
                        {c.name}
                      </div>
                      <div className="text-[11.5px] text-muted-foreground truncate">
                        {c.description || "Tap to explore"}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </Card>

            {/* Trending Topics */}
            <Card className="p-4 rounded-2xl border-border/70">
              <h3 className="font-semibold text-[14px] text-foreground mb-3">
                Trending Topics
              </h3>
              {trendingTags.length > 0 ? (
                <div className="space-y-2">
                  {trendingTags.map(({ tag, count }) => (
                    <div
                      key={tag}
                      className="flex items-center justify-between text-[13px]"
                    >
                      <div className="flex items-center gap-1.5 min-w-0 text-foreground/80">
                        <Hash className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate">{tag.replace("#", "")}</span>
                      </div>
                      <span className="text-[11.5px] text-muted-foreground shrink-0">
                        {count} {count === 1 ? "post" : "posts"}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[12px] text-muted-foreground">
                  No trends yet. Use #hashtags in your posts to start one.
                </p>
              )}
            </Card>

            {/* Top Contributors */}
            <Card className="p-4 rounded-2xl border-border/70">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-[14px] text-foreground">Top Contributors</h3>
                <span className="text-[11px] text-muted-foreground">This Month</span>
              </div>
              {topContributors.length > 0 ? (
                <div className="space-y-3">
                  {topContributors.map((c, i) => (
                    <div key={c.userId} className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarColor(
                          c.userId
                        )} text-white flex items-center justify-center text-xs font-semibold shrink-0`}
                      >
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-semibold text-foreground truncate">
                          {c.name}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          @{c.name.toLowerCase().replace(/\s+/g, "_")}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-[12px] font-semibold text-foreground/80 shrink-0">
                        {c.pts} <span className="text-[10px] text-muted-foreground">pts</span>
                        <Trophy className={`w-3.5 h-3.5 ${i === 0 ? "text-amber-500" : "text-muted-foreground/50"}`} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[12px] text-muted-foreground">
                  Be the first to post and climb the leaderboard.
                </p>
              )}
            </Card>
          </aside>
        </div>

      {/* Mobile FAB */}
      <button
        onClick={() => openCompose()}
        className="md:hidden fixed bottom-20 right-4 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center z-40"
        aria-label="Create post"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Compose dialog */}
      {composeChannel && user && (
        <ComposePostDialog
          open={composeOpen}
          onOpenChange={setComposeOpen}
          channel={composeChannel}
          channels={channels.filter((c) => !c.admin_only_posting || isAdmin)}
          onChannelChange={(id) => setComposeChannelId(id)}
          userId={user.id}
          prefill={composePrefill}
          onPosted={() => {
            setComposeOpen(false);
            loadPosts();
          }}
        />
      )}
    </div>
  );
}

function ComposerAction({
  icon,
  label,
  color,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-muted text-[13px] font-medium text-foreground/80 transition-colors"
    >
      <span className={color}>{icon}</span>
      {label}
    </button>
  );
}

function ComposePostDialog({
  open,
  onOpenChange,
  channel,
  channels,
  onChannelChange,
  userId,
  prefill,
  onPosted,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  channel: Channel;
  channels: Channel[];
  onChannelChange: (id: string) => void;
  userId: string;
  prefill: string;
  onPosted: () => void;
}) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTitle(prefill || "");
      setBody("");
      setImageFile(null);
      setImagePreview(null);
    }
  }, [open, prefill]);

  const handleFile = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Image too large", description: "Max 5MB.", variant: "destructive" });
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const submit = async () => {
    if (!body.trim()) {
      toast({
        title: "Write something",
        description: "Body can't be empty.",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    try {
      let image_url: string | null = null;
      if (imageFile) {
        const ext = imageFile.name.split(".").pop() || "jpg";
        const path = `${userId}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("community-images")
          .upload(path, imageFile, { contentType: imageFile.type });
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from("community-images").getPublicUrl(path);
        image_url = urlData.publicUrl;
      }
      const { error } = await supabase.from("community_posts").insert({
        channel_id: channel.id,
        user_id: userId,
        title: title.trim() || null,
        body: body.trim(),
        image_url,
      });
      if (error) throw error;
      toast({ title: "Posted!" });
      onPosted();
    } catch (err: any) {
      toast({ title: "Couldn't post", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create a post</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {channels.length > 1 && (
            <select
              value={channel.id}
              onChange={(e) => onChannelChange(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
            >
              {channels.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
          )}
          <Input
            placeholder="Title (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
          />
          <Textarea
            placeholder="Share an update, ask a question… use #hashtags to tag your post"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={6}
            maxLength={4000}
          />
          {imagePreview && (
            <div className="relative">
              <img
                src={imagePreview}
                alt=""
                className="rounded-lg max-h-60 w-full object-cover border border-border"
              />
              <Button
                type="button"
                size="icon"
                variant="secondary"
                className="absolute top-2 right-2 h-7 w-7"
                onClick={() => {
                  setImageFile(null);
                  setImagePreview(null);
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => fileRef.current?.click()}
          >
            <ImageIcon className="w-4 h-4 mr-1.5" />
            {imageFile ? "Change image" : "Add image"}
          </Button>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={submitting}
            className="bg-primary text-primary-foreground"
          >
            {submitting ? "Posting…" : "Post"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InlineComposer({
  user,
  userName,
  avatarColor,
  activeChannel,
  channels,
  isAdmin,
  onRequireAuth,
  onPosted,
  onOpenAdvanced,
}: {
  user: { id: string; email?: string | null } | null;
  userName: string;
  avatarColor: (seed: string) => string;
  activeChannel: Channel | undefined;
  channels: Channel[];
  isAdmin: boolean;
  onRequireAuth: () => boolean;
  onPosted: () => void;
  onOpenAdvanced: (kind: string) => void;
}) {
  const { toast } = useToast();
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [focused, setFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-grow
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 240) + "px";
  }, [body]);

  const resolveTargetChannel = (): Channel | undefined => {
    let target: Channel | undefined = activeChannel;
    if (!target || (target.admin_only_posting && !isAdmin)) {
      target = channels.find((c) => !c.admin_only_posting);
    }
    return target;
  };

  const submit = async () => {
    if (!onRequireAuth()) return;
    if (!body.trim()) return;
    const target = resolveTargetChannel();
    if (!target) {
      toast({ title: "No channel available", description: "There's no open channel to post in." });
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("community_posts").insert({
        channel_id: target.id,
        user_id: user!.id,
        title: null,
        body: body.trim(),
        image_url: null,
      });
      if (error) throw error;
      setBody("");
      setFocused(false);
      toast({ title: "Posted!" });
      onPosted();
    } catch (err: any) {
      toast({ title: "Couldn't post", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      submit();
    }
  };

  return (
    <Card className="p-4 rounded-2xl border-border/70">
      <div className="flex items-start gap-3">
        <div
          className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarColor(
            user?.id || "guest"
          )} text-white flex items-center justify-center text-sm font-semibold shrink-0`}
        >
          {(userName || "G").charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <textarea
            ref={textareaRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onFocus={() => {
              if (!user) {
                onRequireAuth();
                return;
              }
              setFocused(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder={`What's on your mind${userName ? `, ${userName.split(" ")[0]}` : ""}?`}
            rows={1}
            className="w-full resize-none bg-muted/60 focus:bg-muted rounded-2xl px-4 py-2.5 text-[14px] text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-colors leading-relaxed"
          />
          {(focused || body.trim().length > 0) && (
            <div className="mt-2 flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setBody("");
                  setFocused(false);
                }}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={submit}
                disabled={submitting || !body.trim()}
                className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-5"
              >
                {submitting ? "Posting…" : "Post"}
              </Button>
            </div>
          )}
        </div>
      </div>
      <div className="grid grid-cols-4 gap-1 mt-3 pt-3 border-t border-border/70">
        <ComposerAction icon={<ImageIcon className="w-4 h-4" />} label="Photo" color="text-emerald-500" onClick={() => onOpenAdvanced("text")} />
        <ComposerAction icon={<BarChart3 className="w-4 h-4" />} label="Poll" color="text-violet-500" onClick={() => onOpenAdvanced("poll")} />
        <ComposerAction icon={<HelpCircle className="w-4 h-4" />} label="Question" color="text-sky-500" onClick={() => onOpenAdvanced("question")} />
        <ComposerAction icon={<Trophy className="w-4 h-4" />} label="Share Win" color="text-amber-500" onClick={() => onOpenAdvanced("win")} />
      </div>
    </Card>
  );
}
