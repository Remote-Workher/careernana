import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Eye, EyeOff, Building2, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { setRememberMe } from "@/lib/remember-session";

interface Props {
  onSuccess?: () => void;
}

export default function RecruiterAuthScreen({ onSuccess }: Props) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      setRememberMe(true);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const { data: profile } = await supabase
        .from("recruiter_profiles")
        .select("id")
        .eq("user_id", data.user!.id)
        .maybeSingle();

      if (!profile) {
        toast.error("This account isn't a recruiter account. Redirecting to talent login.");
        navigate("/login", { replace: true });
        return;
      }

      toast.success("Welcome back!");
      if (onSuccess) onSuccess();
      else navigate("/recruiter", { replace: true });
    } catch (e: any) {
      toast.error(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full px-4 py-3 text-[13px] rounded-[13px] border border-border bg-background text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all";

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-tint via-background to-secondary-tint flex items-center justify-center p-4">
      <div className="w-full max-w-[460px]">
        <button
          onClick={() => navigate("/recruiter")}
          className="inline-flex items-center gap-1.5 text-[12.5px] text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to recruiter home
        </button>

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary text-primary-foreground mb-3">
            <Building2 className="w-6 h-6" />
          </div>
          <h1 className="text-[28px] font-serif text-foreground leading-tight">
            Welcome <em>back</em>
          </h1>
          <p className="text-[13px] text-muted-foreground mt-1.5">
            Sign in to manage your jobs and applicants.
          </p>
        </div>

        <div className="bg-card rounded-[20px] shadow-card p-7 border border-border">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[11px] font-bold tracking-[1px] text-muted-foreground uppercase mb-2 block">Work email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                className={inputClass}
              />
            </div>

            <div>
              <label className="text-[11px] font-bold tracking-[1px] text-muted-foreground uppercase mb-2 block">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                  required
                  minLength={6}
                  className={`${inputClass} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-br from-primary-dark to-primary text-primary-foreground font-bold py-3 h-auto rounded-[14px] shadow-button text-[14px]"
            >
              {loading ? "Please wait..." : "Log in"}
            </Button>
          </form>

          <p className="text-[13px] text-center text-muted-foreground mt-6">
            New here?{" "}
            <button onClick={() => navigate("/recruiter/apply")} className="text-primary font-semibold hover:underline">
              Apply to hire on Remote Workher
            </button>
          </p>
        </div>

        <p className="text-[11.5px] text-center text-muted-foreground mt-4">
          Looking for a job instead?{" "}
          <button onClick={() => navigate("/")} className="text-primary font-semibold hover:underline">Go to talent home →</button>
        </p>
      </div>
    </div>
  );
}
