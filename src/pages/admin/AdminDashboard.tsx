import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.svg";
import ChallengesManager from "@/pages/admin/ChallengesManager";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Building2, DollarSign, Briefcase, Plus, Pencil, Trash2, LogOut, Star, LayoutDashboard, UserCircle, Calendar, GraduationCap, BookOpen, Trophy, FolderOpen, Bell, ArrowLeft, TrendingUp, Sparkles, ArrowUpRight, CreditCard, Users2, PlayCircle, ShieldCheck, Newspaper, HandHeart, CalendarDays } from "lucide-react";
import ResourcesManager from "./ResourcesManager";
import CoursesManager from "./CoursesManager";
import { YoutubeMetaField } from "@/components/admin/YoutubeMetaField";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import { AiGenerateButton } from "@/components/admin/AiGenerateButton";
import CategoriesManager from "@/components/admin/CategoriesManager";
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
    // Push starts_at into the past so the LiveSessions page categorises it as "On Demand"
    starts_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
};

const contentSchemas: Record<ContentType, { label: string; fields: { name: string; label: string; type: "text" | "textarea" | "number" | "datetime" | "select" | "youtube" | "image" | "list"; options?: string[]; help?: string; aiKind?: "about" | "learnings" }[] }> = {
  live_sessions: {
    label: "Live Sessions",
    fields: [
      { name: "title", label: "Title", type: "text" },
      { name: "description", label: "Description", type: "textarea" },
      { name: "host", label: "Host", type: "text" },
      { name: "host_linkedin_url", label: "Host LinkedIn URL", type: "text" },
      { name: "host_instagram_url", label: "Host Instagram URL", type: "text" },
      { name: "host_tiktok_url", label: "Host TikTok URL", type: "text" },
      { name: "host_youtube_url", label: "Host YouTube URL", type: "text" },
      { name: "host_twitter_url", label: "Host X / Twitter URL", type: "text" },
      { name: "host_website_url", label: "Host website URL", type: "text" },
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
      { name: "recording_youtube_id", label: "YouTube link or video ID", type: "youtube" },
      { name: "title", label: "Title", type: "text" },
      { name: "description", label: "Short description", type: "textarea", help: "Shown as the subtitle on cards." },
      { name: "about", label: "About this class", type: "textarea", help: "Longer overview shown in the About tab.", aiKind: "about" },
      { name: "learnings", label: "What you'll learn", type: "list", help: "One bullet per line.", aiKind: "learnings" },
      { name: "host", label: "Host / Instructor", type: "text" },
      { name: "host_role", label: "Host role", type: "text" },
      { name: "host_avatar_url", label: "Host photo URL", type: "text" },
      { name: "host_linkedin_url", label: "Host LinkedIn URL", type: "text" },
      { name: "host_instagram_url", label: "Host Instagram URL", type: "text" },
      { name: "host_tiktok_url", label: "Host TikTok URL", type: "text" },
      { name: "host_youtube_url", label: "Host YouTube URL", type: "text" },
      { name: "host_twitter_url", label: "Host X / Twitter URL", type: "text" },
      { name: "host_website_url", label: "Host website URL", type: "text" },
      { name: "category", label: "Category", type: "text" },
      { name: "image_url", label: "Cover image", type: "image" },
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
  const [isSuper, setIsSuper] = useState(false);
  const [allowedSections, setAllowedSections] = useState<string[]>([]);
  const [tab, setTab] = useState("overview");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/admin/login", { replace: true }); return; }
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
      if (!data) { setIsAdmin(false); setChecking(false); return; }
      setIsAdmin(true);
      const { data: scope } = await supabase
        .from("admin_scopes")
        .select("is_super, sections")
        .eq("user_id", user.id)
        .maybeSingle();
      // If no scope row exists, treat this admin as super (full access).
      // Otherwise honor the configured scope.
      setIsSuper(scope ? !!scope.is_super : true);
      setAllowedSections(scope?.sections || []);
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

  const allNavItems = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "talents", label: "Talents", icon: Users },
    { id: "recruiters", label: "Recruiters", icon: Building2 },
    { id: "hire", label: "Hire-for-me", icon: UserCircle },
    { id: "jobs", label: "Featured Jobs", icon: Briefcase },
    { id: "manual_jobs", label: "Manual Jobs", icon: Plus },
    { id: "live_sessions", label: "Live Sessions", icon: Calendar },
    { id: "on_demand", label: "On-Demand Classes", icon: PlayCircle },
    { id: "courses", label: "Courses", icon: GraduationCap },
    { id: "challenges", label: "Challenges", icon: Trophy },
    { id: "resources", label: "Resources", icon: FolderOpen },
    { id: "articles", label: "Articles", icon: Newspaper },
    { id: "accountability", label: "Accountability", icon: HandHeart },
    { id: "events", label: "Events", icon: CalendarDays },
    { id: "admins", label: "Admins", icon: ShieldCheck },
  ];

  // Super admins see everything. Scoped admins always get Overview, plus their allowed sections.
  // Only super admins can manage admins.
  const navItems = isSuper
    ? allNavItems
    : allNavItems.filter((n) => n.id === "overview" || allowedSections.includes(n.id));

  const activeTab = navItems.find((n) => n.id === tab) ? tab : "overview";
  const currentLabel = navItems.find((n) => n.id === activeTab)?.label || "Overview";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <Sidebar collapsible="icon" className="border-r border-border">
          <SidebarHeader className="bg-card">
            <div className="flex items-center px-3 pt-4 pb-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
              <img
                src={logo}
                alt="Remote Workher"
                className="h-7 w-auto group-data-[collapsible=icon]:h-6"
              />
            </div>
            <div className="px-3 pb-3 group-data-[collapsible=icon]:hidden">
              <div className="bg-primary-tint text-primary text-[11px] font-bold tracking-[0.12em] uppercase rounded-full px-4 py-2 text-center">
                {isSuper ? "Super Admin" : "Admin"}
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent className="bg-card">
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu className="gap-0.5 px-1.5">
                  {navItems.map((item) => {
                    const active = activeTab === item.id;
                    return (
                      <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton
                          isActive={active}
                          onClick={() => setTab(item.id)}
                          tooltip={item.label}
                          className={`h-8 rounded-lg text-[12px] font-medium transition-colors ${
                            active
                              ? "!bg-foreground !text-background hover:!bg-foreground/90"
                              : "text-foreground/80 hover:bg-foreground/5"
                          }`}
                        >
                          <item.icon className="w-3.5 h-3.5" />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="bg-card border-t border-border/60">
            <SidebarMenu className="gap-0.5 px-1.5">
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => navigate("/")}
                  tooltip="Back to Dashboard"
                  className="h-8 rounded-lg text-[12px] text-foreground/80 hover:bg-foreground/5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Dashboard</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={async () => { await supabase.auth.signOut(); navigate("/"); }}
                  tooltip="Sign out"
                  className="h-8 rounded-lg text-[12px] text-foreground/80 hover:bg-foreground/5"
                >
                  <LogOut className="w-3.5 h-3.5" />
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
              {(() => {
                const allowed = (id: string) => isSuper || id === "overview" || allowedSections.includes(id);
                if (!allowed(activeTab)) return <Overview onNavigate={setTab} />;
                switch (activeTab) {
                  case "overview": return <Overview onNavigate={setTab} />;
                  case "talents": return <TalentsList />;
                  case "recruiters": return <RecruitersList />;
                  case "hire": return <HireRequests />;
                  case "jobs": return <FeaturedJobsAdmin />;
                  case "manual_jobs": return <ManualJobsAdmin />;
                  case "live_sessions": return <ContentManager type="live_sessions" />;
                  case "on_demand": return <ContentManager type="on_demand" />;
                  case "courses": return <CoursesManager />;
                  case "challenges": return <ChallengesManager />;
                  case "resources": return <ResourcesManager />;
                  case "articles": return <div className="text-sm text-muted-foreground">Articles management coming soon.</div>;
                  case "accountability": return <div className="text-sm text-muted-foreground">Accountability groups coming soon.</div>;
                  case "events": return <ContentManager type="live_sessions" />;
                  case "admins": return <AdminsManager />;
                  default: return <Overview onNavigate={setTab} />;
                }
              })()}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function Overview({ onNavigate }: { onNavigate: (tab: string) => void }) {
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
        supabase.from("profiles").select("id, full_name, email, current_role, plan_tier, paid_until, created_at, avatar_url").order("created_at", { ascending: false }).limit(5),
        supabase.from("recruiter_profiles").select("id, contact_name, company_name, created_at, company_logo_url").order("created_at", { ascending: false }).limit(5),
        supabase.from("recruiter_jobs").select("id, title, status, created_at, applications_count, user_id").order("created_at", { ascending: false }).limit(5),
        supabase.from("job_applications").select("id, status, created_at, applicant_user_id, job_id").order("created_at", { ascending: false }).limit(5),
        supabase.from("job_applications").select("id", { count: "exact", head: true }),
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
          <p className="text-sm text-muted-foreground mt-1">Here's what's happening on Remote Workher today.</p>
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
        <RecentCard title="Recent Talents" cols={["Name", "Role", "Status", "Joined"]} onViewAll={() => onNavigate("talents")}>
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
                  ? <Badge className={`border-0 ${(r as any).plan_tier === "premium" ? "bg-amber-500/15 text-amber-600" : "bg-blue-500/15 text-blue-600"}`}>{((r as any).plan_tier || "paid").replace(/^\w/, (c: string) => c.toUpperCase())}</Badge>
                  : <Badge variant="secondary" className="text-[10px]">Free</Badge>}
              </td>
              <td className="py-2.5 text-muted-foreground text-xs whitespace-nowrap">{new Date(r.created_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </RecentCard>

        <RecentCard title="Recent Recruiters" cols={["Company", "Contact", "Joined"]} onViewAll={() => onNavigate("recruiters")}>
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

        <RecentCard title="Recent Job Posts" cols={["Title", "Company", "Apps", "Posted"]} onViewAll={() => onNavigate("jobs")}>
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

function RecentCard({ title, cols, children, onViewAll }: { title: string; cols: string[]; children: React.ReactNode; onViewAll?: () => void }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-foreground">{title}</h3>
        <button onClick={onViewAll} className="text-[11.5px] font-semibold text-primary hover:underline inline-flex items-center gap-1">
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
  const { toast } = useToast();
  const navigate = useNavigate();
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [tierFilter, setTierFilter] = useState<"all" | "free" | "standard" | "premium">("all");
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);

  // Add talent dialog state
  const [addOpen, setAddOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newTier, setNewTier] = useState<"free" | "standard" | "premium">("free");
  const [newCycle, setNewCycle] = useState<"monthly" | "quarterly" | "yearly">("monthly");
  const [newPaidFrom, setNewPaidFrom] = useState(new Date().toISOString().slice(0, 10));
  const [newPaidUntil, setNewPaidUntil] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Auto-compute expiry from start + cycle
  useEffect(() => {
    if (newTier === "free" || !newPaidFrom) return;
    const days = newCycle === "monthly" ? 30 : newCycle === "quarterly" ? 90 : 365;
    const end = new Date(new Date(newPaidFrom).getTime() + days * 86400000);
    setNewPaidUntil(end.toISOString().slice(0, 10));
  }, [newCycle, newPaidFrom, newTier]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, user_id, full_name, email, current_role, target_role, plan_tier, paid_from, paid_until, billing_cycle, tokens_remaining, created_at, avatar_url, city")
        .order("created_at", { ascending: false })
        .limit(500);
      const ids = (profiles || []).map((p: any) => p.user_id);
      if (ids.length === 0) { setRows([]); setLoading(false); return; }

      const [apps, challenges, talentPays, productPays] = await Promise.all([
        supabase.from("job_applications").select("applicant_user_id").in("applicant_user_id", ids),
        supabase.from("challenge_progress").select("user_id").in("user_id", ids),
        supabase.from("talent_payments").select("user_id, amount_naira").in("user_id", ids),
        supabase.from("product_purchases").select("user_id, amount_naira").in("user_id", ids),
      ]);

      const tally = (rows: any[] | null, field = "user_id") => {
        const m = new Map<string, number>();
        (rows || []).forEach((r: any) => m.set(r[field], (m.get(r[field]) || 0) + 1));
        return m;
      };
      const sum = (rows: any[] | null) => {
        const m = new Map<string, number>();
        (rows || []).forEach((r: any) => m.set(r.user_id, (m.get(r.user_id) || 0) + (r.amount_naira || 0)));
        return m;
      };
      const appsMap = tally(apps.data, "applicant_user_id");
      const chMap = tally(challenges.data);
      const memSpend = sum(talentPays.data);
      const prodSpend = sum(productPays.data);

      setRows((profiles || []).map((p: any) => ({
        ...p,
        applications_count: appsMap.get(p.user_id) || 0,
        challenges_count: chMap.get(p.user_id) || 0,
        membership_spend: memSpend.get(p.user_id) || 0,
        product_spend: prodSpend.get(p.user_id) || 0,
        total_spend: (memSpend.get(p.user_id) || 0) + (prodSpend.get(p.user_id) || 0),
      })));
      setLoading(false);
    })();
  }, [refresh]);

  const isActive = (r: any) => r.plan_tier !== "free" && (!r.paid_until || new Date(r.paid_until) > new Date());
  const counts = {
    total: rows.length,
    free: rows.filter(r => r.plan_tier === "free" || !isActive(r)).length,
    standard: rows.filter(r => r.plan_tier === "standard" && isActive(r)).length,
    premium: rows.filter(r => r.plan_tier === "premium" && isActive(r)).length,
  };

  const filtered = rows.filter(r => {
    if (tierFilter === "free" && !(r.plan_tier === "free" || !isActive(r))) return false;
    if (tierFilter === "standard" && !(r.plan_tier === "standard" && isActive(r))) return false;
    if (tierFilter === "premium" && !(r.plan_tier === "premium" && isActive(r))) return false;
    if (q && !((r.full_name || "").toLowerCase().includes(q.toLowerCase()) || (r.email || "").toLowerCase().includes(q.toLowerCase()))) return false;
    return true;
  });

  const tierBadge = (tier: string, paidUntil: string | null) => {
    const active = paidUntil && new Date(paidUntil) > new Date();
    if (tier === "premium" && active) return <Badge className="bg-amber-500/15 text-amber-600 border-0">Premium</Badge>;
    if (tier === "standard" && active) return <Badge className="bg-blue-500/15 text-blue-600 border-0">Standard</Badge>;
    if (tier !== "free" && !active) return <Badge variant="secondary">Expired</Badge>;
    return <Badge variant="secondary">Free</Badge>;
  };

  const submitNewTalent = async () => {
    if (!newEmail.trim()) { toast({ title: "Email is required", variant: "destructive" }); return; }
    if (newTier !== "free" && (!newPaidFrom || !newPaidUntil)) { toast({ title: "Set start and end dates", variant: "destructive" }); return; }
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("admin-create-talent", {
      body: {
        email: newEmail.trim(),
        full_name: newName.trim() || null,
        plan_tier: newTier,
        billing_cycle: newTier === "free" ? null : newCycle,
        paid_from: newTier === "free" ? null : new Date(newPaidFrom).toISOString(),
        paid_until: newTier === "free" ? null : new Date(newPaidUntil).toISOString(),
        password: newPassword.trim() || null,
      },
    });
    setSubmitting(false);
    if (error || (data as any)?.error) {
      toast({ title: "Could not add talent", description: (data as any)?.error || error?.message, variant: "destructive" });
      return;
    }
    const pwd = (data as any)?.generated_password;
    toast({ title: "Talent added", description: pwd ? `Temp password: ${pwd}` : undefined });
    setAddOpen(false);
    setNewEmail(""); setNewName(""); setNewTier("free"); setNewCycle("monthly");
    setNewPaidFrom(new Date().toISOString().slice(0, 10)); setNewPaidUntil(""); setNewPassword("");
    setRefresh(r => r + 1);
  };

  const TierPill = ({ id, label, count, color }: { id: any; label: string; count: number; color: string }) => (
    <button
      onClick={() => setTierFilter(id)}
      className={`px-4 py-3 rounded-xl border text-left transition ${tierFilter === id ? "border-foreground bg-foreground/5" : "border-border bg-card hover:bg-muted/30"}`}
    >
      <div className={`text-[10px] uppercase tracking-wider font-bold ${color}`}>{label}</div>
      <div className="text-2xl font-bold mt-0.5">{count.toLocaleString()}</div>
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <TierPill id="all" label="All Talents" count={counts.total} color="text-foreground" />
        <TierPill id="free" label="Free" count={counts.free} color="text-muted-foreground" />
        <TierPill id="standard" label="Standard" count={counts.standard} color="text-blue-600" />
        <TierPill id="premium" label="Premium" count={counts.premium} color="text-amber-600" />
      </div>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
          <Input placeholder="Search name or email…" value={q} onChange={e => setQ(e.target.value)} className="max-w-sm" />
          <div className="flex items-center gap-3">
            <div className="text-xs text-muted-foreground">{filtered.length} shown</div>
            <Button size="sm" onClick={() => setAddOpen(true)}><Plus className="w-4 h-4 mr-1" /> Add talent</Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground border-b">
              <tr>
                <th className="py-2 pr-3">Name</th>
                <th className="py-2 pr-3">Tier</th>
                <th className="py-2 pr-3">Cycle</th>
                <th className="py-2 pr-3">Role</th>
                <th className="py-2 pr-3">Started</th>
                <th className="py-2 pr-3">Expires</th>
                <th className="py-2"></th>
              </tr>
            </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">Loading…</td></tr>
            ) : filtered.map(r => {
              const daysLeft = r.paid_until ? Math.ceil((new Date(r.paid_until).getTime() - Date.now()) / 86400000) : null;
              const expSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 7;
              const expired = daysLeft !== null && daysLeft < 0;
              return (
              <tr
                key={r.id}
                className="border-b last:border-0 hover:bg-muted/30 cursor-pointer"
                onClick={() => navigate(`/admin/talents/${r.user_id}`)}
              >
                <td className="py-2 pr-3">
                  <div className="flex items-center gap-2 min-w-0">
                    {r.avatar_url ? (
                      <img src={r.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-primary-tint text-primary text-[11px] font-bold flex items-center justify-center shrink-0">
                        {(r.full_name || r.email || "?").charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="font-medium truncate max-w-[180px]">{r.full_name || "—"}</div>
                      <div className="text-[11px] text-muted-foreground truncate max-w-[180px]">{r.email}</div>
                    </div>
                  </div>
                </td>
                <td className="py-2 pr-3">{tierBadge(r.plan_tier, r.paid_until)}</td>
                <td className="py-2 pr-3 text-xs capitalize text-muted-foreground">{r.billing_cycle || "—"}</td>
                <td className="py-2 pr-3 text-muted-foreground truncate max-w-[160px]">{r.current_role || r.target_role || "—"}</td>
                <td className="py-2 pr-3 text-muted-foreground text-xs whitespace-nowrap">{r.paid_from ? new Date(r.paid_from).toLocaleDateString() : "—"}</td>
                <td className="py-2 pr-3 text-xs whitespace-nowrap">
                  {r.paid_until ? (
                    <span className={expired ? "text-red-600 font-medium" : expSoon ? "text-amber-600 font-medium" : "text-muted-foreground"}>
                      {new Date(r.paid_until).toLocaleDateString()}
                      {daysLeft !== null && !expired && expSoon && <span className="ml-1">({daysLeft}d)</span>}
                      {expired && <span className="ml-1">(expired)</span>}
                    </span>
                  ) : "—"}
                </td>
                <td className="py-2"><Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/admin/talents/${r.user_id}`); }}>View</Button></td>
              </tr>
              );
            })}
          </tbody>
        </table>
        {!loading && filtered.length === 0 && <div className="text-center py-6 text-sm text-muted-foreground">No talents found.</div>}
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add talent manually</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Email *</Label>
              <Input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="jane@example.com" />
            </div>
            <div>
              <Label>Full name</Label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Jane Doe" />
            </div>
            <div>
              <Label>Plan tier *</Label>
              <Select value={newTier} onValueChange={(v: any) => setNewTier(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newTier !== "free" && (
              <>
                <div>
                  <Label>Billing cycle *</Label>
                  <Select value={newCycle} onValueChange={(v: any) => setNewCycle(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly (3 months)</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Plan starts *</Label>
                    <Input type="date" value={newPaidFrom} onChange={e => setNewPaidFrom(e.target.value)} />
                  </div>
                  <div>
                    <Label>Plan ends *</Label>
                    <Input type="date" value={newPaidUntil} onChange={e => setNewPaidUntil(e.target.value)} />
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">End date auto-fills from start + cycle. Edit manually if needed.</p>
              </>
            )}
            <div>
              <Label>Temporary password (optional)</Label>
              <Input value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Leave blank to auto-generate" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={submitNewTalent} disabled={submitting}>{submitting ? "Adding…" : "Add talent"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
      <div className="text-base font-bold mt-0.5">{value}</div>
    </div>
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
                  <div className="flex items-center justify-between gap-2">
                    <Label>{f.label}</Label>
                    {f.aiKind && (
                      <AiGenerateButton
                        kind={f.aiKind}
                        ctx={editing}
                        onResult={(val) => setEditing((prev: any) => ({ ...prev, [f.name]: val }))}
                      />
                    )}
                  </div>
                  {f.type === "textarea" ? (
                    <Textarea value={editing[f.name] ?? ""} onChange={e => setEditing({ ...editing, [f.name]: e.target.value })} rows={3} />
                  ) : f.type === "list" ? (
                    <Textarea
                      value={Array.isArray(editing[f.name]) ? editing[f.name].join("\n") : (editing[f.name] ?? "")}
                      onChange={e => setEditing({ ...editing, [f.name]: e.target.value.split("\n").map((s: string) => s.trim()).filter(Boolean) })}
                      rows={5}
                      placeholder="One item per line"
                    />
                  ) : f.type === "select" ? (
                    <Select value={editing[f.name] ?? ""} onValueChange={(v) => setEditing({ ...editing, [f.name]: v })}>
                      <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                      <SelectContent>{f.options!.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                    </Select>
                  ) : f.type === "datetime" ? (
                    <Input type="datetime-local" value={fmtDt(editing[f.name])} onChange={e => setEditing({ ...editing, [f.name]: e.target.value ? new Date(e.target.value).toISOString() : null })} />
                  ) : f.type === "number" ? (
                    <Input type="number" value={editing[f.name] ?? ""} onChange={e => setEditing({ ...editing, [f.name]: e.target.value === "" ? null : Number(e.target.value) })} />
                  ) : f.type === "youtube" ? (
                    <YoutubeMetaField
                      value={editing[f.name] ?? ""}
                      onChange={(val) => setEditing({ ...editing, [f.name]: val })}
                      onMeta={(meta) => setEditing((prev: any) => ({
                        ...prev,
                        [f.name]: meta.videoId,
                        title: prev?.title || meta.title,
                        description: prev?.description || meta.description,
                      }))}
                    />
                  ) : f.type === "image" ? (
                    <ImageUploadField
                      value={editing[f.name] ?? ""}
                      onChange={(url) => setEditing({ ...editing, [f.name]: url })}
                    />
                  ) : (
                    <Input value={editing[f.name] ?? ""} onChange={e => setEditing({ ...editing, [f.name]: e.target.value })} />
                  )}
                  {f.help && <p className="text-[11px] text-muted-foreground mt-1">{f.help}</p>}
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

function ManualJobsAdmin() {
  const { toast } = useToast();
  const [rows, setRows] = useState<any[]>([]);
  const [refresh, setRefresh] = useState(0);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("external_jobs")
        .select("*")
        .eq("source", "manual")
        .order("ingested_at", { ascending: false })
        .limit(200);
      setRows(data || []);
    })();
  }, [refresh]);

  const blank = {
    job_title: "",
    company: "",
    location: "",
    work_type: "",
    employment_type: "",
    experience_level: "",
    salary_raw: "",
    salary_min: null as number | null,
    salary_max: null as number | null,
    description: "",
    requirements: "",
    benefits: "",
    skills: "" as any, // comma-separated input
    company_logo_url: "",
    source_url: "",
    is_active: true,
  };

  const openNew = () => { setEditing({ ...blank }); setOpen(true); };
  const openEdit = (r: any) => {
    setEditing({
      ...r,
      skills: Array.isArray(r.skills) ? r.skills.join(", ") : (r.skills || ""),
    });
    setOpen(true);
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this job?")) return;
    const { error } = await supabase.from("external_jobs").delete().eq("id", id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Deleted" }); setRefresh((r) => r + 1); }
  };

  const toggleActive = async (id: string, val: boolean) => {
    const { error } = await supabase.from("external_jobs").update({ is_active: val }).eq("id", id);
    if (error) toast({ title: "Update failed", description: error.message, variant: "destructive" });
    else setRefresh((r) => r + 1);
  };

  const save = async () => {
    if (!editing?.job_title?.trim() || !editing?.company?.trim() || !editing?.source_url?.trim()) {
      toast({ title: "Title, company and apply URL are required", variant: "destructive" });
      return;
    }
    const skillsArr = typeof editing.skills === "string"
      ? editing.skills.split(",").map((s: string) => s.trim()).filter(Boolean)
      : (editing.skills || []);
    const payload: any = {
      job_title: editing.job_title.trim(),
      company: editing.company.trim(),
      location: editing.location || null,
      work_type: editing.work_type || null,
      experience_level: editing.experience_level || null,
      salary_raw: editing.salary_raw || null,
      salary_min: editing.salary_min ?? null,
      salary_max: editing.salary_max ?? null,
      description: editing.description || null,
      requirements: editing.requirements || null,
      benefits: editing.benefits || null,
      skills: skillsArr,
      company_logo_url: editing.company_logo_url || null,
      source_url: editing.source_url.trim(),
      source: "manual",
      is_active: !!editing.is_active,
      posted_date: editing.posted_date || new Date().toISOString(),
    };
    let error;
    if (editing.id) {
      ({ error } = await supabase.from("external_jobs").update(payload).eq("id", editing.id));
    } else {
      ({ error } = await supabase.from("external_jobs").insert(payload));
    }
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else { toast({ title: editing.id ? "Updated" : "Created" }); setOpen(false); setEditing(null); setRefresh((r) => r + 1); }
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="font-semibold">Manual Jobs</h2>
          <p className="text-xs text-muted-foreground">Hand-curated jobs that link out to an external apply page.</p>
        </div>
        <Button size="sm" onClick={openNew}><Plus className="w-4 h-4 mr-1" /> New job</Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground border-b">
            <tr>
              <th className="py-2 pr-4">Title</th>
              <th className="py-2 pr-4">Company</th>
              <th className="py-2 pr-4">Location</th>
              <th className="py-2 pr-4">Apply URL</th>
              <th className="py-2 pr-4">Active</th>
              <th className="py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((j) => (
              <tr key={j.id} className="border-b last:border-0">
                <td className="py-2 pr-4 font-medium">{j.job_title}</td>
                <td className="py-2 pr-4">{j.company}</td>
                <td className="py-2 pr-4 text-muted-foreground">{j.location || "—"}</td>
                <td className="py-2 pr-4"><a href={j.source_url} target="_blank" rel="noreferrer" className="text-primary truncate max-w-[200px] inline-block">{j.source_url}</a></td>
                <td className="py-2 pr-4"><Switch checked={!!j.is_active} onCheckedChange={(v) => toggleActive(j.id, v)} /></td>
                <td className="py-2 flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(j)}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => remove(j.id)}><Trash2 className="w-4 h-4" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <div className="text-center py-6 text-sm text-muted-foreground">No manual jobs yet — click "New job".</div>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit" : "New"} manual job</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><Label>Job title *</Label><Input value={editing.job_title || ""} onChange={(e) => setEditing({ ...editing, job_title: e.target.value })} /></div>
                <div><Label>Company *</Label><Input value={editing.company || ""} onChange={(e) => setEditing({ ...editing, company: e.target.value })} /></div>
                <div><Label>Location</Label><Input value={editing.location || ""} onChange={(e) => setEditing({ ...editing, location: e.target.value })} placeholder="e.g. Lagos, Nigeria or Remote" /></div>
                <div><Label>Work type</Label>
                  <Select value={editing.work_type || ""} onValueChange={(v) => setEditing({ ...editing, work_type: v })}>
                    <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="remote">Remote</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                      <SelectItem value="onsite">Onsite</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Experience level</Label>
                  <Select value={editing.experience_level || ""} onValueChange={(v) => setEditing({ ...editing, experience_level: v })}>
                    <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="entry">Entry</SelectItem>
                      <SelectItem value="mid">Mid</SelectItem>
                      <SelectItem value="senior">Senior</SelectItem>
                      <SelectItem value="lead">Lead</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Employment type</Label><Input value={editing.employment_type || ""} onChange={(e) => setEditing({ ...editing, employment_type: e.target.value })} placeholder="full-time, contract…" /></div>
                <div><Label>Salary min</Label><Input type="number" value={editing.salary_min ?? ""} onChange={(e) => setEditing({ ...editing, salary_min: e.target.value === "" ? null : Number(e.target.value) })} /></div>
                <div><Label>Salary max</Label><Input type="number" value={editing.salary_max ?? ""} onChange={(e) => setEditing({ ...editing, salary_max: e.target.value === "" ? null : Number(e.target.value) })} /></div>
                <div className="sm:col-span-2"><Label>Salary display (optional)</Label><Input value={editing.salary_raw || ""} onChange={(e) => setEditing({ ...editing, salary_raw: e.target.value })} placeholder="e.g. ₦400k – ₦600k / month" /></div>
              </div>

              <div><Label>Description</Label><Textarea rows={5} value={editing.description || ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
              <div><Label>Requirements</Label><Textarea rows={4} value={editing.requirements || ""} onChange={(e) => setEditing({ ...editing, requirements: e.target.value })} /></div>
              <div><Label>Benefits</Label><Textarea rows={3} value={editing.benefits || ""} onChange={(e) => setEditing({ ...editing, benefits: e.target.value })} /></div>
              <div><Label>Skills (comma-separated)</Label><Input value={editing.skills || ""} onChange={(e) => setEditing({ ...editing, skills: e.target.value })} placeholder="React, TypeScript, Node" /></div>
              <div><Label>Company logo URL</Label><Input value={editing.company_logo_url || ""} onChange={(e) => setEditing({ ...editing, company_logo_url: e.target.value })} /></div>
              <div><Label>Apply URL *</Label><Input value={editing.source_url || ""} onChange={(e) => setEditing({ ...editing, source_url: e.target.value })} placeholder="https://company.com/jobs/123" /></div>

              <label className="flex items-center gap-2 text-sm pt-2"><Switch checked={!!editing.is_active} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} /> Active (visible on Jobs page)</label>
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

const SECTION_OPTIONS = [
  { id: "talents", label: "Talents" },
  { id: "recruiters", label: "Recruiters" },
  { id: "hire", label: "Hire-for-me" },
  { id: "jobs", label: "Featured Jobs" },
  { id: "manual_jobs", label: "Manual Jobs" },
  { id: "live_sessions", label: "Live Sessions" },
  { id: "on_demand", label: "On-Demand Classes" },
  { id: "courses", label: "Courses" },
  { id: "challenges", label: "Challenges" },
  { id: "resources", label: "Resources" },
];

type AdminRow = {
  user_id: string;
  email: string | null;
  created_at: string | null;
  is_super: boolean;
  sections: string[];
};

function AdminsManager() {
  const { toast } = useToast();
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [callerIsSuper, setCallerIsSuper] = useState(false);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [newIsSuper, setNewIsSuper] = useState(false);
  const [newSections, setNewSections] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const [me, setMe] = useState<string | null>(null);
  const [editing, setEditing] = useState<AdminRow | null>(null);
  const [editIsSuper, setEditIsSuper] = useState(false);
  const [editSections, setEditSections] = useState<string[]>([]);

  const load = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    setMe(user?.id || null);
    const { data, error } = await supabase.functions.invoke("admin-manage-roles", { body: { action: "list" } });
    if (error) toast({ title: "Failed to load admins", description: error.message, variant: "destructive" });
    else {
      setAdmins(data?.admins || []);
      setCallerIsSuper(!!data?.caller_is_super);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggle = (list: string[], id: string) =>
    list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

  const addAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setAdding(true);
    const { data, error } = await supabase.functions.invoke("admin-manage-roles", {
      body: { action: "add", email: email.trim(), is_super: newIsSuper, sections: newSections },
    });
    setAdding(false);
    if (error || data?.error) {
      toast({ title: "Could not add admin", description: data?.error || error?.message, variant: "destructive" });
      return;
    }
    toast({ title: "Admin added", description: email });
    setEmail(""); setNewIsSuper(false); setNewSections([]);
    load();
  };

  const removeAdmin = async (user_id: string, em: string | null) => {
    if (!confirm(`Remove admin access for ${em || user_id}?`)) return;
    const { data, error } = await supabase.functions.invoke("admin-manage-roles", { body: { action: "remove", user_id } });
    if (error || data?.error) {
      toast({ title: "Could not remove", description: data?.error || error?.message, variant: "destructive" });
      return;
    }
    toast({ title: "Admin removed" });
    load();
  };

  const openEdit = (a: AdminRow) => {
    setEditing(a);
    setEditIsSuper(a.is_super);
    setEditSections(a.sections || []);
  };

  const saveScope = async () => {
    if (!editing) return;
    const { data, error } = await supabase.functions.invoke("admin-manage-roles", {
      body: { action: "update_scope", user_id: editing.user_id, is_super: editIsSuper, sections: editSections },
    });
    if (error || data?.error) {
      toast({ title: "Could not save", description: data?.error || error?.message, variant: "destructive" });
      return;
    }
    toast({ title: "Access updated" });
    setEditing(null);
    load();
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <Card className="p-6">
        <h2 className="text-lg font-bold mb-1">Add an admin</h2>
        <p className="text-sm text-muted-foreground mb-4">
          The person must already have a Remote Workher account. Choose what they can access.
        </p>
        {!callerIsSuper && (
          <p className="text-sm text-amber-600 mb-3">Only super admins can add or change admins.</p>
        )}
        <form onSubmit={addAdmin} className="space-y-4">
          <Input
            type="email"
            placeholder="email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={!callerIsSuper}
          />
          <div className="flex items-center justify-between p-3 rounded-lg border border-border">
            <div>
              <div className="text-sm font-medium">Super admin</div>
              <div className="text-xs text-muted-foreground">Full access to every section.</div>
            </div>
            <Switch checked={newIsSuper} onCheckedChange={setNewIsSuper} disabled={!callerIsSuper} />
          </div>
          {!newIsSuper && (
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Allowed sections</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {SECTION_OPTIONS.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded border border-border">
                    <input
                      type="checkbox"
                      checked={newSections.includes(s.id)}
                      onChange={() => setNewSections((cur) => toggle(cur, s.id))}
                      disabled={!callerIsSuper}
                    />
                    <span>{s.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          <Button type="submit" disabled={adding || !callerIsSuper}>
            {adding ? "Adding..." : <><Plus className="w-4 h-4 mr-1" /> Add admin</>}
          </Button>
        </form>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-bold mb-4">Current admins ({admins.length})</h2>
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading...</div>
        ) : admins.length === 0 ? (
          <div className="text-sm text-muted-foreground">No admins yet.</div>
        ) : (
          <ul className="divide-y divide-border">
            {admins.map((a) => (
              <li key={a.user_id} className="flex items-center justify-between py-3 gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate flex items-center gap-2">
                    {a.email || "(no email)"}
                    {a.is_super ? (
                      <Badge variant="default" className="text-[10px]">Super admin</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">
                        {a.sections.length ? `${a.sections.length} section${a.sections.length === 1 ? "" : "s"}` : "No access"}
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {a.user_id === me ? "You · " : ""}
                    {!a.is_super && a.sections.length > 0 && (
                      <>{a.sections.map((s) => SECTION_OPTIONS.find((o) => o.id === s)?.label || s).join(", ")} · </>
                    )}
                    {a.created_at ? `Joined ${new Date(a.created_at).toLocaleDateString()}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(a)} disabled={!callerIsSuper}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeAdmin(a.user_id, a.email)}
                    disabled={a.user_id === me || !callerIsSuper}
                    title={a.user_id === me ? "You can't remove yourself" : "Remove admin"}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit access · {editing?.email}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg border border-border">
              <div>
                <div className="text-sm font-medium">Super admin</div>
                <div className="text-xs text-muted-foreground">Full access to every section.</div>
              </div>
              <Switch checked={editIsSuper} onCheckedChange={setEditIsSuper} />
            </div>
            {!editIsSuper && (
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Allowed sections</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {SECTION_OPTIONS.map((s) => (
                    <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded border border-border">
                      <input
                        type="checkbox"
                        checked={editSections.includes(s.id)}
                        onChange={() => setEditSections((cur) => toggle(cur, s.id))}
                      />
                      <span>{s.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveScope}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
