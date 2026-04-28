import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import logo from "@/assets/logo.svg";
import { getRememberMe, setRememberMe as persistRememberMe } from "@/lib/remember-session";

interface AuthScreenProps {
  onSuccess: () => void;
  onBack: () => void;
  /** Kept for backwards compatibility — signup is no longer available here. */
  defaultMode?: "login" | "signup";
}

export default function AuthScreen({ onSuccess, onBack }: AuthScreenProps) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailSentKind, setEmailSentKind] = useState<"signup" | "email_code">("signup");
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeStep, setCodeStep] = useState<"idle" | "awaiting_code">("idle");
  const [otpCode, setOtpCode] = useState("");
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [rememberMe, setRememberMe] = useState<boolean>(() => getRememberMe());

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

  const inputClass = "w-full px-4 py-3 text-[13px] rounded-[13px] border border-border bg-background text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all";

  if (emailSent) {
    return (
      <div className="fixed inset-0 z-[100] bg-[#F0EBE8] flex items-center justify-center p-4">
        <div className="bg-card rounded-[24px] shadow-strong w-full max-w-[440px] p-8 text-center border border-border">
          <div className="flex items-center justify-center mb-5">
            <img src={logo} alt="Remote Workher" className="h-8 w-auto" />
          </div>
          <div className="w-14 h-14 rounded-2xl bg-primary-tint flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">📧</span>
          </div>
          <h2 className="text-[24px] font-extrabold text-foreground mb-2 font-[EB_Garamond,serif] tracking-[-0.4px]">
            Welcome to Remote Workher
          </h2>
          <p className="text-[13px] text-muted-foreground mb-6 leading-relaxed">
            We sent a confirmation link to <strong className="text-foreground">{email}</strong>. Click it to activate your account and start your remote job search.
          </p>
          <Button
            onClick={() => { setEmailSent(false); setMode("login"); }}
            className="w-full gradient-primary text-primary-foreground font-bold py-3 h-auto rounded-[14px] shadow-button text-[14px]"
          >
            I've confirmed — Log in
          </Button>
          <p className="text-[11px] text-foreground/50 mt-5">
            © Remote Workher · Built for women landing remote roles globally.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-[#F0EBE8] overflow-y-auto">
      {/* Top bar with back to home */}
      <div className="px-5 md:px-8 h-[58px] flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-foreground/70 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to home
        </button>
        <img src={logo} alt="Remote Workher" className="h-7 w-auto" />
      </div>

      <div className="flex items-start justify-center px-4 pb-12 pt-4 md:pt-10">
        <div className="w-full max-w-[440px]">
          {/* Card */}
          <div className="bg-card rounded-[24px] shadow-strong border border-border overflow-hidden">
            {/* Tab switcher */}
            <div className="grid grid-cols-2 bg-[#F7F2EF] p-1.5 m-3 rounded-[14px]">
              <button
                onClick={() => setMode("login")}
                className={`py-2.5 text-[13px] font-semibold rounded-[10px] transition-all ${
                  mode === "login"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-foreground/55 hover:text-foreground"
                }`}
              >
                Log in
              </button>
              <button
                onClick={() => setMode("signup")}
                className={`py-2.5 text-[13px] font-semibold rounded-[10px] transition-all ${
                  mode === "signup"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-foreground/55 hover:text-foreground"
                }`}
              >
                Sign up
              </button>
            </div>

            <div className="px-7 pb-8 pt-2 sm:px-8">
              <h2 className="text-[26px] leading-tight font-extrabold text-foreground mb-1.5 font-[EB_Garamond,serif] tracking-[-0.5px]">
                {mode === "signup" ? "Create your Remote Workher account" : "Welcome back"}
              </h2>
              <p className="text-[13px] text-muted-foreground mb-6 leading-relaxed">
                {mode === "signup"
                  ? "Remote Workher helps women land remote roles globally. Membership starts at ₦5,000/month — cancel anytime."
                  : "Log in to pick up where you left off on your Remote Workher job search."}
              </p>

              {/* New-to-Remote-Workher inline banner (login mode only) */}
              {mode === "login" && (
                <div className="mb-5 flex items-center justify-between gap-3 bg-primary-tint/60 border border-primary/15 rounded-[12px] px-3.5 py-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-base">✨</span>
                    <p className="text-[12.5px] text-foreground/80 truncate">
                      <span className="font-semibold text-foreground">New to Remote Workher?</span>{" "}
                      <span className="text-foreground/60">Check our pricing.</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { onBack(); setTimeout(() => navigate("/payment"), 50); }}
                    className="shrink-0 text-[12px] font-bold text-primary hover:underline whitespace-nowrap"
                  >
                    See pricing →
                  </button>
                </div>
              )}

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
                  <div className="flex items-center justify-between mb-2">
                    <label className="label-caps">Password</label>
                    {mode === "login" && (
                      <button type="button" className="text-[11px] font-semibold text-primary hover:underline">
                        Forgot?
                      </button>
                    )}
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

                {mode === "signup" && (
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agreed}
                      onChange={(e) => setAgreed(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded border-border text-primary focus:ring-primary"
                    />
                    <span className="text-[12px] text-muted-foreground leading-relaxed">
                      I agree to the <button type="button" className="text-primary font-medium hover:underline">Terms</button> and <button type="button" className="text-primary font-medium hover:underline">Privacy Policy</button>
                    </span>
                  </label>
                )}

                {mode === "login" && (
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
                )}

                <Button
                  type="submit"
                  disabled={loading || (mode === "signup" && !agreed)}
                  className="w-full gradient-primary text-primary-foreground font-bold py-3 h-auto rounded-[14px] shadow-button text-[14px]"
                >
                  {loading ? "Please wait..." : mode === "signup" ? "Create account" : "Log in"}
                </Button>

                {mode === "login" && (
                  <>
                    <div className="flex items-center gap-3 my-1">
                      <div className="h-px bg-border flex-1" />
                      <span className="text-[10.5px] uppercase tracking-[0.12em] font-semibold text-muted-foreground">or</span>
                      <div className="h-px bg-border flex-1" />
                    </div>

                    {codeStep === "idle" ? (
                      <>
                        <button
                          type="button"
                          onClick={handleSendCode}
                          disabled={codeLoading || loading}
                          className="w-full flex items-center justify-center gap-2 bg-background border border-border text-foreground font-semibold py-3 h-auto rounded-[14px] text-[13.5px] hover:bg-muted transition-colors disabled:opacity-60"
                        >
                          <span aria-hidden>🔢</span>
                          {codeLoading ? "Sending code..." : "Email me a login code"}
                        </button>
                        <p className="text-[11.5px] text-center text-muted-foreground -mt-1">
                          Skip the password — we'll email a 6-digit sign-in code.
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
                  </>
                )}
              </form>

              {mode === "signup" && (
                <p className="text-[12px] text-center text-muted-foreground mt-5">
                  Already have an account?{" "}
                  <button onClick={() => setMode("login")} className="text-primary font-semibold hover:underline">
                    Log in
                  </button>
                </p>
              )}
            </div>
          </div>

          <p className="text-center text-[11px] text-foreground/50 mt-5">
            © Remote Workher · Built for women landing remote roles globally.
          </p>
        </div>
      </div>
    </div>
  );
}
