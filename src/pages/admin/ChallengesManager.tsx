import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Pencil,
  Trash2,
  Star,
  Users,
  ListChecks,
  Award,
  Sparkles,
  Calendar,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ChallengeDetail from "./ChallengeDetail";
import { useSEO } from "@/components/SEO";
import TracksField from "@/components/admin/TracksField";


type Challenge = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  difficulty: string | null;
  duration: string | null;
  prize: string | null;
  image_url: string | null;
  starts_at: string | null;
  ends_at: string | null;
  is_featured: boolean;
  is_published: boolean;
  tracks: string[] | null;
  created_at: string;
};

const fmtDate = (v: string | null) => (v ? new Date(v).toISOString().slice(0, 10) : null);
const fmtDtLocal = (v: string | null) =>
  v ? new Date(v).toISOString().slice(0, 16) : "";

function StatCard({ value, label }: { value: number | string; label: string }) {
  useSEO({ title: "Manage Challenges" });
  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="text-2xl font-bold text-foreground leading-none">
        {value}
      </div>
      <div className="text-sm text-muted-foreground mt-2">{label}</div>
    </div>
  );
}

function IconAction({
  title,
  onClick,
  children,
  variant = "default",
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
  variant?: "default" | "danger" | "warning";
}) {
  const styles =
    variant === "danger"
      ? "bg-destructive/10 text-destructive hover:bg-destructive/15"
      : variant === "warning"
        ? "bg-amber/15 text-amber-700 hover:bg-amber/25"
        : "bg-primary-tint text-primary hover:bg-primary/15";
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`w-9 h-9 rounded-full inline-flex items-center justify-center transition-colors ${styles}`}
    >
      {children}
    </button>
  );
}

