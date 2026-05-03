import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Mail,
  Plus,
  Pencil,
  Trash2,
  Calendar,
  Users,
  TrendingUp,
  ListChecks,
  CheckCircle2,
  Zap,
} from "lucide-react";

type Challenge = {
  id: string;
  title: string;
  description: string | null;
  duration: string | null;
  starts_at: string | null;
  ends_at: string | null;
  is_featured: boolean;
  is_published: boolean;
  image_url: string | null;
};

type Task = {
  id: string;
  challenge_id: string;
  day_number: number;
  title: string;
  action_item: string | null;
  description: string | null;
};

const fmtDate = (v: string | null) =>
  v ? new Date(v).toISOString().slice(0, 10) : null;

function StatCard({
  icon,
  label,
  value,
  sub,
  progress,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub?: string;
  progress?: number;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="text-2xl font-serif font-semibold text-foreground mt-2">
        {value}
      </div>
      {sub && <div className="text-xs text-muted-foreground mt-2">{sub}</div>}
      {typeof progress === "number" && (
        <div className="h-1.5 bg-muted rounded-full mt-3 overflow-hidden">
          <div
            className="h-full bg-primary rounded-full"
            style={{ width: `${Math.min(100, progress)}%` }}
          />
        </div>
      )}
    </div>
  );
}

