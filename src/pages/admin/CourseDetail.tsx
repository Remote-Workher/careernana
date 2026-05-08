import { useEffect, useState } from "react";
import { useSEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  GraduationCap,
  Video,
  Users,
  PlayCircle,
  Mail,
  GripVertical,
  Sparkles,
  Loader2,
} from "lucide-react";

type Course = {
  id: string;
  title: string;
  description: string | null;
  instructor: string | null;
  instructor_avatar_url: string | null;
  instructor_bio: string | null;
  image_url: string | null;
  preview_video_url: string | null;
  category: string | null;
  level: string | null;
  duration: string | null;
  price: number | null;
  is_published: boolean;
};

type Lesson = {
  id: string;
  course_id: string;
  position: number;
  title: string;
  description: string | null;
  video_url: string | null;
  duration: string | null;
  thumbnail_url: string | null;
  is_preview: boolean;
};

export default function CourseDetail({
  courseId,
  onBack,
}: {
  courseId: string;
  onBack: () => void;
}) {
  useSEO({ title: "Manage Course" });
  const { toast } = useToast();
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [refresh, setRefresh] = useState(0);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Lesson> | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const generateLessonMeta = async () => {
    if (!editing?.video_url?.trim()) {
      toast({ title: "Add a video URL first", variant: "destructive" });
      return;
    }
    setAiLoading(true);
    const { data, error } = await supabase.functions.invoke("generate-lesson-meta", {
      body: {
        video_url: editing.video_url,
        course_title: course?.title,
        course_category: course?.category,
      },
    });
    setAiLoading(false);
    if (error || (data as any)?.error) {
      toast({
        title: "Couldn't generate",
        description: (data as any)?.error ?? error?.message ?? "Try again",
        variant: "destructive",
      });
      return;
    }
    const t = (data as any)?.title;
    const d = (data as any)?.description;
    const thumb = (data as any)?.thumbnail_url;
    setEditing((prev) => ({
      ...(prev ?? {}),
      title: t || prev?.title,
      description: d || prev?.description,
      thumbnail_url: thumb || prev?.thumbnail_url,
    }));
    toast({ title: "Lesson details generated" });
  };
  useEffect(() => {
    (async () => {
      const { data: c } = await supabase
        .from("courses")
        .select("*")
        .eq("id", courseId)
        .maybeSingle();
      setCourse(c as any);
      const { data: l } = await supabase
        .from("course_lessons" as any)
        .select("*")
        .eq("course_id", courseId)
        .order("position", { ascending: true });
      setLessons((l as any) || []);
    })();
  }, [courseId, refresh]);

  const openNew = () => {
    setEditing({
      title: "",
      description: "",
      video_url: "",
      duration: "",
      thumbnail_url: "",
      is_preview: false,
      position: lessons.length,
    });
    setOpen(true);
  };

  const openEdit = (l: Lesson) => {
    setEditing({ ...l });
    setOpen(true);
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this lesson?")) return;
    const { error } = await supabase.from("course_lessons" as any).delete().eq("id", id);
    if (error)
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Lesson deleted" });
      setRefresh((x) => x + 1);
    }
  };

  const save = async () => {
    if (!editing?.title?.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    const payload: any = { ...editing, course_id: courseId };
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
        .from("course_lessons" as any)
        .update(payload)
        .eq("id", id));
    else ({ error } = await supabase.from("course_lessons" as any).insert(payload));
    if (error)
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else {
      toast({ title: id ? "Lesson updated" : "Lesson added" });
      setOpen(false);
      setEditing(null);
      setRefresh((x) => x + 1);
    }
  };

  if (!course) {
    return <div className="text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Courses
      </button>

      {/* Header card */}
      <div className="bg-card border border-border rounded-2xl p-5 md:p-6">
        <div className="flex gap-5 items-start flex-wrap">
          <div className="w-24 h-24 md:w-28 md:h-28 rounded-2xl overflow-hidden bg-secondary-tint shrink-0 flex items-center justify-center">
            {course.image_url ? (
              <img src={course.image_url} alt={course.title} className="w-full h-full object-cover" />
            ) : (
              <GraduationCap className="w-10 h-10 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-[260px]">
            <h1 className="text-[26px] sm:text-[30px] font-bold text-foreground leading-tight">
              {course.title}
            </h1>
            {course.description && (
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                {course.description}
              </p>
            )}
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              {course.level && (
                <span className="text-[11.5px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-primary-tint text-primary">
                  {course.level}
                </span>
              )}
              {course.category && (
                <span className="text-[11.5px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-primary-tint text-primary">
                  {course.category}
                </span>
              )}
              {course.instructor && (
                <span className="text-[12px] font-semibold text-muted-foreground">
                  by {course.instructor}
                </span>
              )}
              <span className="text-[13px] font-bold text-primary">
                ₦{(course.price ?? 0).toLocaleString()}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="rounded-full h-10 px-4">
              <Mail className="w-4 h-4 mr-1.5" /> Email students
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard icon={<Video className="w-4 h-4" />} label="Lessons" value={lessons.length} />
        <StatCard
          icon={<PlayCircle className="w-4 h-4" />}
          label="Preview"
          value={lessons.filter((l) => l.is_preview).length}
        />
        <StatCard icon={<Users className="w-4 h-4" />} label="Students" value={0} />
      </div>

      <CourseResourcesSection courseId={courseId} />

      {/* Lessons */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">Video Lessons</h2>
        <Button
          onClick={openNew}
          className="rounded-full bg-primary hover:bg-primary-dark text-primary-foreground h-10 px-4 text-sm font-semibold"
        >
          <Plus className="w-4 h-4 mr-1.5" /> New Lesson
        </Button>
      </div>

      <div className="space-y-2">
        {lessons.length === 0 && (
          <div className="bg-card border border-dashed border-border rounded-2xl py-16 text-center text-sm text-muted-foreground">
            No lessons yet. Click "Add Lesson" to add the first video.
          </div>
        )}
        {lessons.map((l, i) => (
          <div
            key={l.id}
            className="bg-card border border-border rounded-2xl p-4 flex gap-3 items-center"
          >
            <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
            <div className="w-12 h-12 rounded-xl bg-secondary-tint shrink-0 flex items-center justify-center overflow-hidden">
              {l.thumbnail_url ? (
                <img src={l.thumbnail_url} alt={l.title} className="w-full h-full object-cover" />
              ) : (
                <Video className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-muted-foreground">#{i + 1}</span>
                <h3 className="text-sm font-bold text-foreground truncate">{l.title}</h3>
                {l.is_preview && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary-tint text-primary">
                    Preview
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                {l.duration && <span>{l.duration}</span>}
                {l.video_url && <span className="truncate max-w-[280px]">{l.video_url}</span>}
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => openEdit(l)}
                className="w-9 h-9 rounded-full inline-flex items-center justify-center bg-primary-tint text-primary hover:bg-primary/15"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => remove(l.id)}
                className="w-9 h-9 rounded-full inline-flex items-center justify-center bg-destructive/10 text-destructive hover:bg-destructive/15"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {editing?.id ? "Edit Lesson" : "Add Lesson"}
            </DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input
                  value={editing.title || ""}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  rows={3}
                  value={editing.description || ""}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                />
              </div>
              <div>
                <Label>Video URL (Loom, YouTube, Vimeo, MP4…)</Label>
                <Input
                  value={editing.video_url || ""}
                  onChange={(e) => setEditing({ ...editing, video_url: e.target.value })}
                  placeholder="https://…"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={generateLessonMeta}
                  disabled={aiLoading || !editing.video_url?.trim()}
                  className="h-7 px-2 mt-1.5 text-xs text-primary hover:text-primary"
                >
                  {aiLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 mr-1" />
                  )}
                  {aiLoading ? "Generating…" : "Generate title & description from video"}
                </Button>
              </div>
              <div>
                <Label>Thumbnail URL</Label>
                <Input
                  value={editing.thumbnail_url || ""}
                  onChange={(e) => setEditing({ ...editing, thumbnail_url: e.target.value })}
                  placeholder="https://…"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Duration</Label>
                  <Input
                    value={editing.duration || ""}
                    onChange={(e) => setEditing({ ...editing, duration: e.target.value })}
                    placeholder="e.g. 12m 30s"
                  />
                </div>
                <div>
                  <Label>Position</Label>
                  <Input
                    type="number"
                    value={editing.position ?? 0}
                    onChange={(e) =>
                      setEditing({ ...editing, position: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm pt-2">
                <input
                  type="checkbox"
                  checked={!!editing.is_preview}
                  onChange={(e) => setEditing({ ...editing, is_preview: e.target.checked })}
                />
                Free preview lesson
              </label>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              onClick={save}
              className="rounded-full bg-primary hover:bg-primary-dark text-primary-foreground"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
        {icon}
        {label}
      </div>
      <div className="text-2xl font-bold text-foreground leading-none mt-2">{value}</div>
    </div>
  );
}

function CourseResourcesSection({ courseId }: { courseId: string }) {
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("course_resources" as any)
        .select("*")
        .eq("course_id", courseId)
        .order("position", { ascending: true });
      setItems((data as any) || []);
    })();
  }, [courseId, refresh]);

  const save = async () => {
    if (!editing?.title?.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    const payload: any = { ...editing, course_id: courseId };
    Object.keys(payload).forEach((k) => { if (payload[k] === "") payload[k] = null; });
    const id = payload.id;
    delete payload.id; delete payload.created_at; delete payload.updated_at;
    let error;
    if (id) ({ error } = await supabase.from("course_resources" as any).update(payload).eq("id", id));
    else ({ error } = await supabase.from("course_resources" as any).insert(payload));
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else { toast({ title: id ? "Resource updated" : "Resource added" }); setOpen(false); setEditing(null); setRefresh((x) => x + 1); }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this resource?")) return;
    const { error } = await supabase.from("course_resources" as any).delete().eq("id", id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Resource deleted" }); setRefresh((x) => x + 1); }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">Course Resources</h2>
        <Button
          onClick={() => { setEditing({ title: "", description: "", url: "", file_type: "PDF", position: items.length }); setOpen(true); }}
          className="rounded-full bg-primary hover:bg-primary-dark text-primary-foreground h-10 px-4 text-sm font-semibold"
        >
          <Plus className="w-4 h-4 mr-1.5" /> New Resource
        </Button>
      </div>
      {items.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-2xl py-10 text-center text-sm text-muted-foreground">
          No resources attached. Add PDFs, links or downloads students can use.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((r) => (
            <div key={r.id} className="bg-card border border-border rounded-2xl p-4 flex gap-3 items-center">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-foreground truncate">{r.title}</h3>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                  {r.file_type && <span>{r.file_type}</span>}
                  {r.url && <span className="truncate max-w-[280px]">{r.url}</span>}
                </div>
              </div>
              <button onClick={() => { setEditing({ ...r }); setOpen(true); }} className="w-9 h-9 rounded-full inline-flex items-center justify-center bg-primary-tint text-primary hover:bg-primary/15">
                <Pencil className="w-4 h-4" />
              </button>
              <button onClick={() => remove(r.id)} className="w-9 h-9 rounded-full inline-flex items-center justify-center bg-destructive/10 text-destructive hover:bg-destructive/15">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle className="text-xl font-bold">{editing?.id ? "Edit Resource" : "Add Resource"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div><Label>Title</Label><Input value={editing.title || ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></div>
              <div><Label>Description</Label><Textarea rows={2} value={editing.description || ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
              <div><Label>Download URL</Label><Input value={editing.url || ""} onChange={(e) => setEditing({ ...editing, url: e.target.value })} placeholder="https://…" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>File type</Label><Input value={editing.file_type || ""} onChange={(e) => setEditing({ ...editing, file_type: e.target.value })} placeholder="PDF, DOCX, Link…" /></div>
                <div><Label>Position</Label><Input type="number" value={editing.position ?? 0} onChange={(e) => setEditing({ ...editing, position: parseInt(e.target.value) || 0 })} /></div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} className="rounded-full bg-primary hover:bg-primary-dark text-primary-foreground">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
