import { useEffect, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  GraduationCap,
  FolderPlus,
  MessageSquare,
} from "lucide-react";
import CourseDetail from "./CourseDetail";

type Course = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  level: string | null;
  instructor: string | null;
  instructor_avatar_url: string | null;
  instructor_bio: string | null;
  image_url: string | null;
  preview_video_url: string | null;
  duration: string | null;
  lessons: number | null;
  price: number | null;
  rating: number | null;
  reviews: number | null;
  is_published: boolean;
  is_featured: boolean;
};

const LEVELS = ["Beginner", "Intermediate", "Advanced", "All Levels"];

export default function CoursesManager() {
  const { toast } = useToast();
  const [tab, setTab] = useState<"courses" | "categories" | "requests">("courses");
  const [rows, setRows] = useState<Course[]>([]);
  const [refresh, setRefresh] = useState(0);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Course> | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("courses")
        .select("*")
        .order("created_at", { ascending: false });
      setRows((data as any) || []);
    })();
  }, [refresh]);

  const openNew = () => {
    setEditing({
      title: "",
      description: "",
      category: "",
      level: "Beginner",
      instructor: "",
      instructor_avatar_url: "",
      instructor_bio: "",
      image_url: "",
      preview_video_url: "",
      duration: "",
      lessons: 0,
      price: 5000,
      is_published: true,
      is_featured: false,
    });
    setOpen(true);
  };

  const openEdit = (c: Course) => {
    setEditing({ ...c });
    setOpen(true);
  };

  const togglePublish = async (c: Course) => {
    await supabase
      .from("courses")
      .update({ is_published: !c.is_published })
      .eq("id", c.id);
    setRefresh((x) => x + 1);
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this course? This cannot be undone.")) return;
    const { error } = await supabase.from("courses").delete().eq("id", id);
    if (error)
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Course deleted" });
      setRefresh((x) => x + 1);
    }
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
      ({ error } = await supabase.from("courses").update(payload).eq("id", id));
    else ({ error } = await supabase.from("courses").insert(payload));
    if (error)
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else {
      toast({ title: id ? "Course updated" : "Course created" });
      setOpen(false);
      setEditing(null);
      setRefresh((x) => x + 1);
    }
  };

  const tabBtn = (
    id: typeof tab,
    label: string,
    icon: React.ReactNode,
    count?: number,
  ) => (
    <button
      key={id}
      onClick={() => setTab(id)}
      className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-colors ${
        tab === id
          ? "bg-primary text-primary-foreground"
          : "bg-card border border-border text-foreground hover:bg-muted"
      }`}
    >
      {icon}
      {label} ({count ?? 0})
    </button>
  );

  if (selectedId) {
    return (
      <CourseDetail
        courseId={selectedId}
        onBack={() => {
          setSelectedId(null);
          setRefresh((r) => r + 1);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[26px] sm:text-[30px] font-bold text-foreground leading-tight">
            Courses
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage paid courses with video lessons. Premium members get free access; Standard members pay.
          </p>
        </div>
        <Button
          onClick={openNew}
          className="rounded-full bg-primary hover:bg-primary-dark text-primary-foreground h-11 px-5 text-sm font-semibold"
        >
          <Plus className="w-4 h-4 mr-1.5" /> Add Course
        </Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        {tabBtn("courses", "Courses", <GraduationCap className="w-4 h-4" />, rows.length)}
        {tabBtn("categories", "Categories", <FolderPlus className="w-4 h-4" />, 0)}
        {tabBtn("requests", "Requests", <MessageSquare className="w-4 h-4" />, 0)}
      </div>

      {tab === "courses" && (
        <div className="space-y-3">
          {rows.length === 0 && (
            <div className="bg-card border border-dashed border-border rounded-2xl py-16 text-center text-sm text-muted-foreground">
              No courses yet. Click "Add Course" to create the first one.
            </div>
          )}
          {rows.map((c) => (
            <div
              key={c.id}
              className="bg-card border border-border rounded-2xl p-4 md:p-5 hover:border-primary/40 transition-colors cursor-pointer"
              onClick={() => setSelectedId(c.id)}
            >
              <div className="flex gap-4 items-start">
                <div className="w-16 h-16 md:w-[68px] md:h-[68px] rounded-2xl overflow-hidden bg-secondary-tint shrink-0 flex items-center justify-center">
                  {c.image_url ? (
                    <img src={c.image_url} alt={c.title} className="w-full h-full object-cover" />
                  ) : (
                    <GraduationCap className="w-6 h-6 text-muted-foreground" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-base md:text-lg font-bold text-foreground">{c.title}</h3>
                  {c.description && (
                    <p className="text-[13.5px] text-muted-foreground mt-1 leading-relaxed line-clamp-2">
                      {c.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    {c.level && (
                      <span className="text-[11.5px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-primary-tint text-primary">
                        {c.level}
                      </span>
                    )}
                    {c.category && (
                      <span className="text-[11.5px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-primary-tint text-primary">
                        {c.category}
                      </span>
                    )}
                    {c.instructor && (
                      <span className="text-[12px] font-semibold text-muted-foreground">
                        by {c.instructor}
                      </span>
                    )}
                    <span className="text-[13px] font-bold text-primary">
                      ₦{(c.price ?? 0).toLocaleString()}
                    </span>
                    {!c.is_published && (
                      <span className="text-[10.5px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                        Draft
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    title={c.is_published ? "Unpublish" : "Publish"}
                    onClick={() => togglePublish(c)}
                    className="w-9 h-9 rounded-full inline-flex items-center justify-center bg-primary-tint text-primary hover:bg-primary/15"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    title="Edit"
                    onClick={() => openEdit(c)}
                    className="w-9 h-9 rounded-full inline-flex items-center justify-center bg-primary-tint text-primary hover:bg-primary/15"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    title="Delete"
                    onClick={() => remove(c.id)}
                    className="w-9 h-9 rounded-full inline-flex items-center justify-center bg-destructive/10 text-destructive hover:bg-destructive/15"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "categories" && (
        <div className="bg-card border border-dashed border-border rounded-2xl py-16 text-center text-sm text-muted-foreground">
          Category management coming soon.
        </div>
      )}
      {tab === "requests" && (
        <div className="bg-card border border-dashed border-border rounded-2xl py-16 text-center text-sm text-muted-foreground">
          Member course requests will appear here.
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {editing?.id ? "Edit Course" : "Add Course"}
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label>Level</Label>
                  <Select
                    value={editing.level || ""}
                    onValueChange={(v) => setEditing({ ...editing, level: v })}
                  >
                    <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>
                      {LEVELS.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Category</Label>
                  <Input
                    value={editing.category || ""}
                    onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                    placeholder="e.g. Career, Tech"
                  />
                </div>
                <div>
                  <Label>Price (₦)</Label>
                  <Input
                    type="number"
                    value={editing.price ?? 0}
                    onChange={(e) => setEditing({ ...editing, price: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>Instructor name</Label>
                  <Input
                    value={editing.instructor || ""}
                    onChange={(e) => setEditing({ ...editing, instructor: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Instructor avatar URL</Label>
                  <Input
                    value={editing.instructor_avatar_url || ""}
                    onChange={(e) => setEditing({ ...editing, instructor_avatar_url: e.target.value })}
                    placeholder="https://…"
                  />
                </div>
              </div>
              <div>
                <Label>Instructor bio</Label>
                <Textarea
                  rows={2}
                  value={editing.instructor_bio || ""}
                  onChange={(e) => setEditing({ ...editing, instructor_bio: e.target.value })}
                />
              </div>
              <div>
                <Label>Course Thumbnail URL</Label>
                <Input
                  value={editing.image_url || ""}
                  onChange={(e) => setEditing({ ...editing, image_url: e.target.value })}
                  placeholder="https://…"
                />
              </div>
              <div>
                <Label>Preview Video URL</Label>
                <Input
                  value={editing.preview_video_url || ""}
                  onChange={(e) => setEditing({ ...editing, preview_video_url: e.target.value })}
                  placeholder="YouTube / Vimeo / MP4 link"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>Duration</Label>
                  <Input
                    value={editing.duration || ""}
                    onChange={(e) => setEditing({ ...editing, duration: e.target.value })}
                    placeholder="e.g. 3h 20m"
                  />
                </div>
                <div>
                  <Label>Lessons count</Label>
                  <Input
                    type="number"
                    value={editing.lessons ?? 0}
                    onChange={(e) => setEditing({ ...editing, lessons: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="flex gap-6 pt-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!editing.is_published}
                    onChange={(e) => setEditing({ ...editing, is_published: e.target.checked })}
                  />
                  Published
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!editing.is_featured}
                    onChange={(e) => setEditing({ ...editing, is_featured: e.target.checked })}
                  />
                  Featured
                </label>
              </div>
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
