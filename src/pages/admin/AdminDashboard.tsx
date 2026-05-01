import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Building2, DollarSign, Briefcase, Plus, Pencil, Trash2, LogOut, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Stats = {
  talents: number;
  recruiters: number;
  paying: number;
  revenueNgn: number;
  activeJobs: number;
  hireRequests: number;
};

type ContentType = "live_sessions" | "courses" | "challenges" | "resources";

const contentSchemas: Record<ContentType, { label: string; fields: { name: string; label: string; type: "text" | "textarea" | "number" | "datetime" | "select"; options?: string[] }[] }> = {
  live_sessions: {
    label: "Live Sessions",
    fields: [
      { name: "title", label: "Title", type: "text" },
      { name: "description", label: "Description", type: "textarea" },
      { name: "host", label: "Host", type: "text" },
      { name: "category", label: "Category", type: "text" },
      { name: "starts_at", label: "Starts at", type: "datetime" },
      { name: "duration_minutes", label: "Duration (min)", type: "number" },
      { name: "join_url", label: "Join URL", type: "text" },
      { name: "image_url", label: "Image URL", type: "text" },
    ],
  },
  courses: {
    label: "Courses",
    fields: [
      { name: "title", label: "Title", type: "text" },
      { name: "description", label: "Description", type: "textarea" },
      { name: "instructor", label: "Instructor", type: "text" },
      { name: "category", label: "Category", type: "text" },
      { name: "level", label: "Level", type: "select", options: ["Beginner", "Intermediate", "Advanced"] },
      { name: "lessons", label: "Lessons", type: "number" },
      { name: "price", label: "Price (₦)", type: "number" },
      { name: "image_url", label: "Image URL", type: "text" },
    ],
  },
  challenges: {
    label: "Challenges",
    fields: [
      { name: "title", label: "Title", type: "text" },
      { name: "description", label: "Description", type: "textarea" },
      { name: "category", label: "Category", type: "text" },
      { name: "difficulty", label: "Difficulty", type: "select", options: ["Beginner", "Intermediate", "Advanced"] },
      { name: "duration", label: "Duration", type: "text" },
      { name: "prize", label: "Prize", type: "text" },
      { name: "starts_at", label: "Starts at", type: "datetime" },
      { name: "ends_at", label: "Ends at", type: "datetime" },
      { name: "image_url", label: "Image URL", type: "text" },
    ],
  },
  resources: {
    label: "Resources",
    fields: [
      { name: "title", label: "Title", type: "text" },
      { name: "description", label: "Description", type: "textarea" },
      { name: "category", label: "Category", type: "text" },
      { name: "type", label: "Type", type: "select", options: ["Article", "Guide", "PDF", "Video", "Template"] },
      { name: "url", label: "URL", type: "text" },
      { name: "image_url", label: "Image URL", type: "text" },
    ],
  },
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tab, setTab] = useState("overview");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/admin/login", { replace: true }); return; }
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
      if (!data) { setIsAdmin(false); setChecking(false); return; }
      setIsAdmin(true);
      setChecking(false);
    })();
  }, [navigate]);

  if (checking) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="p-8 max-w-md text-center">
          <h1 className="text-xl font-bold mb-2">Access denied</h1>
          <p className="text-sm text-muted-foreground mb-4">You don't have admin access to this area.</p>
          <Button onClick={() => navigate("/")}>Go home</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border px-4 md:px-7 h-[58px] flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold">A</div>
          <div>
            <div className="text-sm font-bold">Admin Dashboard</div>
            <div className="text-[11px] text-muted-foreground">Remote Workher team</div>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={async () => { await supabase.auth.signOut(); navigate("/"); }}>
          <LogOut className="w-4 h-4 mr-1.5" /> Sign out
        </Button>
      </header>

      <main className="p-4 md:p-6 max-w-7xl mx-auto">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-6 flex flex-wrap h-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="talents">Talents</TabsTrigger>
            <TabsTrigger value="recruiters">Recruiters</TabsTrigger>
            <TabsTrigger value="hire">Hire-for-me</TabsTrigger>
            <TabsTrigger value="jobs">Featured Jobs</TabsTrigger>
            <TabsTrigger value="live_sessions">Sessions</TabsTrigger>
            <TabsTrigger value="courses">Courses</TabsTrigger>
            <TabsTrigger value="challenges">Challenges</TabsTrigger>
            <TabsTrigger value="resources">Resources</TabsTrigger>
          </TabsList>

          <TabsContent value="overview"><Overview /></TabsContent>
          <TabsContent value="talents"><TalentsList /></TabsContent>
          <TabsContent value="recruiters"><RecruitersList /></TabsContent>
          <TabsContent value="hire"><HireRequests /></TabsContent>
          <TabsContent value="jobs"><FeaturedJobsAdmin /></TabsContent>
          <TabsContent value="live_sessions"><ContentManager type="live_sessions" /></TabsContent>
          <TabsContent value="courses"><ContentManager type="courses" /></TabsContent>
          <TabsContent value="challenges"><ContentManager type="challenges" /></TabsContent>
          <TabsContent value="resources"><ContentManager type="resources" /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function Overview() {
  const [stats, setStats] = useState<Stats | null>(null);
  useEffect(() => {
    (async () => {
      const now = new Date().toISOString();
      const [talents, recruiters, paying, jobs, hire, paidHires] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("recruiter_profiles").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }).gt("paid_until", now),
        supabase.from("recruiter_jobs").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("hire_for_me_requests").select("id", { count: "exact", head: true }),
        supabase.from("hire_for_me_requests").select("price_amount").eq("payment_status", "paid"),
      ]);
      const revenue = (paidHires.data || []).reduce((a, r: any) => a + (r.price_amount || 0), 0);
      setStats({
        talents: talents.count || 0,
        recruiters: recruiters.count || 0,
        paying: paying.count || 0,
        revenueNgn: revenue,
        activeJobs: jobs.count || 0,
        hireRequests: hire.count || 0,
      });
    })();
  }, []);

  if (!stats) return <div className="text-sm text-muted-foreground">Loading…</div>;

  const cards = [
    { label: "Talents", value: stats.talents, icon: Users, tone: "bg-pink-50 text-pink-700" },
    { label: "Recruiters", value: stats.recruiters, icon: Building2, tone: "bg-purple-50 text-purple-700" },
    { label: "Paying members", value: stats.paying, icon: Star, tone: "bg-amber-50 text-amber-700" },
    { label: "Hire-for-me revenue", value: `₦${stats.revenueNgn.toLocaleString()}`, icon: DollarSign, tone: "bg-green-50 text-green-700" },
    { label: "Active jobs", value: stats.activeJobs, icon: Briefcase, tone: "bg-blue-50 text-blue-700" },
    { label: "Hire requests", value: stats.hireRequests, icon: Building2, tone: "bg-rose-50 text-rose-700" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {cards.map((c) => (
        <Card key={c.label} className="p-5">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${c.tone}`}><c.icon className="w-5 h-5" /></div>
          <div className="text-2xl font-bold">{c.value}</div>
          <div className="text-xs text-muted-foreground mt-1">{c.label}</div>
        </Card>
      ))}
    </div>
  );
}

function TalentsList() {
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("profiles").select("id, full_name, email, current_role, target_role, paid_until, created_at").order("created_at", { ascending: false }).limit(500);
      setRows(data || []);
    })();
  }, []);
  const filtered = rows.filter(r => !q || (r.full_name || "").toLowerCase().includes(q.toLowerCase()) || (r.email || "").toLowerCase().includes(q.toLowerCase()));
  return (
    <Card className="p-4">
      <Input placeholder="Search name or email…" value={q} onChange={e => setQ(e.target.value)} className="mb-3 max-w-sm" />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground border-b">
            <tr><th className="py-2 pr-4">Name</th><th className="py-2 pr-4">Email</th><th className="py-2 pr-4">Current role</th><th className="py-2 pr-4">Target</th><th className="py-2 pr-4">Status</th><th className="py-2">Joined</th></tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id} className="border-b last:border-0">
                <td className="py-2 pr-4">{r.full_name || "—"}</td>
                <td className="py-2 pr-4">{r.email}</td>
                <td className="py-2 pr-4">{r.current_role || "—"}</td>
                <td className="py-2 pr-4">{r.target_role || "—"}</td>
                <td className="py-2 pr-4">{r.paid_until && new Date(r.paid_until) > new Date() ? <Badge>Paid</Badge> : <Badge variant="secondary">Free</Badge>}</td>
                <td className="py-2 text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="text-center py-6 text-sm text-muted-foreground">No talents found.</div>}
      </div>
    </Card>
  );
}

function RecruitersList() {
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("recruiter_profiles").select("id, contact_name, email, company_name, industry, created_at").order("created_at", { ascending: false }).limit(500);
      setRows(data || []);
    })();
  }, []);
  const filtered = rows.filter(r => !q || (r.company_name || "").toLowerCase().includes(q.toLowerCase()) || (r.email || "").toLowerCase().includes(q.toLowerCase()));
  return (
    <Card className="p-4">
      <Input placeholder="Search company or email…" value={q} onChange={e => setQ(e.target.value)} className="mb-3 max-w-sm" />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground border-b">
            <tr><th className="py-2 pr-4">Company</th><th className="py-2 pr-4">Contact</th><th className="py-2 pr-4">Email</th><th className="py-2 pr-4">Industry</th><th className="py-2">Joined</th></tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id} className="border-b last:border-0">
                <td className="py-2 pr-4 font-medium">{r.company_name || "—"}</td>
                <td className="py-2 pr-4">{r.contact_name || "—"}</td>
                <td className="py-2 pr-4">{r.email}</td>
                <td className="py-2 pr-4">{r.industry || "—"}</td>
                <td className="py-2 text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="text-center py-6 text-sm text-muted-foreground">No recruiters found.</div>}
      </div>
    </Card>
  );
}

function HireRequests() {
  const { toast } = useToast();
  const [rows, setRows] = useState<any[]>([]);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("hire_for_me_requests").select("*").order("created_at", { ascending: false });
      setRows(data || []);
    })();
  }, [refresh]);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("hire_for_me_requests").update({ status }).eq("id", id);
    if (error) toast({ title: "Update failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Status updated" }); setRefresh(r => r + 1); }
  };

  const statuses = ["submitted", "in_progress", "shortlisted", "completed", "cancelled"];
  return (
    <div className="space-y-3">
      {rows.length === 0 && <Card className="p-6 text-center text-sm text-muted-foreground">No hire-for-me requests yet.</Card>}
      {rows.map(r => (
        <Card key={r.id} className="p-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h3 className="font-semibold">{r.role_title}</h3>
                <Badge variant={r.payment_status === "paid" ? "default" : "secondary"}>{r.payment_status}</Badge>
                {r.pricing_tier && <Badge variant="outline">{r.pricing_tier}</Badge>}
                {r.price_amount ? <span className="text-xs text-muted-foreground">₦{r.price_amount.toLocaleString()}</span> : null}
              </div>
              <div className="text-xs text-muted-foreground mb-2">{r.contact_name || "—"} · {r.contact_email || "—"} · {r.contact_phone || "—"}</div>
              <div className="text-xs text-muted-foreground grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1">
                <div><b>Seniority:</b> {r.seniority || "—"}</div>
                <div><b>Type:</b> {r.employment_type || "—"}</div>
                <div><b>Work:</b> {r.work_type || "—"}</div>
                <div><b>Location:</b> {r.location || "—"}</div>
                <div><b>Headcount:</b> {r.headcount}</div>
                <div><b>Timeline:</b> {r.timeline || "—"}</div>
                <div><b>Salary:</b> {r.salary_min ? `${r.salary_min}–${r.salary_max}` : "—"}</div>
                <div><b>Submitted:</b> {new Date(r.created_at).toLocaleDateString()}</div>
              </div>
              {r.role_description && <p className="text-xs mt-2 text-foreground/80 line-clamp-3">{r.role_description}</p>}
            </div>
            <div className="shrink-0">
              <Select value={r.status} onValueChange={(v) => updateStatus(r.id, v)}>
                <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>{statuses.map(s => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function FeaturedJobsAdmin() {
  const { toast } = useToast();
  const [jobs, setJobs] = useState<any[]>([]);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("recruiter_jobs").select("id, title, status, is_featured, salary_min, salary_max, created_at, user_id").order("created_at", { ascending: false }).limit(200);
      const ids = [...new Set((data || []).map((j: any) => j.user_id))];
      const { data: recs } = await supabase.from("recruiter_profiles").select("user_id, company_name").in("user_id", ids);
      const map = new Map((recs || []).map(r => [r.user_id, r.company_name]));
      setJobs((data || []).map((j: any) => ({ ...j, company: map.get(j.user_id) || "—" })));
    })();
  }, [refresh]);

  const toggleFeatured = async (id: string, val: boolean) => {
    const { error } = await supabase.from("recruiter_jobs").update({ is_featured: val }).eq("id", id);
    if (error) toast({ title: "Update failed", description: error.message, variant: "destructive" });
    else { toast({ title: val ? "Marked as featured" : "Removed from featured" }); setRefresh(r => r + 1); }
  };

  return (
    <Card className="p-4">
      <p className="text-xs text-muted-foreground mb-3">Featured jobs appear first in the home page "Featured jobs" section.</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground border-b">
            <tr><th className="py-2 pr-4">Title</th><th className="py-2 pr-4">Company</th><th className="py-2 pr-4">Status</th><th className="py-2 pr-4">Posted</th><th className="py-2">Featured</th></tr>
          </thead>
          <tbody>
            {jobs.map(j => (
              <tr key={j.id} className="border-b last:border-0">
                <td className="py-2 pr-4 font-medium">{j.title}</td>
                <td className="py-2 pr-4">{j.company}</td>
                <td className="py-2 pr-4"><Badge variant={j.status === "active" ? "default" : "secondary"}>{j.status}</Badge></td>
                <td className="py-2 pr-4 text-muted-foreground">{new Date(j.created_at).toLocaleDateString()}</td>
                <td className="py-2"><Switch checked={!!j.is_featured} onCheckedChange={(v) => toggleFeatured(j.id, v)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {jobs.length === 0 && <div className="text-center py-6 text-sm text-muted-foreground">No jobs yet.</div>}
      </div>
    </Card>
  );
}

function ContentManager({ type }: { type: ContentType }) {
  const { toast } = useToast();
  const schema = contentSchemas[type];
  const [rows, setRows] = useState<any[]>([]);
  const [refresh, setRefresh] = useState(0);
  const [editing, setEditing] = useState<any | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from(type).select("*").order("created_at", { ascending: false });
      setRows(data || []);
    })();
  }, [type, refresh]);

  const openNew = () => { setEditing({ is_published: true, is_featured: false }); setOpen(true); };
  const openEdit = (r: any) => { setEditing({ ...r }); setOpen(true); };
  const remove = async (id: string) => {
    if (!confirm("Delete this item?")) return;
    const { error } = await supabase.from(type).delete().eq("id", id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Deleted" }); setRefresh(r => r + 1); }
  };
  const save = async () => {
    const payload: any = { ...editing };
    // strip empty strings to null for nullable fields
    Object.keys(payload).forEach(k => { if (payload[k] === "") payload[k] = null; });
    const id = payload.id;
    delete payload.id; delete payload.created_at; delete payload.updated_at;
    let error;
    if (id) ({ error } = await (supabase.from(type) as any).update(payload).eq("id", id));
    else ({ error } = await (supabase.from(type) as any).insert(payload));
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else { toast({ title: id ? "Updated" : "Created" }); setOpen(false); setEditing(null); setRefresh(r => r + 1); }
  };
  const toggleFlag = async (id: string, field: "is_featured" | "is_published", val: boolean) => {
    await (supabase.from(type) as any).update({ [field]: val }).eq("id", id);
    setRefresh(r => r + 1);
  };

  const fmtDt = (v: string | null) => v ? new Date(v).toISOString().slice(0, 16) : "";

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold">{schema.label}</h2>
        <Button size="sm" onClick={openNew}><Plus className="w-4 h-4 mr-1" /> New</Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground border-b">
            <tr><th className="py-2 pr-4">Title</th><th className="py-2 pr-4">Category</th><th className="py-2 pr-4">Featured</th><th className="py-2 pr-4">Published</th><th className="py-2">Actions</th></tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-b last:border-0">
                <td className="py-2 pr-4 font-medium">{r.title}</td>
                <td className="py-2 pr-4">{r.category || "—"}</td>
                <td className="py-2 pr-4"><Switch checked={!!r.is_featured} onCheckedChange={(v) => toggleFlag(r.id, "is_featured", v)} /></td>
                <td className="py-2 pr-4"><Switch checked={!!r.is_published} onCheckedChange={(v) => toggleFlag(r.id, "is_published", v)} /></td>
                <td className="py-2 flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(r)}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => remove(r.id)}><Trash2 className="w-4 h-4" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <div className="text-center py-6 text-sm text-muted-foreground">Nothing yet — click New.</div>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit" : "New"} {schema.label.replace(/s$/, "")}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              {schema.fields.map(f => (
                <div key={f.name}>
                  <Label>{f.label}</Label>
                  {f.type === "textarea" ? (
                    <Textarea value={editing[f.name] ?? ""} onChange={e => setEditing({ ...editing, [f.name]: e.target.value })} rows={3} />
                  ) : f.type === "select" ? (
                    <Select value={editing[f.name] ?? ""} onValueChange={(v) => setEditing({ ...editing, [f.name]: v })}>
                      <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                      <SelectContent>{f.options!.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                    </Select>
                  ) : f.type === "datetime" ? (
                    <Input type="datetime-local" value={fmtDt(editing[f.name])} onChange={e => setEditing({ ...editing, [f.name]: e.target.value ? new Date(e.target.value).toISOString() : null })} />
                  ) : f.type === "number" ? (
                    <Input type="number" value={editing[f.name] ?? ""} onChange={e => setEditing({ ...editing, [f.name]: e.target.value === "" ? null : Number(e.target.value) })} />
                  ) : (
                    <Input value={editing[f.name] ?? ""} onChange={e => setEditing({ ...editing, [f.name]: e.target.value })} />
                  )}
                </div>
              ))}
              <div className="flex gap-6 pt-2">
                <label className="flex items-center gap-2 text-sm"><Switch checked={!!editing.is_featured} onCheckedChange={v => setEditing({ ...editing, is_featured: v })} /> Featured</label>
                <label className="flex items-center gap-2 text-sm"><Switch checked={!!editing.is_published} onCheckedChange={v => setEditing({ ...editing, is_published: v })} /> Published</label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
