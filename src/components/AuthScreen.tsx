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
    <div className="fixed inset-0 z-[100] bg-[#F5F0ED] overflow-y-auto">
      {/* Top bar with back to home */}
      <div className="bg-card/85 backdrop-blur-md border-b border-border/60 sticky top-0 z-10">
        <div className="max-w-[1240px] mx-auto px-5 md:px-8 h-[64px] flex items-center justify-between">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-foreground/70 hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to home
          </button>
          <img src={logo} alt="Remote Workher" className="h-7 w-auto" />
        </div>
      </div>

      <div className="flex items-stretch justify-center px-4 pb-12 pt-6 md:pt-10">
        <div className="w-full max-w-[460px] lg:max-w-[1100px] lg:grid lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:items-stretch">
          {/* ===== Desktop-only marketing column (dark branded panel) ===== */}
          <aside className="hidden lg:flex flex-col justify-between gap-8 rounded-[28px] p-9 text-white relative overflow-hidden bg-foreground shadow-strong">
            {/* decorative gradient blobs */}
            <div className="absolute -top-20 -right-20 w-[320px] h-[320px] rounded-full bg-primary/40 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-16 w-[280px] h-[280px] rounded-full bg-primary/20 blur-3xl pointer-events-none" />

            <div className="relative">
              <span className="inline-flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-primary-foreground bg-primary/90 rounded-full px-2.5 py-1 mb-5">
                <Sparkles className="w-3 h-3" /> Remote Workher
              </span>
              <h1 className="text-[42px] leading-[1.02] font-extrabold font-[EB_Garamond,serif] tracking-[-1px] mb-3 text-white">
                Welcome back to your <span className="text-primary">career engine.</span>
              </h1>
              <p className="text-[14px] text-white/70 max-w-[400px] leading-relaxed">
                Pick up where you left off — your applications, AI tools, brag file and roadmap are right where you left them.
              </p>
            </div>

            <ul className="relative space-y-3.5">
              {[
                { icon: Briefcase, title: "Curated remote jobs", body: "Verified roles refreshed daily." },
                { icon: Sparkles, title: "AI tools by Zara", body: "Resume, cover letter & outreach in seconds." },
                { icon: Trophy, title: "Brag file & wins", body: "Track every achievement, ready for interviews." },
                { icon: Users, title: "Community of women", body: "Build, learn and grow together." },
              ].map(({ icon: Icon, title, body }) => (
                <li key={title} className="flex items-start gap-3 bg-white/[0.06] border border-white/10 rounded-[14px] px-3.5 py-3 backdrop-blur-sm">
                  <span className="shrink-0 w-9 h-9 rounded-[10px] bg-primary/25 flex items-center justify-center ring-1 ring-primary/30">
                    <Icon className="w-4 h-4 text-primary-foreground" />
                  </span>
                  <div>
                    <div className="text-[13.5px] font-bold text-white leading-tight">{title}</div>
                    <div className="text-[12px] text-white/65 mt-0.5 leading-snug">{body}</div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="relative">
              <div className="bg-white/[0.07] border border-white/10 rounded-[16px] p-4 backdrop-blur-sm">
                <p className="text-[12.5px] text-white/85 leading-relaxed italic">
                  "Remote Workher helped me land my dream remote job and grow my career faster than I imagined."
                </p>
                <p className="text-[11.5px] font-semibold text-white/60 mt-2">— Priya S., Content Writer</p>
              </div>
              <div className="flex items-center gap-2 text-[10.5px] font-semibold text-white/55 uppercase tracking-[0.14em] mt-4">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                Trusted by 10,000+ women across Africa
              </div>
            </div>
          </aside>

          {/* ===== Auth card column ===== */}
          <div className="w-full max-w-[460px] mx-auto lg:mx-0 lg:max-w-none flex flex-col">
          {/* Card */}
          <div className="bg-card rounded-[24px] shadow-strong border border-border/70 overflow-hidden">
            {/* Card header */}
            <div className="px-7 sm:px-9 pt-8 pb-6 border-b border-border/60">
              <span className="inline-block text-[10.5px] font-bold uppercase tracking-[0.16em] text-primary mb-3">
                Sign in
              </span>
              <h2 className="text-[28px] leading-[1.1] font-extrabold text-foreground mb-2 font-[EB_Garamond,serif] tracking-[-0.5px]">
                {heading}
              </h2>
              <p className="text-[13px] text-muted-foreground leading-relaxed">
                {subtext}
              </p>
            </div>
            <div className="px-7 pt-7 pb-8 sm:px-9">
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

              <p className="text-[12px] text-center text-muted-foreground mt-5">
                Don't have an account yet?{" "}
                <button
                  type="button"
                  onClick={() => { onBack(); setTimeout(() => navigate("/payment"), 50); }}
                  className="text-primary font-semibold hover:underline"
                >
                  See pricing & join
                </button>
              </p>
            </div>
          </div>

            <p className="text-center text-[11px] text-foreground/50 mt-5">
              © Remote Workher
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
