import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentUserFast, withTimeout } from "@/lib/auth-state";

/**
 * Sticky dark banner shown when a *recruiter* account is signed in but
 * browsing the talent-side site (`/`, `/jobs`, `/tools`, `/courses`, …).
 *
 * Detection rule (matches DashboardLayout): the user has a row in
 * `recruiter_profiles` AND no row in `profiles`. In that case we flag the
 * session as "previewing as guest" and offer a one-click jump back to the
 * recruiter dashboard. This component exists so the same banner can be
 * mounted on pages that don't use DashboardLayout (e.g. the homepage).
 */
export default function RecruiterPreviewBanner() {
  const navigate = useNavigate();
  const [show, setShow] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      const user = await getCurrentUserFast(900);
      if (!user) {
        if (!cancelled) setShow(false);
        return;
      }
      const [{ data: recruiter }, { data: profile }] = await withTimeout(
        Promise.all([
          supabase.from("recruiter_profiles").select("id").eq("user_id", user.id).maybeSingle(),
          supabase.from("profiles").select("user_id").eq("user_id", user.id).maybeSingle(),
        ]),
        4500,
        [{ data: null, error: null }, { data: null, error: null }] as any,
      );
      if (!cancelled) setShow(!!recruiter && !profile);
    };
    check();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) check();
      else setShow(false);
    });
    return () => { cancelled = true; subscription.unsubscribe(); };
  }, []);

  if (!show) return null;

  return (
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
  );
}
