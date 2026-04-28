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

        toast.success("Welcome back! 🧭");
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
      <div className="fixed inset-0 z-[100] gradient-primary flex items-center justify-center p-4">
        <div className="bg-card rounded-[20px] shadow-strong w-full max-w-[440px] p-8 text-center">
          <div className="w-14 h-14 rounded-xl bg-primary-tint flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">📧</span>
          </div>
          <h2 className="text-xl font-extrabold text-foreground mb-2">Check your inbox</h2>
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
    <div className="fixed inset-0 z-[100] gradient-primary flex items-center justify-center p-4">
      <div className="w-full max-w-[440px]">
        {/* Branding */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2.5 mb-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Compass className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-2xl font-black tracking-tight text-primary-foreground">compass</span>
          </div>
          <p className="text-[13px] text-primary-foreground/70 font-medium">Career clarity for Nigerian professionals</p>
        </div>

        {/* Card */}
        <div className="bg-card rounded-[20px] shadow-strong p-8">
          <h2 className="text-xl font-extrabold text-foreground mb-1">
            {mode === "signup" ? "Create your account" : "Welcome back"}
          </h2>
          <p className="text-[13px] text-muted-foreground mb-6">
            {mode === "signup" ? "Start your career journey today" : "Pick up where you left off"}
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
              <>New to Compass?{" "}<button onClick={() => setMode("signup")} className="text-primary font-semibold hover:underline">Sign up free</button></>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