export default function ChallengesManager() {
  const { toast } = useToast();
  const [rows, setRows] = useState<Challenge[]>([]);
  const [refresh, setRefresh] = useState(0);
  const [tab, setTab] = useState<"active" | "ended">("active");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Challenge> | null>(null);
  const [participantCounts, setParticipantCounts] = useState<Record<string, number>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("challenges")
        .select("*")
        .order("created_at", { ascending: false });
      setRows((data as any) || []);
    })();
  }, [refresh]);

  // (Optional) participant counts — falls back gracefully if table missing
  useEffect(() => {
    (async () => {
      try {
        const { data } = await (supabase as any)
          .from("challenge_participants")
          .select("challenge_id");
        if (Array.isArray(data)) {
          const counts: Record<string, number> = {};
          data.forEach((r: any) => {
            counts[r.challenge_id] = (counts[r.challenge_id] || 0) + 1;
          });
          setParticipantCounts(counts);
        }
      } catch {}
    })();
  }, [refresh]);

  const now = Date.now();
  const active = rows.filter(
    (r) => !r.ends_at || new Date(r.ends_at).getTime() >= now,
  );
  const ended = rows.filter(
    (r) => r.ends_at && new Date(r.ends_at).getTime() < now,
  );
  const visible = tab === "active" ? active : ended;

  const totalParticipants = useMemo(
    () => Object.values(participantCounts).reduce((a, b) => a + b, 0),
    [participantCounts],
  );
  const publishedCount = rows.filter((r) => r.is_published).length;

  const openNew = () => {
    setEditing({
      title: "",
      description: "",
      category: "",
      difficulty: "Beginner",
      duration: "30 days",
      prize: "",
      image_url: "",
      starts_at: null,
      ends_at: null,
      is_featured: false,
      is_published: true,
      tracks: [],
    });
    setOpen(true);
  };
  const openEdit = (r: Challenge) => {
    setEditing({ ...r });
    setOpen(true);
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this challenge? This cannot be undone.")) return;
    const { error } = await supabase.from("challenges").delete().eq("id", id);
    if (error)
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    else {
      toast({ title: "Challenge deleted" });
      setRefresh((r) => r + 1);
    }
  };

  const toggleFlag = async (
    id: string,
    field: "is_featured" | "is_published",
    val: boolean,
  ) => {
    await supabase.from("challenges").update({ [field]: val } as any).eq("id", id);
    setRefresh((r) => r + 1);
  };

  const save = async () => {
    if (!editing?.title?.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    const payload: any = { ...editing };
    Object.keys(payload).forEach((k) => {
      if (payload[k] === "") payload[k] = null;
    });
    const id = payload.id;
    delete payload.id;
    delete payload.created_at;
    delete payload.updated_at;

    let error;
    if (id)
      ({ error } = await supabase
        .from("challenges")
        .update(payload)
        .eq("id", id));
    else ({ error } = await supabase.from("challenges").insert(payload));

    if (error)
      toast({
        title: "Save failed",
        description: error.message,
        variant: "destructive",
      });
    else {
      toast({ title: id ? "Challenge updated" : "Challenge created" });
      setOpen(false);
      setEditing(null);
      setRefresh((r) => r + 1);
    }
  };

  if (selectedId) {
    return (
      <ChallengeDetail
        challengeId={selectedId}
        onBack={() => {
          setSelectedId(null);
          setRefresh((r) => r + 1);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[26px] sm:text-[30px] font-bold text-foreground leading-tight">
            Challenges
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Create and manage community challenges with daily tasks
          </p>
        </div>
        <Button
          onClick={openNew}
          className="rounded-full bg-primary hover:bg-primary-dark text-primary-foreground h-11 px-5 text-sm font-semibold"
        >
          <Plus className="w-4 h-4 mr-1.5" /> New Challenge
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard value={rows.length} label="Total challenges" />
        <StatCard value={publishedCount} label="Published" />
        <StatCard value={totalParticipants} label="Total participants" />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-border">
        {(
          [
            { id: "active", label: `Active (${active.length})` },
            { id: "ended", label: `Ended (${ended.length})` },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`pb-3 text-sm font-semibold transition-colors border-b-2 -mb-px ${
              tab === t.id
                ? "text-foreground border-foreground"
                : "text-muted-foreground border-transparent hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-4">
        {visible.length === 0 && (
          <div className="bg-card border border-dashed border-border rounded-2xl py-16 text-center text-sm text-muted-foreground">
            No {tab} challenges yet.
          </div>
        )}
        {visible.map((c) => {
          const joined = participantCounts[c.id] || 0;
          const range =
            c.starts_at && c.ends_at
              ? `${fmtDate(c.starts_at)} → ${fmtDate(c.ends_at)}`
              : "Open-ended (join anytime)";
          return (
            <div
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className="bg-card border border-border rounded-2xl p-4 md:p-5 cursor-pointer hover:border-primary/40 transition-colors"
            >
              <div className="flex gap-4 items-start">
                {/* Thumb */}
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl overflow-hidden bg-secondary-tint shrink-0">
                  {c.image_url ? (
                    <img
                      src={c.image_url}
                      alt={c.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">
                      🏆
                    </div>
                  )}
                </div>

                {/* Body */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base md:text-lg font-bold text-foreground">
                      {c.title}
                    </h3>
                    {c.is_published ? (
                      <span className="text-[10.5px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-primary-tint text-primary">
                        Published
                      </span>
                    ) : (
                      <span className="text-[10.5px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                        Draft
                      </span>
                    )}
                    {c.is_featured && (
                      <span className="text-[10.5px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber/15 text-amber-700 inline-flex items-center gap-1">
                        <Star className="w-3 h-3 fill-current" /> Featured
                      </span>
                    )}
                  </div>
                  <div className="text-[12.5px] text-muted-foreground mt-1.5 flex items-center gap-3 flex-wrap">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" /> {range}
                    </span>
                    {c.duration && <span>· {c.duration}</span>}
                    <span className="inline-flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" /> {joined} joined
                    </span>
                  </div>

                  {/* Sub action chips */}
                  <div className="flex items-center gap-2 mt-3 flex-wrap" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => setSelectedId(c.id)} className="inline-flex items-center gap-1.5 text-[12.5px] text-foreground/80 px-3 py-1.5 rounded-full border border-border hover:bg-muted">
                      <Award className="w-3.5 h-3.5" /> Details
                    </button>
                    <button onClick={() => setSelectedId(c.id)} className="inline-flex items-center gap-1.5 text-[12.5px] text-foreground/80 px-3 py-1.5 rounded-full border border-border hover:bg-muted">
                      <Users className="w-3.5 h-3.5" /> Participants
                    </button>
                    <button onClick={() => setSelectedId(c.id)} className="inline-flex items-center gap-1.5 text-[12.5px] text-foreground/80 px-3 py-1.5 rounded-full border border-border hover:bg-muted">
                      <ListChecks className="w-3.5 h-3.5" /> Tasks
                    </button>
                  </div>
                </div>

                {/* Right actions */}
                <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <IconAction
                    title={c.is_featured ? "Unfeature" : "Feature"}
                    onClick={() => toggleFlag(c.id, "is_featured", !c.is_featured)}
                  >
                    <Star
                      className={`w-4 h-4 ${c.is_featured ? "fill-current" : ""}`}
                    />
                  </IconAction>
                  <IconAction
                    title={c.is_published ? "Unpublish" : "Publish"}
                    onClick={() =>
                      toggleFlag(c.id, "is_published", !c.is_published)
                    }
                    variant="warning"
                  >
                    <Sparkles className="w-4 h-4" />
                  </IconAction>
                  <IconAction title="Edit" onClick={() => openEdit(c)}>
                    <Pencil className="w-4 h-4" />
                  </IconAction>
                  <IconAction
                    title="Delete"
                    onClick={() => remove(c.id)}
                    variant="danger"
                  >
                    <Trash2 className="w-4 h-4" />
                  </IconAction>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create / edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing?.id ? "Edit challenge" : "New challenge"}
            </DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div>
                <Label>Title *</Label>
                <Input
                  value={editing.title || ""}
                  onChange={(e) =>
                    setEditing({ ...editing, title: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  rows={3}
                  value={editing.description || ""}
                  onChange={(e) =>
                    setEditing({ ...editing, description: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>Category</Label>
                  <Input
                    value={editing.category || ""}
                    onChange={(e) =>
                      setEditing({ ...editing, category: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Difficulty</Label>
                  <Select
                    value={editing.difficulty || ""}
                    onValueChange={(v) =>
                      setEditing({ ...editing, difficulty: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Beginner">Beginner</SelectItem>
                      <SelectItem value="Intermediate">Intermediate</SelectItem>
                      <SelectItem value="Advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Duration</Label>
                  <Input
                    value={editing.duration || ""}
                    onChange={(e) =>
                      setEditing({ ...editing, duration: e.target.value })
                    }
                    placeholder="e.g. 30 days"
                  />
                </div>
                <div>
                  <Label>Prize</Label>
                  <Input
                    value={editing.prize || ""}
                    onChange={(e) =>
                      setEditing({ ...editing, prize: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Starts at</Label>
                  <Input
                    type="datetime-local"
                    value={fmtDtLocal(editing.starts_at ?? null)}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        starts_at: e.target.value
                          ? new Date(e.target.value).toISOString()
                          : null,
                      })
                    }
                  />
                </div>
                <div>
                  <Label>Ends at</Label>
                  <Input
                    type="datetime-local"
                    value={fmtDtLocal(editing.ends_at ?? null)}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        ends_at: e.target.value
                          ? new Date(e.target.value).toISOString()
                          : null,
                      })
                    }
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label>Image URL</Label>
                  <Input
                    value={editing.image_url || ""}
                    onChange={(e) =>
                      setEditing({ ...editing, image_url: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="flex gap-6 pt-2">
                <label className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={!!editing.is_featured}
                    onCheckedChange={(v) =>
                      setEditing({ ...editing, is_featured: v })
                    }
                  />{" "}
                  Featured
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={!!editing.is_published}
                    onCheckedChange={(v) =>
                      setEditing({ ...editing, is_published: v })
                    }
                  />{" "}
                  Published
                </label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
