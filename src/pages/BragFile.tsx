import { useState, useEffect, useMemo } from "react";
import {
  Plus, Sparkles, X, Lock, ArrowRight, Search, ChevronDown,
  Star, MessageSquare, MoreHorizontal, Trophy, Briefcase, BookOpen,
  Bookmark, TrendingUp, Users, Megaphone, Heart, CheckCircle2, Target,
  DollarSign, Award, FileText, Truck, Zap, Crown,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { requireSignedIn } from "@/lib/require-signed-in";
import { checkPaidAccess } from "@/lib/require-paid";
import { openSignupModal } from "@/lib/signup-modal";
import { openUpgradeModal } from "@/lib/upgrade-modal";
import { useSEO } from "@/components/SEO";


type CategoryDef = {
  value: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
};

const categories: CategoryDef[] = [
  { value: "career",     label: "Career",     icon: Briefcase,    iconBg: "bg-violet-100", iconColor: "text-violet-600" },
  { value: "learning",   label: "Learning",   icon: BookOpen,     iconBg: "bg-blue-100",   iconColor: "text-blue-600" },
  { value: "work",       label: "Work",       icon: Bookmark,     iconBg: "bg-amber-100",  iconColor: "text-amber-600" },
  { value: "impact",     label: "Impact",     icon: Users,        iconBg: "bg-rose-100",   iconColor: "text-rose-600" },
  { value: "growth",     label: "Growth",     icon: Megaphone,    iconBg: "bg-pink-100",   iconColor: "text-pink-600" },
  { value: "health",     label: "Health",     icon: Heart,        iconBg: "bg-emerald-100",iconColor: "text-emerald-600" },
  { value: "other",      label: "Other",      icon: CheckCircle2, iconBg: "bg-sky-100",    iconColor: "text-sky-600" },
];

// Map a brag entry to an icon tile based on category or keywords in the title.
function getEntryIcon(brag: BragEntry): { Icon: React.ComponentType<{ className?: string }>; bg: string; color: string } {
  const title = (brag.title || brag.raw_text || "").toLowerCase();
  if (title.includes("promot")) return { Icon: Briefcase, bg: "bg-violet-100", color: "text-violet-600" };
  if (title.includes("salary") || title.includes("raise")) return { Icon: DollarSign, bg: "bg-emerald-100", color: "text-emerald-600" };
  if (title.includes("certif") || title.includes("course")) return { Icon: FileText, bg: "bg-blue-100", color: "text-blue-600" };
  if (title.includes("team") || title.includes("help")) return { Icon: Users, bg: "bg-rose-100", color: "text-rose-600" };
  if (title.includes("deliver") || title.includes("ship")) return { Icon: Truck, bg: "bg-amber-100", color: "text-amber-600" };
  if (title.includes("feedback")) return { Icon: MessageSquare, bg: "bg-emerald-100", color: "text-emerald-600" };
  if (title.includes("speak") || title.includes("webinar") || title.includes("talk")) return { Icon: Megaphone, bg: "bg-pink-100", color: "text-pink-600" };
  if (title.includes("goal") || title.includes("target")) return { Icon: Target, bg: "bg-orange-100", color: "text-orange-600" };
  const cat = categories.find(c => c.value === brag.category);
  if (cat) return { Icon: cat.icon, bg: cat.iconBg, color: cat.iconColor };
  return { Icon: Award, bg: "bg-violet-100", color: "text-violet-600" };
}

const tagPalette: Record<string, string> = {
  career:     "bg-violet-50 text-violet-700",
  learning:   "bg-blue-50 text-blue-700",
  work:       "bg-amber-50 text-amber-700",
  impact:     "bg-rose-50 text-rose-700",
  growth:     "bg-pink-50 text-pink-700",
  health:     "bg-emerald-50 text-emerald-700",
  other:      "bg-sky-50 text-sky-700",
};

interface BragEntry {
  id: string;
  category: string;
  company: string | null;
  title: string | null;
  raw_text: string;
  polished_text: string | null;
  strength_score: number | null;
  pinned: boolean;
  created_at: string;
}

// Sample wins shown to non-paid users so they can preview the feature
const sampleBrags: BragEntry[] = [
  {
    id: "sample-1",
    category: "career",
    company: "Paystack",
    title: "Got promoted to Senior PM",
    raw_text: "Promoted after leading the merchant onboarding redesign that cut activation time by 40%.",
    polished_text: "Promoted to Senior Product Manager after leading the merchant onboarding redesign — cut activation time by 40% and unlocked ₦12M in monthly processing volume.",
    strength_score: 92,
    pinned: true,
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "sample-2",
    category: "impact",
    company: "Andela",
    title: "Mentored 8 junior engineers",
    raw_text: "Ran a 12-week mentorship cohort. 6 of 8 mentees were promoted within the year.",
    polished_text: "Designed and led a 12-week mentorship program for 8 junior engineers — 6 received promotions within the year and team retention rose 25%.",
    strength_score: 88,
    pinned: false,
    created_at: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "sample-3",
    category: "growth",
    company: null,
    title: "Spoke at DevFest Lagos",
    raw_text: "Delivered a 30-min talk on remote work for African women in tech to 400+ attendees.",
    polished_text: "Delivered a keynote on building remote careers as African women in tech to 400+ attendees at DevFest Lagos 2025 — generated 1.2K LinkedIn impressions.",
    strength_score: 85,
    pinned: false,
    created_at: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "sample-4",
    category: "learning",
    company: null,
    title: "Completed Google PM Certificate",
    raw_text: "Finished the 6-month Google Project Management certificate with distinction.",
    polished_text: "Completed Google's 6-month Project Management Professional Certificate with distinction — applied frameworks to ship 3 cross-functional initiatives.",
    strength_score: 78,
    pinned: false,
    created_at: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export default function BragFile() {
  useSEO({ title: "My Brag File" });
  const navigate = useNavigate();
  const [brags, setBrags] = useState<BragEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessChecked, setAccessChecked] = useState(false);
  const [hasPaidAccess, setHasPaidAccess] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [showLogWin, setShowLogWin] = useState(false);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "pinned" | "month" | "category">("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedBrag, setSelectedBrag] = useState<BragEntry | null>(null);

  useEffect(() => {
    (async () => {
      const { isPaid } = await checkPaidAccess();
      // My Wins is a Premium-only feature — Standard plans don't have access.
      let isPremium = false;
      const { data: { user } } = await supabase.auth.getUser();
      setSignedIn(!!user);
      if (isPaid && user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("plan_tier")
          .eq("user_id", user.id)
          .maybeSingle();
        isPremium = (profile as any)?.plan_tier === "premium";
      }
      setHasPaidAccess(isPremium);
      setAccessChecked(true);
      if (isPremium) loadBrags();
      else setLoading(false);
    })();
  }, []);

  async function loadBrags() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from("brag_entries")
      .select("*")
      .eq("user_id", user.id)
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false });
    if (data) setBrags(data as BragEntry[]);
    setLoading(false);
  }

  const openLogWin = async () => {
    if (!hasPaidAccess) {
      if (signedIn) {
        // Signed-in but not Premium → open inline upgrade modal so they can pay without leaving.
        openUpgradeModal({
          planId: "pro",
          heading: "Upgrade to log your wins",
          subtext: "My Wins is a Premium-only feature. Upgrade to log unlimited wins and turn them into resume bullets, cover letters & interview answers.",
        });
      } else {
        openSignupModal({
          heading: "My Wins is a Premium feature",
          subtext: "Sign up and upgrade to Premium to log wins and turn them into resume bullets, cover letters & interview stories.",
          bullets: [
            "Unlimited wins, AI-polished into resume bullets",
            "Pull wins straight into cover letters & interviews",
            "Premium-only feature",
            "Cancel anytime — no contract",
          ],
          ctaLabel: "Upgrade to Premium",
        });
      }
      return;
    }
    const user = await requireSignedIn(navigate, "Sign up to log and save wins.");
    if (user) setShowLogWin(true);
  };

  const handleDelete = async (id: string) => {
    if (!hasPaidAccess) return;
    await supabase.from("brag_entries").delete().eq("id", id);
    setBrags(prev => prev.filter(b => b.id !== id));
    toast({ title: "Win removed" });
  };

  const handleTogglePin = async (brag: BragEntry) => {
    if (!hasPaidAccess) { navigate("/login"); return; }
    const next = !brag.pinned;
    setBrags(prev => prev.map(b => b.id === brag.id ? { ...b, pinned: next } : b));
    await supabase.from("brag_entries").update({ pinned: next }).eq("id", brag.id);
  };

  // Stats
  const totalWins = brags.length;
  const thisMonthCount = useMemo(() => {
    const now = new Date();
    return brags.filter(b => {
      const d = new Date(b.created_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
  }, [brags]);
  const usedCategories = useMemo(() => new Set(brags.map(b => b.category)).size, [brags]);
  const pinnedCount = useMemo(() => brags.filter(b => b.pinned).length, [brags]);

  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = {};
    categories.forEach(c => { map[c.value] = 0; });
    brags.forEach(b => { if (map[b.category] !== undefined) map[b.category]++; });
    return map;
  }, [brags]);

  // Filter
  const filtered = useMemo(() => {
    let list = brags;
    if (activeTab === "pinned") list = list.filter(b => b.pinned);
    else if (activeTab === "month") {
      const now = new Date();
      list = list.filter(b => {
        const d = new Date(b.created_at);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });
    } else if (activeTab === "category" && selectedCategory !== "all") {
      list = list.filter(b => b.category === selectedCategory);
    }
    if (selectedCategory !== "all" && activeTab !== "category") {
      list = list.filter(b => b.category === selectedCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(b =>
        (b.title || "").toLowerCase().includes(q) ||
        (b.polished_text || b.raw_text || "").toLowerCase().includes(q) ||
        (b.company || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [brags, activeTab, selectedCategory, search]);

  const isLocked = accessChecked && !hasPaidAccess;

  return (
    <div className="w-full animate-fade-in pb-4 sm:pb-0">
      {/* Header */}
      <div className="mb-4 sm:mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <p className="eyebrow mb-2">Your wins</p>
          <h1 className="headline text-[24px] sm:text-3xl md:text-4xl text-foreground leading-[1.15]">
            <em>My Wins</em>
          </h1>
          <p className="text-[13px] sm:text-[14.5px] text-muted-foreground mt-2">
            Store your wins, track achievements, and celebrate your progress.
          </p>
        </div>
        <button
          onClick={openLogWin}
          className="hidden sm:flex bg-primary text-primary-foreground text-[13px] font-bold px-5 py-3 rounded-xl items-center gap-2 hover:bg-primary/90 transition-colors shrink-0 shadow-sm self-start"
        >
          {isLocked ? (signedIn ? <><Crown className="w-4 h-4" /> Upgrade to log wins</> : <><Lock className="w-4 h-4" /> Unlock to log wins</>) : <><Plus className="w-4 h-4" /> Add New Win</>}
        </button>
      </div>

      {/* Locked banner */}
      {isLocked && (
        <div className="bg-card border border-primary-border rounded-2xl p-4 sm:p-5 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-card">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-primary-tint border border-primary-border flex items-center justify-center shrink-0">
              <Lock className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-[13.5px] font-bold text-foreground leading-tight mb-0.5">Unlock the My Wins</p>
              <p className="text-[12px] text-muted-foreground leading-snug">
                Log your wins and reuse them in CVs, cover letters, and interviews.
              </p>
            </div>
          </div>
          <button
            onClick={openLogWin}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-[10px] text-[12.5px] font-bold text-primary-foreground gradient-primary shadow-button hover:opacity-95 transition-opacity whitespace-nowrap shrink-0"
          >
            Unlock My Wins <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main layout: content + sidebar */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
        {/* Main column */}
        <div className="min-w-0">
          {/* Stats + search row */}
          <div className="flex flex-col gap-4 mb-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard icon={Briefcase} iconBg="bg-violet-100" iconColor="text-violet-600" value={isLocked ? 12 : totalWins} label="Total Wins" />
              <StatCard icon={TrendingUp} iconBg="bg-emerald-100" iconColor="text-emerald-600" value={isLocked ? 4 : thisMonthCount} label="This Month" />
              <StatCard icon={Award} iconBg="bg-amber-100" iconColor="text-amber-600" value={isLocked ? 5 : usedCategories} label="Categories" />
              <StatCard icon={Star} iconBg="bg-blue-100" iconColor="text-blue-600" value={isLocked ? 3 : pinnedCount} label="Pinned Wins" />
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search your wins..."
                  className="w-full pl-10 pr-3 py-2.5 text-[13px] rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                />
              </div>
              <div className="relative">
                <select
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value)}
                  className="appearance-none pl-4 pr-10 py-2.5 text-[13px] font-medium rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors cursor-pointer min-w-[160px]"
                >
                  <option value="all">All Categories</option>
                  {categories.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-6 border-b border-border mb-5 overflow-x-auto scrollbar-hide">
            {[
              { key: "all", label: "All Wins" },
              { key: "pinned", label: "Pinned" },
              { key: "month", label: "This Month" },
              { key: "category", label: "By Category" },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                className={`relative pb-3 text-[13.5px] font-semibold whitespace-nowrap transition-colors ${
                  activeTab === tab.key ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
                {activeTab === tab.key && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                )}
              </button>
            ))}
          </div>

          {/* Loading */}
          {loading && (
            <div className="card-surface text-center py-12">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-[13px] text-muted-foreground">Loading your wins...</p>
            </div>
          )}

          {/* Locked preview — sample wins for non-paid users */}
          {!loading && isLocked && (
            <div className="relative">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 pointer-events-none select-none" aria-hidden="true">
                {sampleBrags.map(brag => (
                  <BragCard key={brag.id} brag={brag} onTogglePin={() => {}} onDelete={() => {}} />
                ))}
              </div>
              {/* Fade + CTA overlay */}
              <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-background via-background/90 to-transparent pointer-events-none" />
              <div className="absolute inset-x-0 bottom-4 sm:bottom-8 flex justify-center px-4">
                <div className="bg-card border border-primary-border rounded-2xl p-5 sm:p-6 shadow-card max-w-md w-full text-center">
                  <div className="w-10 h-10 rounded-full bg-primary-tint border border-primary-border flex items-center justify-center mx-auto mb-3">
                    <Lock className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-[14.5px] font-bold text-foreground mb-1">This is a preview</p>
                  <p className="text-[12.5px] text-muted-foreground mb-4 leading-snug">
                    Unlock the My Wins to log your real wins and turn them into resume bullets, cover letters & interview answers.
                  </p>
                  <button
                    onClick={openLogWin}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-[12.5px] font-bold text-primary-foreground gradient-primary shadow-button hover:opacity-95 transition-opacity"
                  >
                    Unlock My Wins <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Cards grid */}
          {!loading && !isLocked && filtered.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
              {filtered.map(brag => (
                <BragCard
                  key={brag.id}
                  brag={brag}
                  onTogglePin={() => handleTogglePin(brag)}
                  onDelete={() => handleDelete(brag.id)}
                  onOpen={() => navigate(`/brag-file/${brag.id}`)}
                />
              ))}
            </div>
          )}


          {/* Empty state */}
          {!loading && !isLocked && filtered.length === 0 && (
            <div className="border-2 border-dashed border-primary/20 rounded-2xl p-8 sm:p-12 text-center">
              <Trophy className="w-12 h-12 text-primary/50 mx-auto mb-3" />
              <p className="text-[15px] font-bold text-foreground mb-1">
                {search ? "No matching wins" : activeTab === "pinned" ? "No pinned wins yet" : "No wins logged yet"}
              </p>
              <p className="text-[12.5px] text-muted-foreground mb-5">Every win counts — even the small ones</p>
              <button
                onClick={openLogWin}
                className="bg-primary text-primary-foreground text-[13px] font-bold px-5 py-2.5 rounded-xl hover:bg-primary/90 transition-colors inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Log your first win
              </button>
            </div>
          )}

          {/* Mobile FAB */}
          <button
            onClick={openLogWin}
            className="fixed bottom-6 right-6 sm:hidden w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center z-40 hover:bg-primary/90 transition-colors"
            aria-label="Add new win"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          {/* Celebrate more wins */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
            <h3 className="text-[14px] font-bold text-foreground mb-1">Celebrate More Wins</h3>
            <p className="text-[12px] text-muted-foreground mb-4 leading-snug">
              Keep tracking your progress and building My Wins!
            </p>
            <button
              onClick={openLogWin}
              className="w-full bg-primary text-primary-foreground text-[13px] font-bold py-2.5 rounded-xl hover:bg-primary/90 transition-colors"
            >
              Add Your Next Win
            </button>
          </div>

          {/* Categories card */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[14px] font-bold text-foreground">Categories</h3>
              <button
                onClick={() => { setActiveTab("all"); setSelectedCategory("all"); }}
                className="text-[12px] font-semibold text-primary hover:underline"
              >
                View all
              </button>
            </div>
            <div className="space-y-3">
              {categories.map(cat => {
                const Icon = cat.icon;
                const count = categoryCounts[cat.value] || 0;
                return (
                  <button
                    key={cat.value}
                    onClick={() => { setSelectedCategory(cat.value); setActiveTab("category"); }}
                    className="w-full flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-7 h-7 rounded-lg ${cat.iconBg} flex items-center justify-center shrink-0`}>
                        <Icon className={`w-3.5 h-3.5 ${cat.iconColor}`} />
                      </div>
                      <span className="text-[13px] font-medium text-foreground group-hover:text-primary transition-colors">
                        {cat.label}
                      </span>
                    </div>
                    <span className="text-[12px] font-semibold text-muted-foreground">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* How My Wins works */}
          <div className="bg-primary/5 border border-primary/15 rounded-2xl p-5">
            <h3 className="text-[14px] font-bold text-primary mb-3 flex items-center gap-1.5">
              <Zap className="w-4 h-4" /> How My Wins Works
            </h3>
            <ol className="space-y-3 text-[12.5px] text-foreground">
              <li className="flex gap-2.5">
                <span className="font-bold text-foreground">1.</span>
                <div>
                  <p className="font-bold">Add your wins</p>
                  <p className="text-muted-foreground text-[12px] leading-snug">Big or small, every win counts.</p>
                </div>
              </li>
              <li className="flex gap-2.5">
                <span className="font-bold text-foreground">2.</span>
                <div>
                  <p className="font-bold">Organize &amp; track</p>
                  <p className="text-muted-foreground text-[12px] leading-snug">Categories help you track your growth over time.</p>
                </div>
              </li>
              <li className="flex gap-2.5">
                <span className="font-bold text-foreground">3.</span>
                <div>
                  <p className="font-bold">Share your impact</p>
                  <p className="text-muted-foreground text-[12px] leading-snug">Use your wins in resumes, LinkedIn, and interviews.</p>
                </div>
              </li>
            </ol>
          </div>
        </aside>
      </div>

      {/* Log a Win Modal */}
      {showLogWin && (
        <LogWinModal
          onClose={() => setShowLogWin(false)}
          onSaved={() => { setShowLogWin(false); loadBrags(); }}
        />
      )}
    </div>
  );
}

// ---------- Sub-components ----------

function StatCard({
  icon: Icon, iconBg, iconColor, value, label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string; iconColor: string; value: number | string; label: string;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-3 sm:p-4 flex items-center gap-2.5 sm:gap-3 shadow-card">
      <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
        <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${iconColor}`} />
      </div>
      <div className="min-w-0">
        <p className="text-[18px] sm:text-[22px] font-black text-foreground leading-none">{value}</p>
        <p className="text-[11px] sm:text-[11.5px] text-muted-foreground mt-1 leading-tight">{label}</p>
      </div>
    </div>
  );
}

function BragCard({
  brag, onTogglePin, onDelete, onOpen,
}: {
  brag: BragEntry;
  onTogglePin: () => void;
  onDelete: () => void;
  onOpen?: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { Icon, bg, color } = getEntryIcon(brag);
  const date = new Date(brag.created_at).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
  const tagClass = tagPalette[brag.category] || "bg-muted text-muted-foreground";
  const cat = categories.find(c => c.value === brag.category);
  const title = brag.title || (brag.raw_text.length <= 40 ? brag.raw_text : brag.raw_text.slice(0, 40) + "…");
  const body = brag.polished_text || brag.raw_text;

  return (
    <div
      onClick={onOpen}
      className={`bg-card border border-border rounded-2xl p-5 shadow-card hover:shadow-lg transition-shadow flex flex-col text-left ${onOpen ? "cursor-pointer" : ""}`}
    >
      {/* Top row: pinned badge + star */}
      <div className="flex items-start justify-between mb-3">
        {brag.pinned ? (
          <span className="bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wide">
            Pinned
          </span>
        ) : <span />}
        <button
          onClick={(e) => { e.stopPropagation(); onTogglePin(); }}
          className="text-muted-foreground hover:text-amber-500 transition-colors"
          aria-label={brag.pinned ? "Unpin" : "Pin"}
        >
          <Star className={`w-4 h-4 ${brag.pinned ? "fill-amber-400 text-amber-400" : ""}`} />
        </button>
      </div>

      {/* Icon tile */}
      <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center mb-3`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>

      {/* Date */}
      <p className="text-[11px] text-muted-foreground mb-1.5">{date}</p>

      {/* Title */}
      <h3 className="text-[15px] font-bold text-foreground mb-1.5 leading-snug">{title}</h3>

      {/* Body */}
      <p className="text-[12.5px] text-muted-foreground leading-relaxed mb-3 line-clamp-3">
        {body}
      </p>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        <span className={`px-2 py-0.5 rounded-md text-[10.5px] font-semibold ${tagClass}`}>
          {cat?.label || brag.category}
        </span>
        {brag.company && (
          <span className="px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-muted text-muted-foreground">
            {brag.company}
          </span>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-border mt-auto text-muted-foreground">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-[12px]">
            <Star className="w-3.5 h-3.5" />
            {brag.strength_score || 0}
          </span>
        </div>
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setMenuOpen(o => !o)}
            className="hover:text-foreground transition-colors p-1"
            aria-label="More options"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 bottom-full mb-1 z-20 bg-card border border-border rounded-xl shadow-lg py-1 min-w-[140px]">
                <button
                  onClick={() => { onTogglePin(); setMenuOpen(false); }}
                  className="w-full text-left px-3 py-2 text-[12.5px] text-foreground hover:bg-muted transition-colors"
                >
                  {brag.pinned ? "Unpin" : "Pin to top"}
                </button>
                <button
                  onClick={() => { onDelete(); setMenuOpen(false); }}
                  className="w-full text-left px-3 py-2 text-[12.5px] text-destructive hover:bg-muted transition-colors"
                >
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- Log a Win Modal ----------

function strengthColor(s: number) {
  if (s >= 90) return "text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/40 dark:border-emerald-800";
  if (s >= 80) return "text-primary bg-primary/10 border-primary/20";
  if (s >= 60) return "text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950/40 dark:border-amber-800";
  return "text-muted-foreground bg-muted border-border";
}

function LogWinModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [rawText, setRawText] = useState("");
  const [category, setCategory] = useState("career");
  const [company, setCompany] = useState("");

  const handleSave = async () => {
    if (!rawText.trim()) return;
    const user = await requireSignedIn(navigate, "Sign up to save this win.");
    if (!user) return;
    await supabase.from("brag_entries").insert({
      user_id: user.id,
      title: title.trim() || null,
      raw_text: rawText,
      polished_text: rawText,
      category,
      company: company.trim() || null,
      strength_score: 70,
    });
    toast({ title: "Win saved! 🏆" });
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center px-3 pt-5 pb-3 sm:p-4 pointer-events-none overflow-hidden" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full sm:max-w-[560px] max-h-[calc(100dvh-2rem)] sm:max-h-[90vh] flex flex-col shadow-2xl pointer-events-auto" onClick={e => e.stopPropagation()}>
        {/* Sticky header */}
        <div className="flex items-center justify-between px-4 sm:px-6 pt-4 sm:pt-5 pb-2 sm:pb-3 border-b border-border/60 sm:border-0">
          <h2 className="text-[15px] sm:text-[16px] font-black text-foreground flex items-center gap-2"><Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-primary" /> Add a New Win</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-3 sm:py-4">
          <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-1 block">Title</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Got Promoted!"
            className="w-full px-3 py-2 text-[13px] rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors mb-2.5"
          />

          <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-1 block">Describe your win</label>
          <textarea
            value={rawText}
            onChange={e => setRawText(e.target.value)}
            placeholder="What happened? Add numbers, impact, and your specific contribution."
            className="w-full px-3 py-2.5 text-[13px] rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none h-24 sm:h-32 mb-2.5 transition-colors"
          />

          <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-1 block">Category</label>
          <div className="flex flex-wrap gap-1.5 mb-2.5">
            {categories.map(c => (
              <button
                key={c.value}
                onClick={() => setCategory(c.value)}
                className={`px-2.5 py-1.5 rounded-full text-[11px] font-bold transition-colors ${
                  category === c.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-border"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-1 block">Company (optional)</label>
          <input
            value={company}
            onChange={e => setCompany(e.target.value)}
            placeholder="e.g. Paystack"
            className="w-full px-3 py-2 text-[13px] rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
          />
        </div>

        {/* Sticky footer */}
        <div className="flex gap-2.5 px-4 sm:px-6 py-3 border-t border-border/60 bg-card rounded-b-2xl sm:rounded-b-2xl pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button onClick={onClose} className="flex-1 text-[13px] font-bold py-2.5 rounded-xl border border-border text-muted-foreground hover:bg-muted transition-colors">
            Cancel
          </button>
          <button
            disabled={!rawText.trim()}
            onClick={handleSave}
            className="flex-1 bg-primary text-primary-foreground text-[13px] font-bold py-2.5 rounded-xl disabled:opacity-50 hover:bg-primary/90 transition-colors"
          >
            Save Win ✓
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Brag Detail Modal ----------

function BragDetailModal({
  brag, onClose, onTogglePin, onDelete,
}: {
  brag: BragEntry;
  onClose: () => void;
  onTogglePin: () => void;
  onDelete: () => void;
}) {
  const { Icon, bg, color } = getEntryIcon(brag);
  const cat = categories.find(c => c.value === brag.category);
  const tagClass = tagPalette[brag.category] || "bg-muted text-muted-foreground";
  const date = new Date(brag.created_at).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
  const title = brag.title || (brag.raw_text.length <= 60 ? brag.raw_text : brag.raw_text.slice(0, 60) + "…");
  const body = brag.polished_text || brag.raw_text;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`${title}\n\n${body}`);
      toast({ title: "Copied to clipboard ✓" });
    } catch {
      toast({ title: "Could not copy", variant: "destructive" });
    }
  };

  const confirmDelete = () => {
    if (window.confirm("Delete this win? This cannot be undone.")) onDelete();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 px-0 sm:px-4 pt-0 sm:pt-4 pb-0 sm:pb-4"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border w-full sm:max-w-[600px] rounded-t-2xl sm:rounded-2xl max-h-[92dvh] sm:max-h-[88vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between p-5 border-b border-border">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
              <Icon className={`w-6 h-6 ${color}`} />
            </div>
            <div className="min-w-0 flex-1">
              {brag.pinned && (
                <span className="inline-block bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wide mb-1.5">
                  Pinned
                </span>
              )}
              <h2 className="text-[17px] font-bold text-foreground leading-snug break-words">
                {title}
              </h2>
              <p className="text-[12px] text-muted-foreground mt-0.5">{date}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1 -mr-1"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="flex flex-wrap gap-1.5">
            <span className={`px-2.5 py-1 rounded-md text-[11px] font-semibold ${tagClass}`}>
              {cat?.label || brag.category}
            </span>
            {brag.company && (
              <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-muted text-muted-foreground">
                {brag.company}
              </span>
            )}
            {brag.strength_score != null && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-700">
                <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                Strength {brag.strength_score}
              </span>
            )}
          </div>

          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
              The Win
            </p>
            <p className="text-[14px] text-foreground leading-relaxed whitespace-pre-wrap">
              {body}
            </p>
          </div>

          {brag.polished_text && brag.polished_text !== brag.raw_text && (
            <div className="pt-3 border-t border-border">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                Your original note
              </p>
              <p className="text-[13px] text-muted-foreground leading-relaxed whitespace-pre-wrap italic">
                {brag.raw_text}
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 p-4 border-t border-border bg-muted/30 rounded-b-2xl">
          <button
            onClick={confirmDelete}
            className="text-[12.5px] font-semibold text-destructive px-3 py-2 rounded-xl hover:bg-destructive/10 transition-colors"
          >
            Delete
          </button>
          <div className="flex-1" />
          <button
            onClick={onTogglePin}
            className="text-[12.5px] font-semibold text-foreground px-3 py-2 rounded-xl border border-border hover:bg-muted transition-colors inline-flex items-center gap-1.5"
          >
            <Star className={`w-3.5 h-3.5 ${brag.pinned ? "fill-amber-400 text-amber-400" : ""}`} />
            {brag.pinned ? "Unpin" : "Pin"}
          </button>
          <button
            onClick={handleCopy}
            className="text-[12.5px] font-bold text-primary-foreground bg-primary px-4 py-2 rounded-xl hover:bg-primary/90 transition-colors"
          >
            Copy
          </button>
        </div>
      </div>
    </div>
  );
}
