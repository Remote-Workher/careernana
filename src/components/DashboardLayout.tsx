import { lazy, Suspense, useState, useEffect } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import SignupModal from "@/components/SignupModal";
import UpgradeModal from "@/components/UpgradeModal";
import { subscribeSignupModal } from "@/lib/signup-modal";

import { supabase } from "@/integrations/supabase/client";
import { Menu, X, Search, Building2, ArrowLeft, Bell, Coins } from "lucide-react";
import logo from "@/assets/logo.svg";
import SiteFooter from "@/components/SiteFooter";
import { getCurrentUserFast, hasStoredSession, withTimeout } from "@/lib/auth-state";

const OnboardingWizard = lazy(() => import("@/components/OnboardingWizard"));
const WelcomeScreen = lazy(() => import("@/components/WelcomeScreen"));
const AuthScreen = lazy(() => import("@/components/AuthScreen"));

type FlowState = "loading" | "welcome" | "auth" | "onboarding" | "dashboard" | "guest";

// All dashboard pages act as a public showroom until sign-up.
const PROTECTED_PREFIXES: string[] = [];

export default function DashboardLayout() {
  // Seed initial flow from cached session so navigation between pages doesn't
  // flash a full-page spinner. Auth check still runs in background to verify.
  const [flow, setFlow] = useState<FlowState>(() => (hasStoredSession() ? "dashboard" : "guest"));
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [signupOpen, setSignupOpen] = useState(false);
  const [signupCtx, setSignupCtx] = useState<import("@/lib/signup-modal").SignupModalContext | undefined>(undefined);
  const [recruiterPreview, setRecruiterPreview] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>("");
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = subscribeSignupModal((ctx) => {
      setSignupCtx(ctx);
      setSignupOpen(true);
    });
    return () => { unsub(); };
  }, []);

  const isProtectedRoute = PROTECTED_PREFIXES.some((p) => location.pathname.startsWith(p));

  const searchPlaceholder = (() => {
    const p = location.pathname;
    if (p.startsWith("/jobs") || p.startsWith("/apply") || p.startsWith("/applications")) return "Search jobs by role, company, location…";
    if (p.startsWith("/tools")) return "Search AI tools…";
    if (p.startsWith("/brag-file")) return "Search My Wins…";
    if (p.startsWith("/resources")) return "Search resources & templates…";
    if (p.startsWith("/courses")) return "Search courses…";
    if (p.startsWith("/challenges")) return "Search challenges…";
    if (p.startsWith("/live-sessions")) return "Search mentor sessions…";
    if (p.startsWith("/community")) return "Search posts & discussions…";
    if (p.startsWith("/career-exploration")) return "Search career paths…";
    if (p.startsWith("/skills-gap")) return "Search skills…";
    return "Search Remote Workher…";
  })();

  const checkAuthAndProfile = async () => {
    const user = await getCurrentUserFast(900);
    if (!user) {
      // If a session token exists in storage, the auth check likely just
      // timed out — don't downgrade the UI to guest mode (which would cause
      // a mismatch where the sidebar shows logged-in but the header shows
      // Login/I'm hiring). Wait for onAuthStateChange to update us.
      if (hasStoredSession()) return;
      // Logged-out visitors browse the entire talent site as guests
      // (showroom mode). Gated pages render their guest variant — we
      // do NOT push them to /payment just for visiting.
      if (isProtectedRoute) setFlow("welcome");
      else setFlow("guest");
      return;
    }

    const [{ data: recruiter }, { data: profile }] = await withTimeout(
      Promise.all([
        supabase.from("recruiter_profiles").select("id").eq("user_id", user.id).maybeSingle(),
        supabase
          .from("profiles")
          .select("onboarding_completed, paid_until, avatar_url, full_name")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]),
      1200,
      [{ data: null, error: null }, { data: { onboarding_completed: true, paid_until: null, avatar_url: null, full_name: user.email ?? "" }, error: null }] as any,
    );

    if (recruiter && !profile) {
      setRecruiterPreview(true);
      setFlow("guest");
      return;
    }

    setRecruiterPreview(false);
    setAvatarUrl(profile?.avatar_url ?? null);
    setDisplayName((profile?.full_name || user.email || "").trim());

    // Onboarding is no longer a blocking wizard — it lives as the
    // "Complete your profile" step in the dashboard checklist, which
    // routes to /profile/setup. Always land users on the dashboard.

    // Paid-only gate for talent: signed-in users without an active membership
    // can't access premium routes — push them to /payment.
    setFlow("dashboard");
  };

  useEffect(() => {
    // Run once on mount — auth/profile state doesn't change between route
    // navigations within the dashboard. Re-running it on every pathname
    // change made every page transition feel slow.
    checkAuthAndProfile();
    const safety = setTimeout(() => {
      setFlow((cur) => (cur === "loading" ? "guest" : cur));
    }, 6000);
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) checkAuthAndProfile();
      else if (event === "SIGNED_OUT") setFlow("guest");
      // Ignore null sessions from INITIAL_SESSION/TOKEN_REFRESHED — they can
      // briefly fire before the stored session is hydrated and would otherwise
      // flash the guest UI for a logged-in user.
    });
    return () => {
      clearTimeout(safety);
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (flow === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (flow === "welcome") return <Suspense fallback={<div className="min-h-screen bg-background" />}><WelcomeScreen onStart={() => setFlow("auth")} /></Suspense>;
  if (flow === "auth") return <Suspense fallback={<div className="min-h-screen bg-background" />}><AuthScreen onSuccess={() => checkAuthAndProfile()} onBack={() => setFlow("welcome")} /></Suspense>;
  if (flow === "onboarding") return <Suspense fallback={<div className="min-h-screen bg-background" />}><OnboardingWizard onComplete={() => setFlow("dashboard")} /></Suspense>;

  return (
    <div className="min-h-screen bg-background font-sans">
      {recruiterPreview && (
        <div className="sticky top-0 z-[60] bg-[#1A1A1A] text-white px-4 md:px-7 py-2 flex items-center justify-between gap-3 text-[12px] md:text-[12.5px]">
          <div className="flex items-center gap-2 min-w-0">
            <Building2 className="w-3.5 h-3.5 text-[#E0487A] shrink-0" />
            <span className="truncate">
              <span className="hidden sm:inline">You're previewing the talent site as a guest. </span>
              <span className="sm:hidden">Previewing as guest. </span>
              Your recruiter session is still active.
            </span>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem("workher-talent-guest");
              localStorage.setItem("workher-role", "recruiter");
              navigate("/recruiter");
            }}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] bg-[#E0487A] hover:bg-[#c73868] transition-colors font-semibold text-[11.5px] md:text-[12px]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Back to Recruiter Dashboard</span>
            <span className="sm:hidden">Back to Recruiter</span>
          </button>
        </div>
      )}
      {/* TOP NAV — matches Hub homepage */}
      <nav className="flex items-center gap-3 md:gap-5 px-4 md:px-7 h-[58px] bg-card border-b border-border sticky top-0 z-50">
        <button
          className="md:hidden w-9 h-9 rounded-xl flex items-center justify-center hover:bg-muted transition-colors"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle navigation"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
        <button onClick={() => (window.location.href = "/")} className="flex items-center gap-2 shrink-0 h-7">
          <img src={logo} alt="Remote Workher" className="h-7 w-auto block" />
        </button>
        <div className="hidden md:block flex-1 max-w-[460px] relative ml-20">
          <Search className="absolute left-[13px] top-1/2 -translate-y-1/2 w-[15px] h-[15px] text-muted-foreground" />
          <input
            placeholder={searchPlaceholder}
            className="w-full py-[9px] pl-[38px] pr-[14px] border-[1.5px] border-border rounded-[10px] text-[13px] bg-muted outline-none focus:border-primary"
          />
        </div>
        <div className="ml-auto flex items-center gap-2.5">
          {flow === "dashboard" ? (
            <>
              <button
                onClick={() => navigate("/notifications")}
                aria-label="Notifications"
                className="relative w-9 h-9 rounded-full flex items-center justify-center text-foreground hover:bg-muted transition-colors"
              >
                <Bell className="w-[18px] h-[18px]" />
              </button>
              <button
                onClick={() => navigate("/profile")}
                aria-label="Open profile"
                className="w-9 h-9 rounded-full overflow-hidden border border-border bg-primary-tint flex items-center justify-center hover:ring-2 hover:ring-primary/40 transition-all shrink-0"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[12px] font-bold text-primary">
                    {(displayName || "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                  </span>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => navigate("/login")}
                className="px-[14px] md:px-[18px] py-2 rounded-[9px] text-[12.5px] md:text-[13px] font-semibold text-primary-foreground bg-primary hover:bg-primary-dark transition-colors"
              >
                Login
              </button>
              <button
                onClick={() => navigate("/recruiter/auth")}
                className="hidden sm:flex px-[14px] md:px-[18px] py-2 rounded-[9px] text-[12.5px] md:text-[13px] font-semibold text-primary bg-card border border-primary hover:bg-primary-tint transition-colors items-center"
              >
                I'm hiring
              </button>
            </>
          )}
        </div>
      </nav>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 bg-black/40 z-40 top-[58px]" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="flex min-h-[calc(100vh-58px)]">
        {/* Sidebar */}
        <div
          className={`fixed md:sticky md:top-[58px] top-[58px] left-0 z-50 h-[calc(100vh-58px)] transform transition-transform duration-200 md:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          }`}
        >
          <AppSidebar onNavigate={() => setSidebarOpen(false)} />
        </div>

        {/* Main */}
        <main className="flex-1 min-w-0 flex flex-col">
          <div className="flex-1 p-4 md:p-6 lg:p-8 border-transparent">
            <Outlet />
          </div>
          {flow === "guest" && <SiteFooter />}
        </main>
      </div>

      <SignupModal
        open={signupOpen}
        onClose={() => setSignupOpen(false)}
        onSuccess={() => { setSignupOpen(false); checkAuthAndProfile(); }}
        toolName={signupCtx?.toolName}
        heading={signupCtx?.heading}
        subtext={signupCtx?.subtext}
        bullets={signupCtx?.bullets}
        ctaLabel={signupCtx?.ctaLabel}
        mode={signupCtx?.mode}
      />
      <UpgradeModal />
    </div>
  );
}
