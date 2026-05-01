import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Eye, EyeOff, ArrowLeft, Briefcase, Sparkles, BookOpen, Trophy, Users, ShieldCheck } from "lucide-react";
import logo from "@/assets/logo.svg";
import { getRememberMe, setRememberMe as persistRememberMe } from "@/lib/remember-session";

interface AuthScreenProps {
  onSuccess: () => void;
  onBack: () => void;
  /** Kept for backwards compatibility — signup is no longer available here. */
  defaultMode?: "login" | "signup";
  heading?: string;
  subtext?: string;
}

export default function AuthScreen({ onSuccess, onBack, heading = "Welcome back", subtext = "Log in to pick up where you left off on your Remote Workher job search." }: AuthScreenProps) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  // Signup is no longer available on this screen — users sign up via /payment.
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeStep, setCodeStep] = useState<"idle" | "awaiting_code">("idle");
  const [otpCode, setOtpCode] = useState("");
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [rememberMe, setRememberMe] = useState<boolean>(() => getRememberMe());
  // Code is the default login method; user can switch to password as a fallback.
  const [usePassword, setUsePassword] = useState(false);

  const handleSendCode = async () => {
    if (!email) {
      toast.error("Enter your email first, then tap the send code button.");
      return;
    }
    setCodeLoading(true);
    try {
      // shouldCreateUser:false ensures only existing accounts can use code login
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false },
      });
      if (error) throw error;
      setCodeStep("awaiting_code");
      toast.success("We sent a 6-digit code to your email.");
    } catch (e: any) {
      toast.error(e.message || "Could not send login code");
    } finally {
      setCodeLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!otpCode || otpCode.length < 6) {
      toast.error("Enter the 6-digit code from your email.");
      return;
    }
    setVerifyingCode(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otpCode.trim(),
        type: "email",
      });
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

      persistRememberMe(rememberMe);
      toast.success("Welcome back!");
      onSuccess();
    } catch (e: any) {
      toast.error(e.message || "Invalid or expired code");
    } finally {
      setVerifyingCode(false);
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
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

      persistRememberMe(rememberMe);
      toast.success("Welcome back!");
      onSuccess();
    } catch (e: any) {
      toast.error(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-3 text-[13.5px] rounded-[12px] border border-border bg-background text-foreground placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all";

  // Note: emailSent confirmation screen removed — signup no longer happens here.

  return (
    <div className="fixed inset-0 z-[100] bg-[#F5F0ED] overflow-y-auto lg:overflow-hidden">
      <div className="lg:grid lg:grid-cols-2 lg:h-full">
        {/* ===== Left: Full-bleed dark editorial panel (desktop only) ===== */}
        <aside className="hidden lg:flex flex-col justify-between relative overflow-hidden bg-foreground text-white p-12 xl:p-16">
          {/* radial gradient wash like the reference */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse at 75% 35%, hsl(var(--primary) / 0.35) 0%, transparent 55%), radial-gradient(ellipse at 20% 90%, hsl(var(--primary) / 0.18) 0%, transparent 50%)",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/40 pointer-events-none" />

          {/* Top: logo */}
          <div className="relative">
            <img src={logo} alt="Remote Workher" className="h-8 w-auto invert brightness-0 contrast-200" style={{ filter: "brightness(0) invert(1)" }} />
          </div>

          {/* Middle: editorial headline */}
          <div className="relative max-w-[560px]">
            <span className="inline-block text-[11px] font-bold uppercase tracking-[0.22em] text-white/60 mb-5">
              Remote Workher
            </span>
            <h1 className="text-[56px] xl:text-[64px] leading-[0.98] font-normal font-[EB_Garamond,serif] tracking-[-1.5px] mb-5 text-white">
              Welcome to your{" "}
              <em className="text-primary not-italic italic font-normal">career engine</em>
              <span className="text-primary">.</span>
            </h1>
            <p className="text-[15px] xl:text-[16px] text-white/65 leading-relaxed italic font-[EB_Garamond,serif] max-w-[460px]">
              Real remote jobs, AI tools and a clear roadmap — built for African women who are done waiting and ready to do the work.
            </p>
          </div>

          {/* Bottom: stats row */}
          <div className="relative flex items-end gap-12">
            <div>
              <div className="text-[36px] font-normal font-[EB_Garamond,serif] leading-none text-white">
                10K<span className="text-primary">+</span>
              </div>
              <div className="text-[11px] uppercase tracking-[0.16em] text-white/55 mt-2 font-semibold">
                Community members
              </div>
            </div>
            <div>
              <div className="text-[36px] font-normal font-[EB_Garamond,serif] leading-none text-white flex items-center gap-2">
                4.9 <span className="text-primary">★</span>
              </div>
              <div className="text-[11px] uppercase tracking-[0.16em] text-white/55 mt-2 font-semibold">
                Member satisfaction
              </div>
            </div>
          </div>
        </aside>

        {/* ===== Right: Form panel ===== */}
        <div className="relative flex flex-col min-h-screen lg:min-h-0 lg:h-full lg:overflow-y-auto bg-[#F5F0ED]">
          {/* Mobile-only top bar */}
          <div className="lg:hidden bg-card/85 backdrop-blur-md border-b border-border/60 sticky top-0 z-10">
            <div className="px-5 h-[60px] flex items-center justify-between">
              <button
                onClick={onBack}
                className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-foreground/70 hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <img src={logo} alt="Remote Workher" className="h-7 w-auto" />
            </div>
          </div>

          {/* Desktop-only floating back button */}
          <button
            onClick={onBack}
            className="hidden lg:inline-flex absolute top-6 right-8 items-center gap-1.5 text-[12.5px] font-semibold text-foreground/60 hover:text-foreground transition-colors z-10"
          >
            <ArrowLeft className="w-4 h-4" /> Back to home
          </button>

          {/* Form content centered */}
          <div className="flex-1 flex items-center justify-center px-5 sm:px-8 py-10 lg:py-16">
            <div className="w-full max-w-[420px]">
              <div className="mb-7">
                <span className="inline-block text-[10.5px] font-bold uppercase tracking-[0.18em] text-primary mb-3">
                  Sign in
                </span>
                <h2 className="text-[36px] leading-[1.05] font-normal text-foreground mb-3 font-[EB_Garamond,serif] tracking-[-0.5px]">
                  {heading.split(" ").slice(0, -1).join(" ")}{" "}
                  <em className="text-primary not-italic italic font-normal">{heading.split(" ").slice(-1)[0]}</em>
                </h2>
                <p className="text-[13.5px] text-muted-foreground leading-relaxed">
                  {subtext}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
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

                {!usePassword ? (
                  // ===== Default: email code login =====
                  <>
                    {codeStep === "idle" ? (
                      <>
                        <Button
                          type="button"
                          onClick={handleSendCode}
                          disabled={codeLoading}
                          className="w-full gradient-primary text-primary-foreground font-bold py-3 h-auto rounded-[14px] shadow-button text-[14px]"
                        >
                          {codeLoading ? "Sending code..." : "Email me a login code"}
                        </Button>
                        <p className="text-[11.5px] text-center text-muted-foreground -mt-1">
                          We'll email you a 6-digit code — no password needed.
                        </p>
                      </>
                    ) : (
                      <div className="space-y-2.5 bg-primary-tint/40 border border-primary/15 rounded-[14px] p-3.5">
                        <p className="text-[12.5px] text-foreground/80">
                          We sent a 6-digit code to <strong className="text-foreground">{email}</strong>. Enter it below to sign in.
                        </p>
                        <input
                          type="text"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          maxLength={6}
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          placeholder="123456"
                          className={`${inputClass} text-center tracking-[0.4em] text-[18px] font-bold`}
                        />
                        <Button
                          type="button"
                          onClick={handleVerifyCode}
                          disabled={verifyingCode || otpCode.length < 6}
                          className="w-full gradient-primary text-primary-foreground font-bold py-3 h-auto rounded-[14px] shadow-button text-[14px]"
                        >
                          {verifyingCode ? "Verifying..." : "Verify code & log in"}
                        </Button>
                        <div className="flex items-center justify-between text-[11.5px]">
                          <button
                            type="button"
                            onClick={() => { setCodeStep("idle"); setOtpCode(""); }}
                            className="text-foreground/60 hover:text-foreground"
                          >
                            ← Use a different email
                          </button>
                          <button
                            type="button"
                            onClick={handleSendCode}
                            disabled={codeLoading}
                            className="font-semibold text-primary hover:underline disabled:opacity-60"
                          >
                            {codeLoading ? "Sending..." : "Resend code"}
                          </button>
                        </div>
                      </div>
                    )}

                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                      />
                      <span className="text-[12.5px] text-foreground/75">
                        Remember me on this device
                      </span>
                    </label>

                    <div className="flex items-center gap-3 my-1">
                      <div className="h-px bg-border flex-1" />
                      <span className="text-[10.5px] uppercase tracking-[0.12em] font-semibold text-muted-foreground">code not working?</span>
                      <div className="h-px bg-border flex-1" />
                    </div>
                    <button
                      type="button"
                      onClick={() => { setUsePassword(true); setCodeStep("idle"); setOtpCode(""); }}
                      className="w-full flex items-center justify-center gap-2 bg-background border border-border text-foreground font-semibold py-3 h-auto rounded-[14px] text-[13.5px] hover:bg-muted transition-colors"
                    >
                      Log in with password instead
                    </button>
                  </>
                ) : (
                  // ===== Fallback: password login =====
                  <>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="label-caps">Password</label>
                        <button type="button" className="text-[11px] font-semibold text-primary hover:underline">
                          Forgot?
                        </button>
                      </div>
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

                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                      />
                      <span className="text-[12.5px] text-foreground/75">
                        Remember me on this device
                      </span>
                    </label>

                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full gradient-primary text-primary-foreground font-bold py-3 h-auto rounded-[14px] shadow-button text-[14px]"
                    >
                      {loading ? "Please wait..." : "Log in"}
                    </Button>

                    <button
                      type="button"
                      onClick={() => setUsePassword(false)}
                      className="w-full text-center text-[12px] font-semibold text-primary hover:underline"
                    >
                      ← Back to login code
                    </button>
                  </>
                )}
              </form>

              <p className="text-[12px] text-center text-muted-foreground mt-6">
                Don't have an account yet?{" "}
                <button
                  type="button"
                  onClick={() => { onBack(); setTimeout(() => navigate("/payment"), 50); }}
                  className="text-primary font-semibold hover:underline"
                >
                  See pricing & join
                </button>
              </p>

              <p className="text-center text-[11px] text-foreground/45 mt-8">
                © Remote Workher
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