export default function ChallengeDetail({
  challengeId,
  onBack,
}: {
  challengeId: string;
  onBack: () => void;
}) {
  const { toast } = useToast();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [refresh, setRefresh] = useState(0);
  const [participantCount, setParticipantCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [submissionsCount, setSubmissionsCount] = useState(0);
  const [emailing, setEmailing] = useState(false);

  // Add/edit task state
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    day_number: 1,
    title: "",
    action_item: "",
    description: "",
  });

  useEffect(() => {
    (async () => {
      const { data: c } = await supabase
        .from("challenges")
        .select("*")
        .eq("id", challengeId)
        .maybeSingle();
      setChallenge((c as any) || null);

      const { data: t } = await (supabase as any)
        .from("challenge_tasks")
        .select("*")
        .eq("challenge_id", challengeId)
        .order("day_number", { ascending: true });
      setTasks((t as Task[]) || []);

      try {
        const { data: p } = await (supabase as any)
          .from("challenge_participants")
          .select("user_id, submissions_count")
          .eq("challenge_id", challengeId);
        if (Array.isArray(p)) {
          setParticipantCount(p.length);
          const active = p.filter((x: any) => (x.submissions_count || 0) >= 1).length;
          setActiveCount(active);
          const subs = p.reduce(
            (a: number, x: any) => a + (x.submissions_count || 0),
            0,
          );
          setSubmissionsCount(subs);
        }
      } catch {}
    })();
  }, [challengeId, refresh]);

  const openAdd = () => {
    setEditingId(null);
    setForm({
      day_number: (tasks[tasks.length - 1]?.day_number || 0) + 1,
      title: "",
      action_item: "",
      description: "",
    });
    setShowAdd(true);
  };

  const openEdit = (t: Task) => {
    setEditingId(t.id);
    setForm({
      day_number: t.day_number,
      title: t.title,
      action_item: t.action_item || "",
      description: t.description || "",
    });
    setShowAdd(true);
  };

  const saveTask = async () => {
    if (!form.title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    const payload = {
      challenge_id: challengeId,
      day_number: form.day_number,
      title: form.title,
      action_item: form.action_item || null,
      description: form.description || null,
    };
    let error;
    if (editingId)
      ({ error } = await (supabase as any)
        .from("challenge_tasks")
        .update(payload)
        .eq("id", editingId));
    else
      ({ error } = await (supabase as any)
        .from("challenge_tasks")
        .insert(payload));
    if (error) {
      toast({
        title: "Save failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: editingId ? "Task updated" : "Task added" });
      setShowAdd(false);
      setEditingId(null);
      setRefresh((r) => r + 1);
    }
  };

  const deleteTask = async (id: string) => {
    if (!confirm("Delete this task?")) return;
    const { error } = await (supabase as any)
      .from("challenge_tasks")
      .delete()
      .eq("id", id);
    if (error)
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    else {
      toast({ title: "Task deleted" });
      setRefresh((r) => r + 1);
    }
  };

  const emailAll = async () => {
    setEmailing(true);
    try {
      const { error } = await (supabase.functions as any).invoke(
        "email-challenge-members",
        {
          body: { challenge_id: challengeId },
        },
      );
      if (error) throw error;
      toast({ title: "Email sent to all participants" });
    } catch (e: any) {
      toast({
        title: "Email failed",
        description: e.message || "Could not send",
        variant: "destructive",
      });
    } finally {
      setEmailing(false);
    }
  };

  if (!challenge) {
    return (
      <div className="space-y-6">
        <button
          onClick={onBack}
          className="text-sm text-muted-foreground inline-flex items-center gap-1 hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="text-muted-foreground text-sm">Loading…</div>
      </div>
    );
  }

  const range =
    challenge.starts_at && challenge.ends_at
      ? `${fmtDate(challenge.starts_at)} → ${fmtDate(challenge.ends_at)}`
      : "Open-ended (join anytime)";

  const completionRate = participantCount
    ? Math.round((activeCount / participantCount) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="text-sm text-muted-foreground inline-flex items-center gap-1 hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" /> Back to challenges
      </button>

      {/* Hero */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {challenge.image_url && (
          <div className="h-48 md:h-64 bg-secondary-tint overflow-hidden">
            <img
              src={challenge.image_url}
              alt={challenge.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <div className="p-6 md:p-7">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10.5px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-primary-tint text-primary inline-flex items-center gap-1">
                  <Zap className="w-3 h-3 fill-current" /> Active
                </span>
                {challenge.is_published && (
                  <span className="text-[10.5px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-primary-tint text-primary">
                    Published
                  </span>
                )}
              </div>
              <h1 className="text-2xl md:text-3xl font-serif font-semibold text-foreground leading-tight">
                {challenge.title}
              </h1>
              {challenge.description && (
                <p className="text-sm text-muted-foreground mt-2 max-w-3xl">
                  {challenge.description}
                </p>
              )}
              <div className="flex items-center gap-4 text-[12.5px] text-muted-foreground mt-4 flex-wrap">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> {range}
                </span>
                {challenge.duration && <span>{challenge.duration}</span>}
              </div>
            </div>
            <Button
              onClick={emailAll}
              disabled={emailing || participantCount === 0}
              variant="outline"
              className="rounded-full h-10"
            >
              <Mail className="w-4 h-4 mr-1.5" />
              {emailing ? "Sending…" : "Email All"}
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Users className="w-4 h-4" />}
          label="Participants"
          value={participantCount}
        />
        <StatCard
          icon={<TrendingUp className="w-4 h-4" />}
          label="Active (submitted ≥1)"
          value={activeCount}
          sub={
            participantCount
              ? `${Math.round((activeCount / participantCount) * 100)}% engagement`
              : undefined
          }
        />
        <StatCard
          icon={<CheckCircle2 className="w-4 h-4" />}
          label="Total Submissions"
          value={submissionsCount}
          sub={
            participantCount
              ? `Avg ${(submissionsCount / participantCount).toFixed(1)} per person`
              : undefined
          }
        />
        <StatCard
          icon={<ListChecks className="w-4 h-4" />}
          label="Completion Rate"
          value={`${completionRate}%`}
          progress={completionRate}
        />
      </div>

      {/* Tasks */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
          <div>
            <div className="flex items-center gap-2">
              <ListChecks className="w-5 h-5 text-foreground" />
              <h2 className="text-xl md:text-2xl font-serif font-semibold text-foreground">
                Challenge Tasks
              </h2>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {tasks.length} task{tasks.length === 1 ? "" : "s"}
              {challenge.duration ? ` · ${challenge.duration} challenge` : ""}
            </p>
          </div>
          <Button
            onClick={openAdd}
            className="rounded-full bg-primary hover:bg-primary-dark text-primary-foreground h-10 px-5 text-sm font-semibold"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Add Task
          </Button>
        </div>

        {showAdd && (
          <div className="border border-border rounded-2xl p-5 mb-5 bg-secondary-tint/30">
            <h3 className="text-base font-semibold mb-4">
              {editingId ? "Edit Task" : "Add New Task"}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-[120px_1fr] gap-3">
              <div>
                <Label>Day #</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.day_number}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      day_number: parseInt(e.target.value) || 1,
                    })
                  }
                />
              </div>
              <div>
                <Label>Title</Label>
                <Input
                  placeholder="e.g. Share your morning routine"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
            </div>
            <div className="mt-3">
              <Label>
                Action Item{" "}
                <span className="text-muted-foreground font-normal">
                  (what they post in the forum)
                </span>
              </Label>
              <Input
                placeholder="e.g. Share a 60-second video introducing yourself"
                value={form.action_item}
                onChange={(e) =>
                  setForm({ ...form, action_item: e.target.value })
                }
              />
            </div>
            <div className="mt-3">
              <Label>Description</Label>
              <Textarea
                rows={3}
                placeholder="Describe what participants should do for this task…"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </div>
            <div className="flex gap-2 mt-4">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowAdd(false);
                  setEditingId(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={saveTask}
                className="rounded-full bg-primary hover:bg-primary-dark text-primary-foreground"
              >
                {editingId ? "Save" : "Add Task"}
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {tasks.length === 0 && !showAdd && (
            <div className="text-sm text-muted-foreground text-center py-10 border border-dashed border-border rounded-2xl">
              No tasks yet. Add the first one.
            </div>
          )}
          {tasks.map((t) => (
            <div
              key={t.id}
              className="flex gap-4 items-start p-4 rounded-2xl border border-border hover:bg-muted/30 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-primary-tint text-primary inline-flex items-center justify-center font-semibold text-sm shrink-0">
                {t.day_number}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-foreground">{t.title}</h4>
                {t.action_item && (
                  <div className="text-sm text-primary mt-1 inline-flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5" /> {t.action_item}
                  </div>
                )}
                {t.description && (
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                    {t.description}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  title="Edit"
                  onClick={() => openEdit(t)}
                  className="w-8 h-8 rounded-full inline-flex items-center justify-center bg-primary-tint text-primary hover:bg-primary/15"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  title="Delete"
                  onClick={() => deleteTask(t.id)}
                  className="w-8 h-8 rounded-full inline-flex items-center justify-center bg-destructive/10 text-destructive hover:bg-destructive/15"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
