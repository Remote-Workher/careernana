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
  Video,
  BookOpen,
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
  is_published: boolean;
  is_featured: boolean;
};

type Class = {
  id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  duration: string | null;
  level: string | null;
  category: string | null;
  instructor: string | null;
  is_published: boolean;
};

const LEVELS = ["Beginner", "Intermediate", "Advanced", "All Levels"];

export default function CoursesManager() {
  const { toast } = useToast();
  const [tab, setTab] = useState<"classes" | "courses">("classes");
  const [courses, setCourses] = useState<Course[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [refresh, setRefresh] = useState(0);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

  // Course dialog
  const [courseOpen, setCourseOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Partial<Course> | null>(null);

  // Class dialog
  const [classOpen, setClassOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<Partial<Class> | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data: cs }, { data: ks }] = await Promise.all([
        supabase.from("courses").select("*").order("created_at", { ascending: false }),
        supabase.from("classes" as any).select("*").order("created_at", { ascending: false }),
      ]);
      setCourses((cs as any) || []);
      setClasses((ks as any) || []);
    })();
  }, [refresh]);

  // ---- COURSE actions ----
  const openNewCourse = () => {
    setEditingCourse({
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
    setCourseOpen(true);
  };

  const openEditCourse = (c: Course) => {
    setEditingCourse({ ...c });
    setCourseOpen(true);
  };

  const togglePublishCourse = async (c: Course) => {
    await supabase.from("courses").update({ is_published: !c.is_published }).eq("id", c.id);
    setRefresh((x) => x + 1);
  };

  const removeCourse = async (id: string) => {
    if (!confirm("Delete this course? This cannot be undone.")) return;
    const { error } = await supabase.from("courses").delete().eq("id", id);
    if (error)
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Course deleted" });
      setRefresh((x) => x + 1);
    }
  };

  const saveCourse = async () => {
    if (!editingCourse?.title?.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    const payload: any = { ...editingCourse };
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
      setCourseOpen(false);
      setEditingCourse(null);
      setRefresh((x) => x + 1);
    }
  };

  // ---- CLASS actions ----
  const openNewClass = () => {
    setEditingClass({
      title: "",
      description: "",
      video_url: "",
      thumbnail_url: "",
      duration: "",
      level: "Beginner",
      category: "",
      instructor: "",
      is_published: true,
    });
    setClassOpen(true);
  };

  const openEditClass = (c: Class) => {
    setEditingClass({ ...c });
    setClassOpen(true);
  };

  const togglePublishClass = async (c: Class) => {
    await supabase
      .from("classes" as any)
      .update({ is_published: !c.is_published })
      .eq("id", c.id);
    setRefresh((x) => x + 1);
  };

  const removeClass = async (id: string) => {
    if (!confirm("Delete this class?")) return;
    const { error } = await supabase.from("classes" as any).delete().eq("id", id);
    if (error)
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Class deleted" });
      setRefresh((x) => x + 1);
    }
  };

  const saveClass = async () => {
    if (!editingClass?.title?.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    const payload: any = { ...editingClass };
    Object.keys(payload).forEach((k) => {
      if (payload[k] === "") payload[k] = null;
    });
    const id = payload.id;
    delete payload.id;
    delete payload.created_at;
    delete payload.updated_at;
    let error;
    if (id)
      ({ error } = await supabase.from("classes" as any).update(payload).eq("id", id));
    else ({ error } = await supabase.from("classes" as any).insert(payload));
    if (error)
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else {
      toast({ title: id ? "Class updated" : "Class created" });
      setClassOpen(false);
      setEditingClass(null);
      setRefresh((x) => x + 1);
    }
  };

  const tabBtn = (id: typeof tab, label: string, icon: React.ReactNode, count: number) => (
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
      {label} ({count})
    </button>
  );

  if (selectedCourseId) {
    return (
      <CourseDetail
        courseId={selectedCourseId}
        onBack={() => {
          setSelectedCourseId(null);
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
            Classes & Courses
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage individual classes and group them into multi-lesson courses. Premium members get free access; Standard members pay.
          </p>
        </div>
        <Button
          onClick={tab === "courses" ? openNewCourse : openNewClass}
          className="rounded-full bg-primary hover:bg-primary-dark text-primary-foreground h-11 px-5 text-sm font-semibold"
        >
          <Plus className="w-4 h-4 mr-1.5" /> {tab === "courses" ? "New Course" : "New Class"}
        </Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        {tabBtn("classes", "Classes", <Video className="w-4 h-4" />, classes.length)}
        {tabBtn("courses", "Courses", <BookOpen className="w-4 h-4" />, courses.length)}
      </div>

      {/* CLASSES TAB */}
      {tab === "classes" && (
        <div className="space-y-3">
          {classes.length === 0 && (
            <div className="bg-card border border-dashed border-border rounded-2xl py-16 text-center text-sm text-muted-foreground">
              No classes yet. Click "New Class" to add the first video class.
            </div>
          )}
          {classes.map((c) => (
            <div key={c.id} className="bg-card border border-border rounded-2xl p-4 md:p-5">
              <div className="flex gap-4 items-start">
                <div className="w-16 h-16 md:w-[68px] md:h-[68px] rounded-2xl overflow-hidden bg-secondary-tint shrink-0 flex items-center justify-center">
                  {c.thumbnail_url ? (
                    <img src={c.thumbnail_url} alt={c.title} className="w-full h-full object-cover" />
                  ) : (
                    <Video className="w-6 h-6 text-muted-foreground" />
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
                    {c.duration && (
                      <span className="text-[12px] font-semibold text-muted-foreground">
                        {c.duration}
                      </span>
                    )}
                    {c.instructor && (
                      <span className="text-[12px] font-semibold text-muted-foreground">
                        by {c.instructor}
                      </span>
                    )}
                    {!c.is_published && (
                      <span className="text-[10.5px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                        Draft
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    title={c.is_published ? "Unpublish" : "Publish"}
                    onClick={() => togglePublishClass(c)}
                    className="w-9 h-9 rounded-full inline-flex items-center justify-center bg-primary-tint text-primary hover:bg-primary/15"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => openEditClass(c)}
                    className="w-9 h-9 rounded-full inline-flex items-center justify-center bg-primary-tint text-primary hover:bg-primary/15"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => removeClass(c.id)}
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

      {/* COURSES TAB */}
      {tab === "courses" && (
        <div className="space-y-3">
          {courses.length === 0 && (
            <div className="bg-card border border-dashed border-border rounded-2xl py-16 text-center text-sm text-muted-foreground">
              No courses yet. Click "New Course" to create a course bundle.
            </div>
          )}
          {courses.map((c) => (
            <div
              key={c.id}
              className="bg-card border border-border rounded-2xl p-4 md:p-5 hover:border-primary/40 transition-colors cursor-pointer"
              onClick={() => setSelectedCourseId(c.id)}
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
                    onClick={() => togglePublishCourse(c)}
                    className="w-9 h-9 rounded-full inline-flex items-center justify-center bg-primary-tint text-primary hover:bg-primary/15"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => openEditCourse(c)}
                    className="w-9 h-9 rounded-full inline-flex items-center justify-center bg-primary-tint text-primary hover:bg-primary/15"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => removeCourse(c.id)}
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

      {/* COURSE DIALOG */}
      <Dialog open={courseOpen} onOpenChange={setCourseOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {editingCourse?.id ? "Edit Course" : "New Course"}
            </DialogTitle>
          </DialogHeader>
          {editingCourse && (
            <div className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input
                  value={editingCourse.title || ""}
                  onChange={(e) => setEditingCourse({ ...editingCourse, title: e.target.value })}
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  rows={3}
                  value={editingCourse.description || ""}
                  onChange={(e) => setEditingCourse({ ...editingCourse, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label>Level</Label>
                  <Select
                    value={editingCourse.level || ""}
                    onValueChange={(v) => setEditingCourse({ ...editingCourse, level: v })}
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
                    value={editingCourse.category || ""}
                    onChange={(e) => setEditingCourse({ ...editingCourse, category: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Price (₦)</Label>
                  <Input
                    type="number"
                    value={editingCourse.price ?? 0}
                    onChange={(e) =>
                      setEditingCourse({ ...editingCourse, price: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>Instructor name</Label>
                  <Input
                    value={editingCourse.instructor || ""}
                    onChange={(e) =>
                      setEditingCourse({ ...editingCourse, instructor: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Instructor avatar URL</Label>
                  <Input
                    value={editingCourse.instructor_avatar_url || ""}
                    onChange={(e) =>
                      setEditingCourse({ ...editingCourse, instructor_avatar_url: e.target.value })
                    }
                  />
                </div>
              </div>
              <div>
                <Label>Course Thumbnail URL</Label>
                <Input
                  value={editingCourse.image_url || ""}
                  onChange={(e) => setEditingCourse({ ...editingCourse, image_url: e.target.value })}
                />
              </div>
              <div className="flex gap-6 pt-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!editingCourse.is_published}
                    onChange={(e) =>
                      setEditingCourse({ ...editingCourse, is_published: e.target.checked })
                    }
                  />
                  Published
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!editingCourse.is_featured}
                    onChange={(e) =>
                      setEditingCourse({ ...editingCourse, is_featured: e.target.checked })
                    }
                  />
                  Featured
                </label>
              </div>
              <p className="text-xs text-muted-foreground">
                Tip: After saving, click on the course to add lessons (from existing classes or new videos).
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCourseOpen(false)}>Cancel</Button>
            <Button
              onClick={saveCourse}
              className="rounded-full bg-primary hover:bg-primary-dark text-primary-foreground"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CLASS DIALOG */}
      <Dialog open={classOpen} onOpenChange={setClassOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {editingClass?.id ? "Edit Class" : "New Class"}
            </DialogTitle>
          </DialogHeader>
          {editingClass && (
            <div className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input
                  value={editingClass.title || ""}
                  onChange={(e) => setEditingClass({ ...editingClass, title: e.target.value })}
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  rows={3}
                  value={editingClass.description || ""}
                  onChange={(e) =>
                    setEditingClass({ ...editingClass, description: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Video URL (YouTube, Loom, MP4…)</Label>
                <Input
                  value={editingClass.video_url || ""}
                  onChange={(e) =>
                    setEditingClass({ ...editingClass, video_url: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Thumbnail URL</Label>
                <Input
                  value={editingClass.thumbnail_url || ""}
                  onChange={(e) =>
                    setEditingClass({ ...editingClass, thumbnail_url: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label>Level</Label>
                  <Select
                    value={editingClass.level || ""}
                    onValueChange={(v) => setEditingClass({ ...editingClass, level: v })}
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
                  <Label>Duration</Label>
                  <Input
                    value={editingClass.duration || ""}
                    onChange={(e) =>
                      setEditingClass({ ...editingClass, duration: e.target.value })
                    }
                    placeholder="e.g. 12m 30s"
                  />
                </div>
                <div>
                  <Label>Category</Label>
                  <Input
                    value={editingClass.category || ""}
                    onChange={(e) =>
                      setEditingClass({ ...editingClass, category: e.target.value })
                    }
                  />
                </div>
              </div>
              <div>
                <Label>Instructor</Label>
                <Input
                  value={editingClass.instructor || ""}
                  onChange={(e) =>
                    setEditingClass({ ...editingClass, instructor: e.target.value })
                  }
                />
              </div>
              <label className="flex items-center gap-2 text-sm pt-2">
                <input
                  type="checkbox"
                  checked={!!editingClass.is_published}
                  onChange={(e) =>
                    setEditingClass({ ...editingClass, is_published: e.target.checked })
                  }
                />
                Published
              </label>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setClassOpen(false)}>Cancel</Button>
            <Button
              onClick={saveClass}
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
