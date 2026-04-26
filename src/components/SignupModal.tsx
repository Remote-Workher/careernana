import { useState } from "react";
import { X, Sparkles, Mail, User, ShieldCheck, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SignupModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  toolName?: string;
  heading?: string;
  subtext?: string;
  bullets?: string[];
  ctaLabel?: string;
}

export default function SignupModal({ open, onClose, onSuccess, toolName, heading, subtext, bullets, ctaLabel }: SignupModalProps) {
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: window.location.origin + window.location.pathname,
          },
        });
        if (error) throw error;
        setEmailSent(true);
        toast.success("Check your email to confirm your account!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back! 🎉");
        onSuccess?.();
        onClose();
      }
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-[20px] shadow-strong w-full max-w-[420px] p-7 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {emailSent ? (
          <div className="text-center py-2">
            <div className="w-14 h-14 rounded-2xl bg-primary-tint flex items-center justify-center mx-auto mb-4">
              <Mail className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-[18px] font-extrabold text-foreground mb-2">Check your inbox</h2>
            <p className="text-[13px] text-muted-foreground leading-relaxed mb-5">
              We sent a confirmation link to <strong className="text-foreground">{email}</strong>. Click it to activate your account and your 5 free credits.
            </p>
            <button
              onClick={() => { setEmailSent(false); setMode("login"); }}
              className="text-[13px] text-primary font-semibold hover:underline"
            >
              I've confirmed — Log in
            </button>
          </div>
        ) : (
          <>
            <div className="text-center mb-5">
              <div className="w-14 h-14 rounded-2xl bg-primary-tint flex items-center justify-center mx-auto mb-3">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-[19px] font-extrabold text-foreground mb-1.5">
                {mode === "signup" ? (heading ?? "You're one step away from applying.") : "Welcome back"}
              </h2>
              <p className="text-[12.5px] text-muted-foreground leading-relaxed">
                {mode === "signup" ? (
                  subtext ?? <>You'll get <span className="text-primary font-semibold">5 free credits</span> to try this tool.</>
                ) : (
                  "Log in to continue where you left off"
                )}
              </p>
            </div>

            {mode === "signup" && bullets && bullets.length > 0 && (
              <ul className="space-y-2 mb-5 -mt-1">
                {bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2 text-[12.5px] text-foreground/85 leading-snug">
                    <span className="mt-0.5 w-4 h-4 rounded-full bg-primary-tint text-primary inline-flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5" />
                    </span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-foreground mb-1.5 block">Email address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    className="w-full pl-9 pr-3 py-2.5 text-[13px] rounded-[10px] border border-border bg-background text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 transition-all"
                  />
                </div>
              </div>

              {mode === "signup" && (
                <div>
                  <label className="text-[11px] font-semibold text-foreground mb-1.5 block">Full name <span className="text-muted-foreground font-normal">(optional)</span></label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your full name"
                      className="w-full pl-9 pr-3 py-2.5 text-[13px] rounded-[10px] border border-border bg-background text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 transition-all"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-[11px] font-semibold text-foreground mb-1.5 block">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  required
                  minLength={6}
                  className="w-full px-3 py-2.5 text-[13px] rounded-[10px] border border-border bg-background text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-[11px] text-[13px] font-bold text-primary-foreground gradient-primary shadow-button disabled:opacity-60 transition-opacity"
              >
                {loading ? "Please wait..." : mode === "signup" ? (ctaLabel ?? "Start applying — free") : "Log in"}
              </button>
            </form>

            <p className="text-[12px] text-center text-muted-foreground mt-4">
              {mode === "signup" ? (
                <>Already have an account?{" "}<button onClick={() => setMode("login")} className="text-primary font-semibold hover:underline">Log in</button></>
              ) : (
                <>New here?{" "}<button onClick={() => setMode("signup")} className="text-primary font-semibold hover:underline">Sign up free</button></>
              )}
            </p>

            <div className="flex items-center justify-center gap-1.5 mt-3 text-[11px] text-muted-foreground">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>No spam. No commitment.</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
