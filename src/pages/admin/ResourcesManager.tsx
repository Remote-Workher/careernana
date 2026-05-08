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
import { useSEO } from "@/components/SEO";

import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  Bell,
  FileText,
  FolderPlus,
  MessageSquare,
  Upload,
  Sparkles,
  Loader2,
  X,
} from "lucide-react";

type Resource = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  type: string | null;
  format: string | null;
  url: string | null;
  file_url: string | null;
  image_url: string | null;
  price: number | null;
  duration: string | null;
  unlock_month: string | null;
  is_published: boolean;
  is_featured: boolean;
  tracks: string[] | null;
};

const TYPES = ["Workbook", "Guide", "Template", "PDF", "Article", "Video"];
const FORMATS = ["PDF", "Doc", "Video", "Audio", "Link"];

export default function ResourcesManager() {
  useSEO({ title: "Manage Resources" });
  const { toast } = useToast();
  const [tab, setTab] = useState<"resources" | "categories" | "requests">(
    "resources",
  );
  const [rows, setRows] = useState<Resource[]>([]);
  const [refresh, setRefresh] = useState(0);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Resource> | null>(null);
  const [uploading, setUploading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 25 MB", variant: "destructive" });
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop() || "pdf";
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("resource-files")
      .upload(path, file, { contentType: file.type, upsert: false });
    if (upErr) {
      toast({ title: "Upload failed", description: upErr.message, variant: "destructive" });
      setUploading(false);
      return;
    }
    const { data: pub } = supabase.storage.from("resource-files").getPublicUrl(path);
    setEditing((prev) => ({ ...(prev ?? {}), file_url: pub.publicUrl }));
    setUploading(false);
    toast({ title: "File uploaded", description: file.name });
  };

  const handleAiDescription = async () => {
    if (!editing?.title?.trim()) {
      toast({ title: "Add a title first", variant: "destructive" });
      return;
    }
    setAiLoading(true);
    const { data, error } = await supabase.functions.invoke("generate-resource-description", {
      body: {
        title: editing.title,
        type: editing.type,
        category: editing.category,
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
    const desc = (data as any)?.description;
    if (desc) {
      setEditing((prev) => ({ ...(prev ?? {}), description: desc }));
      toast({ title: "Description generated" });
    }
  };

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("resources")
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
      type: "Workbook",
      format: "PDF",
      price: 2000,
      url: "",
      file_url: "",
      image_url: "",
      duration: "",
      unlock_month: "Available now",
      is_published: true,
      is_featured: false,
      tracks: [],
    });
    setOpen(true);
  };

  const openEdit = (r: Resource) => {
    setEditing({ ...r });
    setOpen(true);
  };

  const togglePublish = async (r: Resource) => {
    await supabase
      .from("resources")
      .update({ is_published: !r.is_published })
      .eq("id", r.id);
    setRefresh((x) => x + 1);
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this resource? This cannot be undone.")) return;
    const { error } = await supabase.from("resources").delete().eq("id", id);
    if (error)
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    else {
      toast({ title: "Resource deleted" });
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
      ({ error } = await supabase
        .from("resources")
        .update(payload)
        .eq("id", id));
    else ({ error } = await supabase.from("resources").insert(payload));
    if (error)
      toast({
        title: "Save failed",
        description: error.message,
        variant: "destructive",
      });
    else {
      toast({ title: id ? "Resource updated" : "Resource created" });
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[26px] sm:text-[30px] font-bold text-foreground leading-tight">
            Resources
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage templates, guides, and categories. All resources are paid for
            Standard members; Premium members get them free.
          </p>
        </div>
        <Button
          onClick={openNew}
          className="rounded-full bg-primary hover:bg-primary-dark text-primary-foreground h-11 px-5 text-sm font-semibold"
        >
          <Plus className="w-4 h-4 mr-1.5" /> Add Resource
        </Button>
      </div>

      {/* Pill tabs */}
      <div className="flex items-center gap-3 flex-wrap">
        {tabBtn("resources", "Resources", <FileText className="w-4 h-4" />, rows.length)}
        {tabBtn("categories", "Categories", <FolderPlus className="w-4 h-4" />, 0)}
        {tabBtn("requests", "Requests", <MessageSquare className="w-4 h-4" />, 0)}
      </div>

      {tab === "resources" && (
        <div className="space-y-3">
          {rows.length === 0 && (
            <div className="bg-card border border-dashed border-border rounded-2xl py-16 text-center text-sm text-muted-foreground">
              No resources yet. Click "Add Resource" to create the first one.
            </div>
          )}
          {rows.map((r) => (
            <div
              key={r.id}
              className="bg-card border border-border rounded-2xl p-4 md:p-5"
            >
              <div className="flex gap-4 items-start">
                <div className="w-16 h-16 md:w-[68px] md:h-[68px] rounded-2xl overflow-hidden bg-secondary-tint shrink-0 flex items-center justify-center">
                  {r.image_url ? (
                    <img
                      src={r.image_url}
                      alt={r.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <FileText className="w-6 h-6 text-muted-foreground" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-base md:text-lg font-bold text-foreground">
                    {r.title}
                  </h3>
                  {r.description && (
                    <p className="text-[13.5px] text-muted-foreground mt-1 leading-relaxed">
                      {r.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    {r.type && (
                      <span className="text-[11.5px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-primary-tint text-primary">
                        {r.type}
                      </span>
                    )}
                    {r.category && (
                      <span className="text-[11.5px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-primary-tint text-primary">
                        {r.category}
                      </span>
                    )}
                    {r.format && (
                      <span className="text-[11.5px] font-semibold text-muted-foreground px-2 py-1">
                        {r.format}
                      </span>
                    )}
                    <span className="text-[13px] font-bold text-primary">
                      ₦{(r.price ?? 0).toLocaleString()}
                    </span>
                    {!r.is_published && (
                      <span className="text-[10.5px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                        Draft
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    title="Notify members"
                    className="w-9 h-9 rounded-full inline-flex items-center justify-center bg-primary-tint text-primary hover:bg-primary/15"
                  >
                    <Bell className="w-4 h-4" />
                  </button>
                  <button
                    title={r.is_published ? "Unpublish" : "Publish"}
                    onClick={() => togglePublish(r)}
                    className="w-9 h-9 rounded-full inline-flex items-center justify-center bg-primary-tint text-primary hover:bg-primary/15"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    title="Edit"
                    onClick={() => openEdit(r)}
                    className="w-9 h-9 rounded-full inline-flex items-center justify-center bg-primary-tint text-primary hover:bg-primary/15"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    title="Delete"
                    onClick={() => remove(r.id)}
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
          Member resource requests will appear here.
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {editing?.id ? "Edit Resource" : "Add Resource"}
            </DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input
                  value={editing.title || ""}
                  onChange={(e) =>
                    setEditing({ ...editing, title: e.target.value })
                  }
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label>Description</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleAiDescription}
                    disabled={aiLoading || !editing.title?.trim()}
                    className="h-7 px-2 text-xs text-primary hover:text-primary"
                  >
                    {aiLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 mr-1" />
                    )}
                    {aiLoading ? "Writing…" : "Write with AI"}
                  </Button>
                </div>
                <Textarea
                  rows={3}
                  value={editing.description || ""}
                  onChange={(e) =>
                    setEditing({ ...editing, description: e.target.value })
                  }
                  placeholder="What members will get from this resource…"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label>Type</Label>
                  <Select
                    value={editing.type || ""}
                    onValueChange={(v) => setEditing({ ...editing, type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select…" />
                    </SelectTrigger>
                    <SelectContent>
                      {TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Format</Label>
                  <Select
                    value={editing.format || ""}
                    onValueChange={(v) => setEditing({ ...editing, format: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select…" />
                    </SelectTrigger>
                    <SelectContent>
                      {FORMATS.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Price (₦)</Label>
                  <Input
                    type="number"
                    value={editing.price ?? 0}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        price: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>
              <div>
                <Label>Resource file (PDF, Doc, etc.)</Label>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <label
                      className={`inline-flex items-center gap-2 px-3 h-10 rounded-md border border-dashed border-border bg-card hover:bg-muted text-sm font-medium cursor-pointer ${
                        uploading ? "opacity-60 pointer-events-none" : ""
                      }`}
                    >
                      {uploading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4" />
                      )}
                      {uploading ? "Uploading…" : "Upload file"}
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,application/pdf"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleFileUpload(f);
                          e.currentTarget.value = "";
                        }}
                      />
                    </label>
                    {editing.file_url && (
                      <button
                        type="button"
                        onClick={() => setEditing({ ...editing, file_url: "" })}
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
                      >
                        <X className="w-3.5 h-3.5" /> Remove
                      </button>
                    )}
                  </div>
                  <Input
                    value={editing.file_url || ""}
                    onChange={(e) =>
                      setEditing({ ...editing, file_url: e.target.value })
                    }
                    placeholder="…or paste a URL"
                  />
                  {editing.file_url && (
                    <a
                      href={editing.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-primary hover:underline truncate"
                    >
                      Preview file ↗
                    </a>
                  )}
                </div>
              </div>
              <div>
                <Label>Thumbnail Image URL</Label>
                <Input
                  value={editing.image_url || ""}
                  onChange={(e) =>
                    setEditing({ ...editing, image_url: e.target.value })
                  }
                  placeholder="https://…"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>Duration</Label>
                  <Input
                    value={editing.duration || ""}
                    onChange={(e) =>
                      setEditing({ ...editing, duration: e.target.value })
                    }
                    placeholder="e.g. 4m 33s"
                  />
                </div>
                <div>
                  <Label>Unlock Month</Label>
                  <Input
                    value={editing.unlock_month || ""}
                    onChange={(e) =>
                      setEditing({ ...editing, unlock_month: e.target.value })
                    }
                    placeholder="Available now"
                  />
                </div>
              </div>
              <div>
                <Label>Category</Label>
                <Input
                  value={editing.category || ""}
                  onChange={(e) =>
                    setEditing({ ...editing, category: e.target.value })
                  }
                  placeholder="e.g. Clarity, Remote-Work"
                />
              </div>
              <TracksField
                value={editing.tracks || []}
                onChange={(next) => setEditing({ ...editing, tracks: next })}
              />
              <div className="flex gap-6 pt-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!editing.is_published}
                    onChange={(e) =>
                      setEditing({ ...editing, is_published: e.target.checked })
                    }
                  />
                  Published
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!editing.is_featured}
                    onChange={(e) =>
                      setEditing({ ...editing, is_featured: e.target.checked })
                    }
                  />
                  Featured
                </label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
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
