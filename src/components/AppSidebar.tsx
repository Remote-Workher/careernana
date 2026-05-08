import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/integrations/supabase/client";
import { MembershipBadge } from "@/components/MembershipBadge";
import { getCurrentUserFast, hasStoredSession, withTimeout } from "@/lib/auth-state";
import { clearStoredAuthTokens } from "@/lib/remember-session";
import { performLogout } from "@/lib/logout";
import { Crown, LogOut, Home, Briefcase, Sparkles, Trophy, Target, Mic, GraduationCap, BookOpen, MessageCircle, User, Building2, UserCircle, Shield, ClipboardList, ChevronDown, MoreHorizontal, Users, Newspaper, CalendarDays, Gift, ShoppingBag, MapPin } from "lucide-react";

type SidebarItem = {
  icon: any;
  name: string;
  route: string;
  children?: { icon: any; name: string; route: string }[];
};

const baseSidebarItems: SidebarItem[] = [
  { icon: Home, name: "Home", route: "/" },
  { icon: MapPin, name: "My Plan", route: "/plan" },
  { icon: Briefcase, name: "Jobs", route: "/jobs" },
  { icon: Sparkles, name: "AI tools", route: "/tools" },
  { icon: Mic, name: "Mentor sessions", route: "/live-sessions" },
  { icon: GraduationCap, name: "Courses", route: "/courses" },
  { icon: BookOpen, name: "Resources", route: "/resources" },
];

const moreSidebarItemsBase: SidebarItem[] = [
  { icon: MessageCircle, name: "Community", route: "/community" },
  { icon: Target, name: "Challenges", route: "/challenges" },
  { icon: Trophy, name: "My Wins", route: "/brag-file" },
  { icon: Users, name: "Accountability", route: "/accountability" },
];

