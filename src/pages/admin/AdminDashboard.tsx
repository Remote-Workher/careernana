import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Building2, DollarSign, Briefcase, Plus, Pencil, Trash2, LogOut, Star, LayoutDashboard, UserCircle, Calendar, GraduationCap, BookOpen, Trophy, FolderOpen, Bell, ArrowLeft, TrendingUp, Sparkles, ArrowUpRight, CreditCard, Users2, PlayCircle } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useToast } from "@/hooks/use-toast";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";

type Stats = {
  talents: number;
  recruiters: number;
  paying: number;
  revenueNgn: number;
  activeJobs: number;
  hireRequests: number;
};

type ContentType = "live_sessions" | "on_demand" | "courses" | "challenges" | "resources";

// Maps each admin content type to the underlying database table.
const contentTables: Record<ContentType, "live_sessions" | "courses" | "challenges" | "resources"> = {
  live_sessions: "live_sessions",
  on_demand: "live_sessions", // on-demand classes are stored in live_sessions with a recording
  courses: "courses",
  challenges: "challenges",
  resources: "resources",
};

// When creating an item, pre-seed these defaults.
const contentDefaults: Partial<Record<ContentType, Record<string, any>>> = {
  on_demand: {
    platform: "youtube",
    duration_minutes: 30,
    // Push starts_at into the past so the LiveSessions page categorises it as "On Demand"
    starts_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
};

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
  on_demand: {
    label: "On-Demand Classes",
    fields: [
      { name: "title", label: "Title", type: "text" },
      { name: "description", label: "Description", type: "textarea" },
      { name: "host", label: "Host / Instructor", type: "text" },
      { name: "host_role", label: "Host role", type: "text" },
      { name: "category", label: "Category", type: "text" },
      { name: "platform", label: "Platform", type: "select", options: ["youtube", "vimeo", "loom", "other"] },
      { name: "recording_youtube_id", label: "Recording ID or URL", type: "text" },
      { name: "duration_minutes", label: "Duration (min)", type: "number" },
      { name: "image_url", label: "Cover image URL", type: "text" },
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

  const navItems = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "talents", label: "Talents", icon: Users },
    { id: "recruiters", label: "Recruiters", icon: Building2 },
    { id: "hire", label: "Hire-for-me", icon: UserCircle },
    { id: "jobs", label: "Featured Jobs", icon: Briefcase },
    { id: "live_sessions", label: "Live Sessions", icon: Calendar },
    { id: "on_demand", label: "On-Demand Classes", icon: PlayCircle },
    { id: "courses", label: "Courses", icon: GraduationCap },
    { id: "challenges", label: "Challenges", icon: Trophy },
    { id: "resources", label: "Resources", icon: FolderOpen },
  ];

  const currentLabel = navItems.find((n) => n.id === tab)?.label || "Overview";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <Sidebar collapsible="icon">
          <SidebarHeader className="border-b border-sidebar-border">
            <div className="flex items-center gap-2 px-2 py-3">
              <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0">A</div>
              <div className="min-w-0 group-data-[collapsible=icon]:hidden">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Admin Panel</div>
                <div className="text-sm font-bold truncate">Remote Workher</div>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.map((item) => (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        isActive={tab === item.id}
                        onClick={() => setTab(item.id)}
                        tooltip={item.label}
                      >
                        <item.icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t border-sidebar-border">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => navigate("/")} tooltip="Back to app">
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to app</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={async () => { await supabase.auth.signOut(); navigate("/"); }} tooltip="Sign out">
                  <LogOut className="w-4 h-4" />
                  <span>Sign out</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="bg-card border-b border-border px-4 md:px-6 h-[58px] flex items-center justify-between sticky top-0 z-40">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Admin Panel</div>
                <div className="text-sm font-bold">{currentLabel}</div>
              </div>
            </div>
          </header>

          <main className="p-4 md:p-6 flex-1 overflow-auto">
            <div className="w-full">
              {tab === "overview" && <Overview />}
              {tab === "talents" && <TalentsList />}
              {tab === "recruiters" && <RecruitersList />}
              {tab === "hire" && <HireRequests />}
              {tab === "jobs" && <FeaturedJobsAdmin />}
              {tab === "live_sessions" && <ContentManager type="live_sessions" />}
              {tab === "on_demand" && <ContentManager type="on_demand" />}
              {tab === "courses" && <ContentManager type="courses" />}
              {tab === "challenges" && <ContentManager type="challenges" />}
              {tab === "resources" && <ContentManager type="resources" />}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function Overview() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [growth, setGrowth] = useState<{ month: string; talents: number; recruiters: number }[]>([]);
  const [recentTalents, setRecentTalents] = useState<any[]>([]);
  const [recentRecruiters, setRecentRecruiters] = useState<any[]>([]);
  const [recentJobs, setRecentJobs] = useState<any[]>([]);
  const [recentAppsList, setRecentAppsList] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const now = new Date().toISOString();
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
      sixMonthsAgo.setDate(1);

      const [talents, recruiters, paying, jobs, hire, paidHires, allTalents, allRecruiters, talentRows, recruiterRows, jobRows, appsRows, appsCount] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("recruiter_profiles").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }).gt("paid_until", now),
        supabase.from("recruiter_jobs").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("hire_for_me_requests").select("id", { count: "exact", head: true }),
        supabase.from("hire_for_me_requests").select("price_amount").eq("payment_status", "paid"),
        supabase.from("profiles").select("created_at").gte("created_at", sixMonthsAgo.toISOString()),
        supabase.from("recruiter_profiles").select("created_at").gte("created_at", sixMonthsAgo.toISOString()),
        supabase.from("profiles").select("id, full_name, email, current_role, paid_until, created_at, avatar_url").order("created_at", { ascending: false }).limit(5),
        supabase.from("recruiter_profiles").select("id, contact_name, company_name, created_at, company_logo_url").order("created_at", { ascending: false }).limit(5),
        supabase.from("recruiter_jobs").select("id, title, status, created_at, applications_count, user_id").order("created_at", { ascending: false }).limit(5),
        supabase.from("applications").select("id, job_title, company, status, created_at, user_id").order("created_at", { ascending: false }).limit(5),
        supabase.from("applications").select("id", { count: "exact", head: true }),
      ]);
      const revenue = (paidHires.data || []).reduce((a, r: any) => a + (r.price_amount || 0), 0);
      setStats({
        talents: talents.count || 0,
        recruiters: recruiters.count || 0,
        paying: paying.count || 0,
        revenueNgn: revenue,
        activeJobs: jobs.count || 0,
        hireRequests: (appsCount.count || 0) + (hire.count || 0),
      } as any);

      // Growth chart — group by month
      const monthLabels: string[] = [];
      const buckets: Record<string, { talents: number; recruiters: number }> = {};
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const label = d.toLocaleString("en-US", { month: "short" });
        monthLabels.push(key);
        buckets[key] = { talents: 0, recruiters: 0 };
        (buckets as any)[`label_${key}`] = label;
      }
      (allTalents.data || []).forEach((r: any) => {
        const d = new Date(r.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (buckets[key]) buckets[key].talents += 1;
      });
      (allRecruiters.data || []).forEach((r: any) => {
        const d = new Date(r.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (buckets[key]) buckets[key].recruiters += 1;
      });
      // Cumulative trend looks better
      let tCum = 0, rCum = 0;
      setGrowth(monthLabels.map((k) => {
        tCum += buckets[k].talents;
        rCum += buckets[k].recruiters;
        return { month: (buckets as any)[`label_${k}`], talents: tCum, recruiters: rCum };
      }));

      // Decorate recent jobs/talents with company name
      const recIds = [...new Set((jobRows.data || []).map((j: any) => j.user_id))];
      const { data: recMap } = recIds.length
        ? await supabase.from("recruiter_profiles").select("user_id, company_name").in("user_id", recIds)
        : { data: [] as any[] };
      const cmap = new Map((recMap || []).map((r: any) => [r.user_id, r.company_name]));
      setRecentJobs((jobRows.data || []).map((j: any) => ({ ...j, company: cmap.get(j.user_id) || "—" })));

      setRecentTalents(talentRows.data || []);
      setRecentRecruiters(recruiterRows.data || []);
      setRecentAppsList(appsRows.data || []);
    })();
  }, []);

  if (!stats) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-28 rounded-2xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  const statCards = [
    { label: "Total Talents", value: stats.talents.toLocaleString(), icon: Users, tint: "bg-purple-500/15 text-purple-400", delta: "+18.4%" },
    { label: "Total Recruiters", value: stats.recruiters.toLocaleString(), icon: Users2, tint: "bg-pink-500/15 text-pink-400", delta: "+22.6%" },
    { label: "Active Jobs", value: stats.activeJobs.toLocaleString(), icon: Briefcase, tint: "bg-amber-500/15 text-amber-400", delta: "+15.2%" },
    { label: "Total Applications", value: (stats as any).hireRequests.toLocaleString(), icon: Sparkles, tint: "bg-blue-500/15 text-blue-400", delta: "+16.7%" },
    { label: "Total Revenue (₦)", value: `₦${(stats.revenueNgn / 1000).toFixed(0)}K`, icon: CreditCard, tint: "bg-green-500/15 text-green-400", delta: "+28.1%" },
  ];

  const recruitersDonut = [
    { name: "Active", value: Math.max(stats.recruiters - 0, 1), color: "hsl(var(--primary))" },
    { name: "Pending", value: Math.max(Math.round(stats.recruiters * 0.14), 0), color: "hsl(280 70% 65%)" },
    { name: "Inactive", value: Math.max(Math.round(stats.recruiters * 0.26), 0), color: "hsl(35 90% 60%)" },
  ];
  const totalRec = recruitersDonut.reduce((a, b) => a + b.value, 0);

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-[26px] sm:text-[30px] font-bold text-foreground inline-flex items-center gap-2">
            Welcome back, Admin! <span className="text-2xl">👋</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Here's what's happening on Girls In Careers today.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-4 py-2 rounded-xl border border-border bg-card text-sm text-muted-foreground inline-flex items-center gap-2">
            <Calendar className="w-4 h-4" /> Last 30 days
          </div>
          <Button className="bg-primary hover:bg-primary-dark text-primary-foreground">
            Export Report
          </Button>
        </div>
      </div>

      {/* Stat cards row */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {statCards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-start justify-between mb-3">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${c.tint}`}>
                <c.icon className="w-5 h-5" />
              </div>
            </div>
            <div className="text-[11px] text-muted-foreground font-medium mb-1">{c.label}</div>
            <div className="text-2xl font-bold text-foreground">{c.value}</div>
            <div className="text-[11px] mt-2 inline-flex items-center gap-1 text-emerald-500 font-semibold">
              <ArrowUpRight className="w-3 h-3" /> {c.delta}
              <span className="text-muted-foreground font-normal ml-1">vs last month</span>
            </div>
          </div>
        ))}
      </div>

      {/* Row 2 — chart + donut + status list */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Talents vs Recruiters Growth</h3>
            <span className="text-[11px] text-muted-foreground">Last 6 months</span>
          </div>
          <div className="flex items-center gap-4 mb-2 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-400" /> Talents</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary" /> Recruiters</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={growth} margin={{ top: 6, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="talents" stroke="hsl(280 70% 65%)" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="recruiters" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="font-semibold text-foreground mb-4">Recruiters Overview</h3>
          <div className="flex items-center gap-4">
            <div className="relative w-[140px] h-[140px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={recruitersDonut} dataKey="value" innerRadius={45} outerRadius={62} paddingAngle={2}>
                    {recruitersDonut.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-xl font-bold text-foreground">{totalRec}</div>
                <div className="text-[10px] text-muted-foreground">Total</div>
              </div>
            </div>
            <ul className="flex-1 space-y-2 text-[12.5px]">
              {recruitersDonut.map((d) => (
                <li key={d.name} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                  <span className="text-foreground font-medium">{d.name}</span>
                  <span className="ml-auto text-muted-foreground">{d.value} ({Math.round((d.value / totalRec) * 100)}%)</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="font-semibold text-foreground mb-4">Quick Stats</h3>
          <ul className="space-y-3 text-sm">
            <li className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
              <span className="inline-flex items-center gap-2 text-foreground"><Star className="w-4 h-4 text-amber-500" /> Paying members</span>
              <span className="font-bold">{stats.paying}</span>
            </li>
            <li className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
              <span className="inline-flex items-center gap-2 text-foreground"><Briefcase className="w-4 h-4 text-blue-500" /> Active jobs</span>
              <span className="font-bold">{stats.activeJobs}</span>
            </li>
            <li className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
              <span className="inline-flex items-center gap-2 text-foreground"><DollarSign className="w-4 h-4 text-green-500" /> Hire-for-me revenue</span>
              <span className="font-bold">₦{stats.revenueNgn.toLocaleString()}</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Row 3 — recent activity tables */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <RecentCard title="Recent Talents" cols={["Name", "Role", "Status", "Joined"]}>
          {recentTalents.map((r) => (
            <tr key={r.id} className="border-b border-border last:border-0">
              <td className="py-2.5 pr-2">
                <div className="flex items-center gap-2">
                  {r.avatar_url ? (
                    <img src={r.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-primary-tint text-primary text-[11px] font-bold flex items-center justify-center">
                      {(r.full_name || r.email || "?").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="font-medium text-foreground truncate max-w-[120px]">{r.full_name || r.email}</span>
                </div>
              </td>
              <td className="py-2.5 pr-2 text-muted-foreground truncate max-w-[120px]">{r.current_role || "—"}</td>
              <td className="py-2.5 pr-2">
                {r.paid_until && new Date(r.paid_until) > new Date()
                  ? <Badge className="bg-emerald-500/15 text-emerald-500 border-0">Paid</Badge>
                  : <Badge variant="secondary" className="text-[10px]">Free</Badge>}
              </td>
              <td className="py-2.5 text-muted-foreground text-xs whitespace-nowrap">{new Date(r.created_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </RecentCard>

        <RecentCard title="Recent Recruiters" cols={["Company", "Contact", "Joined"]}>
          {recentRecruiters.map((r) => (
            <tr key={r.id} className="border-b border-border last:border-0">
              <td className="py-2.5 pr-2">
                <div className="flex items-center gap-2">
                  {r.company_logo_url ? (
                    <img src={r.company_logo_url} alt="" className="w-7 h-7 rounded-md object-cover bg-muted" />
                  ) : (
                    <div className="w-7 h-7 rounded-md bg-primary-tint text-primary text-[11px] font-bold flex items-center justify-center">
                      {(r.company_name || "?").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="font-medium text-foreground truncate max-w-[120px]">{r.company_name || "—"}</span>
                </div>
              </td>
              <td className="py-2.5 pr-2 text-muted-foreground truncate max-w-[120px]">{r.contact_name || "—"}</td>
              <td className="py-2.5 text-muted-foreground text-xs whitespace-nowrap">{new Date(r.created_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </RecentCard>

        <RecentCard title="Recent Job Posts" cols={["Title", "Company", "Apps", "Posted"]}>
          {recentJobs.map((j) => (
            <tr key={j.id} className="border-b border-border last:border-0">
              <td className="py-2.5 pr-2 font-medium text-foreground truncate max-w-[140px]">{j.title}</td>
              <td className="py-2.5 pr-2 text-muted-foreground truncate max-w-[100px]">{j.company}</td>
              <td className="py-2.5 pr-2 text-foreground">{j.applications_count ?? 0}</td>
              <td className="py-2.5 text-muted-foreground text-xs whitespace-nowrap">{new Date(j.created_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </RecentCard>
      </div>
    </div>
  );
}

function RecentCard({ title, cols, children }: { title: string; cols: string[]; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-foreground">{title}</h3>
        <button className="text-[11.5px] font-semibold text-primary hover:underline inline-flex items-center gap-1">
          View all <ArrowUpRight className="w-3 h-3" />
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10.5px] uppercase tracking-wide text-muted-foreground border-b border-border">
              {cols.map((c) => <th key={c} className="py-2 pr-2 font-semibold">{c}</th>)}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
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
  const tableName = contentTables[type];
  const [rows, setRows] = useState<any[]>([]);
  const [refresh, setRefresh] = useState(0);
  const [editing, setEditing] = useState<any | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    (async () => {
      let query: any = (supabase.from(tableName) as any).select("*").order("created_at", { ascending: false });
      // For on-demand vs live sessions, both live in `live_sessions`. Filter by recording presence.
      if (type === "on_demand") {
        query = query.not("recording_youtube_id", "is", null);
      } else if (type === "live_sessions") {
        query = query.is("recording_youtube_id", null);
      }
      const { data } = await query;
      setRows(data || []);
    })();
  }, [type, tableName, refresh]);

  const openNew = () => {
    setEditing({ is_published: true, is_featured: false, ...(contentDefaults[type] || {}) });
    setOpen(true);
  };
  const openEdit = (r: any) => { setEditing({ ...r }); setOpen(true); };
  const remove = async (id: string) => {
    if (!confirm("Delete this item?")) return;
    const { error } = await (supabase.from(tableName) as any).delete().eq("id", id);
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
    if (id) ({ error } = await (supabase.from(tableName) as any).update(payload).eq("id", id));
    else ({ error } = await (supabase.from(tableName) as any).insert(payload));
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else { toast({ title: id ? "Updated" : "Created" }); setOpen(false); setEditing(null); setRefresh(r => r + 1); }
  };
  const toggleFlag = async (id: string, field: "is_featured" | "is_published", val: boolean) => {
    await (supabase.from(tableName) as any).update({ [field]: val }).eq("id", id);
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
