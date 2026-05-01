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
  liked?: boolean;
};

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 604800) return `${Math.floor(s / 86400)}d`;
  return new Date(iso).toLocaleDateString();
}

export default function Community() {
  const navigate = useNavigate();
  const { channelSlug } = useParams();
  const { toast } = useToast();

  const [channels, setChannels] = useState<Channel[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [user, setUser] = useState<{ id: string; email?: string | null } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [composeOpen, setComposeOpen] = useState(false);

  const activeChannel = useMemo(
    () => channels.find((c) => c.slug === (channelSlug || "announcements")) || channels[0],
    [channels, channelSlug]
  );

  // Auth
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const u = data.user;
      if (u) {
        setUser({ id: u.id, email: u.email });
        const { data: roleRow } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", u.id)
          .eq("role", "admin")
          .maybeSingle();
        setIsAdmin(!!roleRow);
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
      // If no slug, default to first
      if (!channelSlug && data?.[0]) {
        navigate(`/community/${data[0].slug}`, { replace: true });
      }
    })();
  }, []);

  // Load posts for active channel
  const loadPosts = async () => {
    if (!activeChannel) return;
    setLoading(true);
    const { data: postRows } = await supabase
      .from("community_posts")
      .select("*")
      .eq("channel_id", activeChannel.id)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50);

    const postList: Post[] = postRows || [];
    const userIds = [...new Set(postList.map((p) => p.user_id))];

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

    let likedSet = new Set<string>();
    if (user && postList.length) {
      const { data: reactions } = await supabase
        .from("community_reactions")
        .select("post_id")
        .eq("user_id", user.id)
        .in("post_id", postList.map((p) => p.id));
      likedSet = new Set((reactions || []).map((r: any) => r.post_id));
    }

    setPosts(
      postList.map((p) => ({
        ...p,
        author_name: nameMap.get(p.user_id) || "Member",
        liked: likedSet.has(p.id),
      }))
    );
    setLoading(false);
  };

  useEffect(() => {
    if (activeChannel) loadPosts();
  }, [activeChannel?.id, user?.id]);

  const requireAuth = (action: string) => {
    if (!user) {
      openSignupModal({ trigger: action });
      return false;
    }
    return true;
  };

  const toggleLike = async (post: Post) => {
    if (!requireAuth("like_post")) return;
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
          ? { ...p, liked: !p.liked, reaction_count: p.reaction_count + (p.liked ? -1 : 1) }
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
    if (!requireAuth("report_post")) return;
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

  const canPostInActive =
    !!user && (!activeChannel?.admin_only_posting || isAdmin);

  return (
    <div className="min-h-screen bg-[#F0EBE8]">
      <div className="max-w-7xl mx-auto px-3 md:px-6 py-4 md:py-6">
        {/* Header */}
        <div className="mb-5">
          <h1 className="font-serif text-3xl md:text-4xl text-[#1A1A1A]">Community</h1>
          <p className="text-sm text-[#717171] mt-1">
            Ask questions, share wins, and get the latest updates from Remote Workher.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-5">
          {/* Channels rail */}
          <aside className="lg:sticky lg:top-4 lg:self-start">
            <Card className="p-2 bg-card">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-2 py-2">
                Channels
              </div>
              <nav className="flex lg:block gap-1 overflow-x-auto lg:overflow-visible -mx-1 px-1">
                {channels.map((c) => {
                  const active = activeChannel?.id === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => navigate(`/community/${c.slug}`)}
                      className={`shrink-0 lg:w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] text-left transition-colors ${
                        active
                          ? "bg-primary/10 text-primary font-semibold"
                          : "text-foreground/80 hover:bg-muted"
                      }`}
                    >
                      <span className="text-base">{c.icon || "#"}</span>
                      <span className="truncate">{c.name}</span>
                      {c.admin_only_posting && (
                        <Lock className="w-3 h-3 ml-auto text-muted-foreground hidden lg:inline" />
                      )}
                    </button>
                  );
                })}
              </nav>
            </Card>
          </aside>

          {/* Feed */}
          <main className="min-w-0">
            {/* Channel header / compose */}
            {activeChannel && (
              <Card className="p-4 mb-4 flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{activeChannel.icon}</span>
                    <h2 className="font-semibold text-lg">{activeChannel.name}</h2>
                    {activeChannel.admin_only_posting && (
                      <Badge variant="secondary" className="text-[10px]">
                        <Lock className="w-3 h-3 mr-1" /> Admin posts only
                      </Badge>
                    )}
                  </div>
                  {activeChannel.description && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {activeChannel.description}
                    </p>
                  )}
                </div>
                <Button
                  onClick={() => {
                    if (!requireAuth("create_post")) return;
                    if (!canPostInActive) {
                      toast({
                        title: "Admin-only channel",
                        description: "Only the Remote Workher team can post here.",
                      });
                      return;
                    }
                    setComposeOpen(true);
                  }}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-1.5" /> New post
                </Button>
              </Card>
            )}

            {/* Posts */}
            <div className="space-y-3">
              {loading && (
                <div className="text-center py-10 text-sm text-muted-foreground">Loading…</div>
              )}
              {!loading && posts.length === 0 && (
                <Card className="p-8 text-center">
                  <div className="text-4xl mb-2">{activeChannel?.icon || "💬"}</div>
                  <h3 className="font-semibold mb-1">No posts yet</h3>
                  <p className="text-sm text-muted-foreground">
                    {canPostInActive
                      ? "Be the first to start a conversation."
                      : "Check back soon for updates from the team."}
                  </p>
                </Card>
              )}
              {posts.map((post) => (
                <Card
                  key={post.id}
                  className="p-4 hover:border-primary/30 transition-colors cursor-pointer"
                  onClick={() => navigate(`/community/post/${post.id}`)}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-purple-500 text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
                        {(post.author_name || "M").charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate">{post.author_name}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {timeAgo(post.created_at)} ago
                        </div>
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
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          asChild
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          onClick={(e) => e.stopPropagation()}
                        >
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
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          )}
                          {user?.id !== post.user_id && (
                            <DropdownMenuItem onClick={() => reportPost(post)}>
                              <Flag className="w-4 h-4 mr-2" />
                              Report
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {post.title && (
                    <h3 className="font-semibold text-base mb-1.5">{post.title}</h3>
                  )}
                  <p className="text-sm text-foreground/85 whitespace-pre-wrap line-clamp-4">
                    {post.body}
                  </p>
                  {post.image_url && (
                    <img
                      src={post.image_url}
                      alt=""
                      className="mt-3 max-h-72 rounded-lg border border-border object-cover"
                      loading="lazy"
                    />
                  )}

                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLike(post);
                      }}
                      className={`flex items-center gap-1.5 text-xs font-medium ${
                        post.liked ? "text-primary" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${post.liked ? "fill-current" : ""}`} />
                      {post.reaction_count}
                    </button>
                    <button className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
                      <MessageCircle className="w-4 h-4" />
                      {post.reply_count}
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          </main>
        </div>
      </div>

      {/* Compose dialog */}
      {activeChannel && user && (
        <ComposePostDialog
          open={composeOpen}
          onOpenChange={setComposeOpen}
          channel={activeChannel}
          userId={user.id}
          onPosted={() => {
            setComposeOpen(false);
            loadPosts();
          }}
        />
      )}
    </div>
  );
}

function ComposePostDialog({
  open,
  onOpenChange,
  channel,
  userId,
  onPosted,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  channel: Channel;
  userId: string;
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
    if (!open) {
      setTitle("");
      setBody("");
      setImageFile(null);
      setImagePreview(null);
    }
  }, [open]);

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
      toast({ title: "Write something", description: "Body can't be empty.", variant: "destructive" });
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
          <DialogTitle>
            New post in {channel.icon} {channel.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            placeholder="Title (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
          />
          <Textarea
            placeholder="Share an update, ask a question…"
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
          <Button onClick={submit} disabled={submitting} className="bg-primary text-primary-foreground">
            {submitting ? "Posting…" : "Post"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
