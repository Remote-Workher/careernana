import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";

interface AuthScreenProps {
  onSuccess: () => void;
  onBack: () => void;
}

export default function AuthScreen({ onSuccess, onBack }: AuthScreenProps) {
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

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
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        setEmailSent(true);
        toast.success("Check your email to confirm your account!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back! 🧭");
        onSuccess();
      }
    } catch (e: any) {
      toast.error(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="fixed inset-0 z-[100] bg-background flex items-center justify-center p-4">
        <div className="bg-card rounded-2xl border shadow-elevated w-full max-w-[440px] p-8 text-center">
          <div className="w-14 h-14 rounded-xl bg-accent flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">📧</span>
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Check your inbox</h2>
          <p className="text-sm text-muted-foreground mb-6">
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
    <div className="fixed inset-0 z-[100] bg-background flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl border shadow-elevated w-full max-w-[440px] p-8">
        <button onClick={onBack} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center">
            <span className="text-primary-foreground text-lg">🧭</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">
              {mode === "signup" ? "Create your account" : "Welcome back"}
            </h2>
            <p className="text-xs text-muted-foreground">
              {mode === "signup" ? "Start your career journey" : "Pick up where you left off"}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 block">Full name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Adeife Ogunjobi"
                required
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-border bg-card focus:border-primary focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-foreground mb-1.5 block">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              required
              className="w-full px-3 py-2.5 text-sm rounded-xl border border-border bg-card focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground mb-1.5 block">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 characters"
                required
                minLength={6}
                className="w-full px-3 py-2.5 pr-10 text-sm rounded-xl border border-border bg-card focus:border-primary focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full gradient-primary text-primary-foreground">
            {loading ? "Please wait..." : mode === "signup" ? "Create account" : "Log in"}
          </Button>
        </form>

        <p className="text-xs text-center text-muted-foreground mt-5">
          {mode === "signup" ? (
            <>Already have an account?{" "}<button onClick={() => setMode("login")} className="text-primary font-medium hover:underline">Log in</button></>
          ) : (
            <>Don't have an account?{" "}<button onClick={() => setMode("signup")} className="text-primary font-medium hover:underline">Sign up</button></>
          )}
        </p>
      </div>
    </div>
  );
}
