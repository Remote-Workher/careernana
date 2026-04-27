import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Eye, EyeOff, Building2, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Props {
  onSuccess?: () => void;
}

export default function RecruiterAuthScreen({ onSuccess }: Props) {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [contactName, setContactName] = useState("");
  const [companyName, setCompanyName] = useState("");
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
            data: {
              account_type: "recruiter",
              contact_name: contactName,
              company_name: companyName,
            },
            emailRedirectTo: `${window.location.origin}/recruiter`,
          },
        });
        if (error) throw error;
        setEmailSent(true);
        toast.success("Check your email to confirm your recruiter account!");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        // Verify the account is a recruiter account
        const { data: profile } = await supabase
          .from("recruiter_profiles")
          .select("id")
          .eq("user_id", data.user!.id)
          .maybeSingle();

        if (!profile) {
          await supabase.auth.signOut();
          throw new Error("This account isn't a recruiter account. Please use the talent login instead.");
        }

        toast.success("Welcome back!");
        if (onSuccess) {
          onSuccess();
        } else {
          navigate("/recruiter", { replace: true });
        }
      }
    } catch (e: any) {
      toast.error(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full px-4 py-3 text-[13px] rounded-[13px] border border-border bg-background text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all";

  if (emailSent) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-card rounded-[20px] shadow-strong w-full max-w-[440px] p-8 text-center border border-border">
          <div className="w-14 h-14 rounded-xl bg-primary-tint flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">📧</span>
          </div>
          <h2 className="text-xl font-extrabold text-foreground mb-2">Check your inbox</h2>
          <p className="text-[13px] text-muted-foreground mb-6 leading-relaxed">
            We sent a confirmation link to <strong className="text-foreground">{email}</strong>. Click the link to activate your recruiter account.
          </p>
          <Button variant="outline" size="sm" onClick={() => { setEmailSent(false); setMode("login"); }}>
            I've confirmed — Log in
          </Button>
        </div>
      </div>
    );
  }

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
            {mode === "signup" ? <>Hire top <em>talent</em></> : <>Welcome <em>back</em></>}
          </h1>
          <p className="text-[13px] text-muted-foreground mt-1.5">
            {mode === "signup"
              ? "Create a free recruiter account to post jobs and reach candidates."
              : "Sign in to manage your jobs and applicants."}
          </p>
        </div>

        <div className="bg-card rounded-[20px] shadow-card p-7 border border-border">
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <>
                <div>
                  <label className="text-[11px] font-bold tracking-[1px] text-muted-foreground uppercase mb-2 block">Your name</label>
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Adeife Ogunjobi"
                    required
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold tracking-[1px] text-muted-foreground uppercase mb-2 block">Company name</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Acme Inc."
                    required
                    className={inputClass}
                  />
                </div>
              </>
            )}

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
                  placeholder="Min 6 characters"
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

            {mode === "signup" && (
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-[12px] text-muted-foreground leading-relaxed">
                  I agree to the <button type="button" className="text-primary font-medium hover:underline">Terms of Service</button> and{" "}
                  <button type="button" className="text-primary font-medium hover:underline">Privacy Policy</button>
                </span>
              </label>
            )}

            <Button
              type="submit"
              disabled={loading || (mode === "signup" && !agreed)}
              className="w-full bg-gradient-to-br from-primary-dark to-primary text-primary-foreground font-bold py-3 h-auto rounded-[14px] shadow-button text-[14px]"
            >
              {loading ? "Please wait..." : mode === "signup" ? "Create recruiter account — free" : "Log in"}
            </Button>
          </form>

          <p className="text-[13px] text-center text-muted-foreground mt-6">
            {mode === "signup" ? (
              <>Already have a recruiter account?{" "}
                <button onClick={() => setMode("login")} className="text-primary font-semibold hover:underline">Log in</button>
              </>
            ) : (
              <>New here?{" "}
                <button onClick={() => setMode("signup")} className="text-primary font-semibold hover:underline">Create a recruiter account</button>
              </>
            )}
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
