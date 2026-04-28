import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import logo from "@/assets/logo.svg";

interface AuthScreenProps {
  onSuccess: () => void;
  onBack: () => void;
  defaultMode?: "login" | "signup";
}

export default function AuthScreen({ onSuccess, onBack, defaultMode = "signup" }: AuthScreenProps) {
  const [mode, setMode] = useState<"login" | "signup">(defaultMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "signup" && !agreed) {
      toast.error("Please agree to the terms to continue.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        setEmailSent(true);
        toast.success("Check your email to confirm your account!");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        // Block recruiter accounts from logging in here
        const { data: recruiter } = await supabase
          .from("recruiter_profiles")
          .select("id")
          .eq("user_id", data.user!.id)
          .maybeSingle();
        if (recruiter) {
          await supabase.auth.signOut();
          throw new Error(
            "This is a recruiter account. Please sign in at the recruiter portal instead.",
          );
        }

        toast.success("Welcome back to Remote Workher!");
        onSuccess();
      }
    } catch (e: any) {
      toast.error(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-3 text-[13px] rounded-[13px] border border-border bg-background text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all";

  if (emailSent) {
    return (
      <div className="fixed inset-0 z-[100] bg-[#F0EBE8] flex items-center justify-center p-4">
        <div className="bg-card rounded-[20px] shadow-strong w-full max-w-[440px] p-8 text-center border border-border">
          <div className="w-14 h-14 rounded-xl bg-primary-tint flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">📧</span>
          </div>
          <h2 className="text-xl font-extrabold text-foreground mb-2 font-[EB_Garamond,serif]">Check your inbox</h2>
          <p className="text-[13px] text-muted-foreground mb-6 leading-relaxed">
            We sent a confirmation link to <strong className="text-foreground">{email}</strong>. Click the link to activate your account.
          </p>
          <Button variant="outline" size="sm" onClick={() => { setEmailSent(false); setMode("login"); }}>
            I've confirmed — Log in
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-[#F0EBE8] overflow-y-auto">
      {/* Top bar with back to home */}
      <div className="px-5 md:px-8 h-[58px] flex items-center">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-foreground/70 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to home
        </button>
      </div>

      <div className="flex items-start justify-center px-4 pb-10 pt-2 md:pt-6">
        <div className="w-full max-w-[420px]">
          {/* Branding */}
          <div className="text-center mb-6">
            <div className="flex items-center justify-center mb-3">
              <img src={logo} alt="Remote Workher" className="h-9 w-auto" />
            </div>
            <p className="text-[12.5px] text-foreground/60 font-medium">
              Remote jobs & the system that helps Nigerian women get hired.
            </p>
          </div>

          {/* Card */}
          <div className="bg-card rounded-[20px] shadow-strong p-7 sm:p-8 border border-border">
            <h2 className="text-[22px] font-extrabold text-foreground mb-1 font-[EB_Garamond,serif] tracking-[-0.3px]">
              {mode === "signup" ? "Create your account" : "Welcome back"}
            </h2>
            <p className="text-[13px] text-muted-foreground mb-6">
              {mode === "signup"
                ? "Start your remote job search today."
                : "Log in to pick up where you left off."}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "signup" && (
                <div>
                  <label className="label-caps mb-2 block">Full name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Adeife Ogunjobi"
                    required
                    className={inputClass}
                  />
                </div>
              )}

              <div>
                <label className="label-caps mb-2 block">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  required
                  className={inputClass}
                />
              </div>

              <div>
                <label className="label-caps mb-2 block">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    required
                    minLength={6}
                    className={`${inputClass} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {mode === "signup" && (
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <span className="text-[12px] text-muted-foreground leading-relaxed">
                    I agree to the <button type="button" className="text-primary font-medium hover:underline">Terms of Service</button> and <button type="button" className="text-primary font-medium hover:underline">Privacy Policy</button>
                  </span>
                </label>
              )}

              <Button
                type="submit"
                disabled={loading || (mode === "signup" && !agreed)}
                className="w-full gradient-primary text-primary-foreground font-bold py-3 h-auto rounded-[14px] shadow-button text-[14px]"
              >
                {loading ? "Please wait..." : mode === "signup" ? "Create account" : "Log in"}
              </Button>
            </form>

            <p className="text-[13px] text-center text-muted-foreground mt-6">
              {mode === "signup" ? (
                <>Already have an account?{" "}<button onClick={() => setMode("login")} className="text-primary font-semibold hover:underline">Log in</button></>
              ) : (
                <>Already have an account? Use the form above to log in.</>
              )}
            </p>
          </div>

          {mode === "login" && (
            <div className="mt-5 bg-card rounded-[20px] border border-border p-5 sm:p-6 shadow-soft">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-tint flex items-center justify-center shrink-0">
                  <span className="text-lg">✨</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-[15px] font-extrabold text-foreground font-[EB_Garamond,serif] tracking-[-0.2px]">
                    New to Remote Workher?
                  </h3>
                  <p className="text-[12.5px] text-muted-foreground mt-1 leading-relaxed">
                    Create a free account and explore our membership plans — start your remote job search today.
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <button
                      onClick={() => setMode("signup")}
                      className="px-4 py-2 bg-gradient-to-br from-[#c73868] to-[#E0487A] text-white rounded-[10px] text-[12.5px] font-semibold shadow-[0_4px_14px_rgba(224,72,122,0.35)] hover:opacity-95 transition-opacity"
                    >
                      Sign up for free →
                    </button>
                    <button
                      onClick={() => { onBack(); setTimeout(() => { const el = document.getElementById("pricing"); el?.scrollIntoView({ behavior: "smooth" }); }, 100); }}
                      className="px-4 py-2 bg-background border border-border text-foreground rounded-[10px] text-[12.5px] font-semibold hover:bg-muted transition-colors"
                    >
                      See pricing plans
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <p className="text-center text-[11px] text-foreground/50 mt-5">
            © Remote Workher · Built for Nigerian women in tech, marketing & ops.
          </p>
        </div>
      </div>
    </div>
  );
}