export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [userName, setUserName] = useState("");
  const [isAuthed, setIsAuthed] = useState(() => hasStoredSession());
  const [isPaid, setIsPaid] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [planTier, setPlanTier] = useState<"free" | "standard" | "premium" | null>(null);
  const [paidUntil, setPaidUntil] = useState<string | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreButtonRef = useRef<HTMLButtonElement | null>(null);
  const [morePanelTop, setMorePanelTop] = useState(160);

  useEffect(() => {
    const load = async (uid: string | null) => {
      if (!uid) {
        setIsAuthed(false);
        setUserName("");
        setIsPaid(false);
        setIsAdmin(false);
        setPlanTier(null);
        setPaidUntil(null);
        return;
      }
      setIsAuthed(true);
      const [{ data: profile }, { data: roles }] = await Promise.all([
        withTimeout(supabase.from("profiles").select("full_name, paid_until, plan_tier").eq("user_id", uid).maybeSingle(), 2500, { data: null, error: null } as any),
        withTimeout(supabase.from("user_roles").select("role").eq("user_id", uid), 2500, { data: [], error: null } as any),
      ]);
      if (profile) {
        setUserName(profile.full_name || "");
        setPaidUntil(profile.paid_until ?? null);
        setPlanTier((profile.plan_tier as any) ?? "free");
        setIsPaid(!!profile.paid_until && new Date(profile.paid_until) > new Date());
      }
      setIsAdmin(!!roles?.some((r: any) => r.role === "admin"));
    };
    getCurrentUserFast().then((user) => load(user?.id ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) load(session.user.id);
      else if (event === "SIGNED_OUT") load(null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const sidebarItems: SidebarItem[] = baseSidebarItems.map((it) =>
    it.route === "/jobs" && isAuthed
      ? {
          ...it,
          children: [
            { icon: ClipboardList, name: "My applications", route: "/applications" },
          ],
        }
      : it,
  );

  const libraryLabel = planTier === "premium" && isPaid ? "My Downloads" : "My Purchases";
  const moreSidebarItems: SidebarItem[] = isAuthed
    ? [...moreSidebarItemsBase, { icon: ShoppingBag, name: libraryLabel, route: "/my-purchases" }]
    : [...moreSidebarItemsBase, { icon: MessageCircle, name: "Help Center", route: "/help" }];

  const isActive = (route: string) =>
    route === "/" ? location.pathname === "/" : location.pathname.startsWith(route);

  const handleNavigate = (route: string) => {
    navigate(route);
    onNavigate?.();
  };

  const toggleMore = () => {
    const rect = moreButtonRef.current?.getBoundingClientRect();
    if (rect) setMorePanelTop(Math.max(12, Math.min(rect.top, window.innerHeight - 260)));
    setMoreOpen((v) => !v);
  };

  const handleLogout = async () => {
    setIsAuthed(false);
    setUserName("");
    onNavigate?.();
    await performLogout();
  };

  return (
    <aside className="rwh-sidebar w-[78vw] max-w-[260px] md:w-[210px] h-full bg-card border-r border-border flex flex-col font-sans overflow-hidden">
      <div className="flex-1 pt-3 flex flex-col">
        {/* Compact role switcher — only visible when signed out */}
        {!isAuthed && (
          <>
            <div className="px-3 pb-3">
              <div className="flex items-center bg-muted rounded-full p-0.5 text-[11.5px] font-medium">
                <button className="flex-1 py-1.5 rounded-full bg-card text-primary shadow-sm flex items-center justify-center gap-1">
                  <User className="w-3.5 h-3.5" /> Talent
                </button>
                <button
                  onClick={() => { localStorage.setItem("workher-role", "recruiter"); navigate("/recruiter"); onNavigate?.(); }}
                  className="flex-1 py-1.5 rounded-full text-muted-foreground hover:text-foreground flex items-center justify-center gap-1"
                >
                  <Building2 className="w-3.5 h-3.5" /> Recruiter
                </button>
              </div>
            </div>

            <div className="h-px bg-border mx-3.5 my-1" />
          </>
        )}

        <div className="text-[10px] font-semibold text-sidebar-muted tracking-[0.8px] uppercase px-[18px] py-1.5">
          Explore
        </div>
        {sidebarItems.map((item) => {
          const active = isActive(item.route);
          const IconComponent = item.icon;
          const hasChildren = !!item.children?.length;
          const childActive = hasChildren && item.children!.some((c) => isActive(c.route));
          const expanded = active || childActive;
          return (
            <div key={item.name}>
              <button
                onClick={() => handleNavigate(item.route)}
                className={`flex items-center gap-2.5 px-[18px] py-[7px] text-[13px] w-full text-left border-l-[2.5px] transition-all ${
                  active
                    ? "text-primary border-primary bg-primary-tint font-medium"
                    : "text-muted-foreground border-transparent hover:text-foreground hover:bg-muted"
                }`}
              >
                <IconComponent className="w-4 h-4" />
                <span className="flex-1">{item.name}</span>
                {hasChildren && (
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? "rotate-0" : "-rotate-90"}`} />
                )}
              </button>
              {hasChildren && expanded && (
                <div className="bg-muted/30">
                  {item.children!.map((child) => {
                    const cActive = isActive(child.route);
                    const ChildIcon = child.icon;
                    return (
                      <button
                        key={child.name}
                        onClick={() => handleNavigate(child.route)}
                        className={`flex items-center gap-2 pl-[42px] pr-[18px] py-[6px] text-[12.5px] w-full text-left border-l-[2.5px] transition-all ${
                          cActive
                            ? "text-primary border-primary bg-primary-tint font-medium"
                            : "text-muted-foreground border-transparent hover:text-foreground hover:bg-muted"
                        }`}
                      >
                        <ChildIcon className="w-3.5 h-3.5" />
                        {child.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* More — opens as a flyout panel to the right of the sidebar (or as a bottom sheet on mobile) */}
        <div className="relative">
          <button
            ref={moreButtonRef}
            onClick={toggleMore}
            className={`flex items-center gap-2.5 px-[18px] py-[7px] text-[13px] w-full text-left border-l-[2.5px] transition-all ${
              moreOpen
                ? "text-foreground border-transparent bg-muted/40 font-medium"
                : "text-muted-foreground border-transparent hover:text-foreground hover:bg-muted"
            }`}
            aria-expanded={moreOpen}
          >
            <MoreHorizontal className="w-4 h-4" />
            <span className="flex-1">More</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${moreOpen ? "-rotate-90" : "-rotate-90"}`} />
          </button>

          {moreOpen && createPortal(
            <>
              <div className="fixed inset-0 z-[90]" onClick={() => setMoreOpen(false)} />

              <div className="md:hidden fixed inset-x-0 bottom-0 z-[100] bg-card border-t border-border rounded-t-2xl shadow-xl pt-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] animate-in slide-in-from-bottom duration-200 max-h-[55vh] flex flex-col">
                <div className="mx-auto w-10 h-1 rounded-full bg-muted mb-2 mt-1 shrink-0" />
                <div className="flex items-center justify-between px-3 pb-1.5 shrink-0">
                  <div className="text-[10px] font-semibold text-sidebar-muted tracking-[0.8px] uppercase">More</div>
                  <button
                    onClick={() => setMoreOpen(false)}
                    className="text-[11.5px] font-semibold text-muted-foreground hover:text-foreground px-2 py-1"
                  >
                    Close
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1 px-2 pb-2 overflow-y-auto">
                  {moreSidebarItems.map((m) => {
                    const Icon = m.icon;
                    const active = isActive(m.route);
                    return (
                      <button
                        key={m.name}
                        onClick={() => { setMoreOpen(false); handleNavigate(m.route); }}
                        className={`flex items-center gap-2 px-2.5 py-2 text-[12.5px] w-full text-left rounded-lg ${
                          active ? "text-primary bg-primary-tint font-medium" : "text-foreground hover:bg-muted"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{m.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div
                className="hidden md:block fixed left-[212px] z-[100] w-[200px] bg-card border border-border rounded-xl shadow-lg p-1.5 animate-in fade-in slide-in-from-left-2 duration-150"
                style={{ top: morePanelTop }}
              >
                <div className="text-[10px] font-semibold text-sidebar-muted tracking-[0.8px] uppercase px-2 py-1.5">More</div>
                {moreSidebarItems.map((m) => {
                  const Icon = m.icon;
                  const active = isActive(m.route);
                  return (
                    <button
                      key={m.name}
                      onClick={() => { setMoreOpen(false); handleNavigate(m.route); }}
                      className={`flex items-center gap-2 px-2.5 py-2 text-[13px] w-full text-left rounded-md ${
                        active ? "text-primary bg-primary-tint font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {m.name}
                    </button>
                  );
                })}
              </div>
            </>,
            document.body,
          )}
        </div>

        {/* Other group — pushed to bottom */}
        {isAuthed && (
          <div className="mt-auto pt-6">
            <div className="text-[10px] font-semibold text-sidebar-muted tracking-[0.8px] uppercase px-[18px] py-1.5">
              Other
            </div>
            {[
              { icon: UserCircle, name: "Profile", route: "/account" },
              { icon: MessageCircle, name: "Help Center", route: "/help" },
              { icon: Gift, name: "Referrals", route: "/referrals" },
            ].map((it) => {
              const Icon = it.icon;
              const active = isActive(it.route);
              return (
                <button
                  key={it.name}
                  onClick={() => handleNavigate(it.route)}
                  className={`flex items-center gap-2.5 px-[18px] py-[7px] text-[13px] w-full text-left border-l-[2.5px] transition-all ${
                    active
                      ? "text-primary border-primary bg-primary-tint font-medium"
                      : "text-muted-foreground border-transparent hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="flex-1">{it.name}</span>
                </button>
              );
            })}
          </div>
        )}

        {isAdmin && (
          <button
            onClick={() => handleNavigate("/admin")}
            className={`flex items-center gap-2.5 px-[18px] py-[7px] text-[13px] w-full text-left border-l-[2.5px] transition-all ${
              isActive("/admin")
                ? "text-primary border-primary bg-primary-tint font-medium"
                : "text-muted-foreground border-transparent hover:text-foreground hover:bg-muted"
            }`}
          >
            <Shield className="w-4 h-4" />
            <span className="flex-1">Admin dashboard</span>
          </button>
        )}
      </div>

      {/* Join Remote Workher upsell — hidden for paid members */}
      <div className="p-3 border-t border-border">
        {!isPaid && (
          <div className="bg-gradient-to-br from-violet/10 to-primary-tint border rounded-xl p-3.5 border-sidebar-primary">
            <Crown className="w-5 h-5 mb-1 text-accent-foreground" />
            <div className="text-[12.5px] font-semibold mb-1 text-neutral-950 leading-snug">
              Join Remote Workher
            </div>
            <div className="text-[11px] text-muted-foreground leading-relaxed mb-3">
              Apply faster, track your applications, and increase your chances.
            </div>
            <button
              onClick={() => handleNavigate("/checkout?plan=starter&period=monthly")}
              className="w-full py-2 bg-primary hover:bg-primary-dark transition-colors text-primary-foreground rounded-lg text-xs font-semibold"
            >
              Get started — ₦10K →
            </button>
            <div className="text-[10px] text-muted-foreground/70 text-center mt-1.5">Cancel anytime</div>
          </div>
        )}
        {isPaid && (
          <button
            onClick={() => handleNavigate("/profile/setup")}
            className="w-full text-left"
            title="View membership"
          >
            <MembershipBadge variant="card" planTier={planTier} paidUntil={paidUntil} className="w-full" />
          </button>
        )}
        {isAuthed && (
          <button
            onClick={handleLogout}
            className={`${!isPaid ? "mt-3" : ""} w-full flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors py-1.5`}
          >
            <LogOut className="w-3 h-3" /> Log out
          </button>
        )}
      </div>
    </aside>
  );
}
