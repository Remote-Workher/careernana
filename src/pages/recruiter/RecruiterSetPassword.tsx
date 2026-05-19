import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSEO } from "@/components/SEO";

export default function RecruiterSetPassword() {
  useSEO({ title: "Set your password — Remote Workher" });
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Supabase puts the recovery token in the URL hash. The client picks it up
    // automatically and emits a session via onAuthStateChange.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setReady(true);
      }
    });
    // Also check if a session is already present
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    // If after a moment we still don't have a session and no hash, show error
    const t = setTimeout(() => {
      if (!ready && !window.location.hash.includes("access_token")) {
        setError("This link is invalid or has expired. Please contact support.");
      }
    }, 2000);
    return () => { sub.subscription.unsubscribe(); clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { toast.error("Password must be at least 8 characters."); return; }
    if (password !== confirm) { toast.error("Passwords don't match."); return; }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password set! Welcome aboard.");
      navigate("/recruiter", { replace: true });
    } catch (err: any) {
      toast.error(err.message || "Could not set password");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-tint via-background to-secondary-tint flex items-center justify-center p-4">
      <div className="w-full max-w-[440px]">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-success/15 text-success mb-3">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-[28px] font-serif text-foreground leading-tight">
            You're <em>approved</em>
          </h1>
          <p className="text-[13px] text-muted-foreground mt-1.5">
            Set your password to log in and start posting jobs.
          </p>
        </div>

        <div className="bg-card rounded-[20px] shadow-card p-7 border border-border">
          {error ? (
            <p className="text-[13px] text-destructive text-center">{error}</p>
          ) : !ready ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold tracking-[1px] text-muted-foreground uppercase mb-2 block">New password</label>
                <div className="relative">
                  <input
                    type={show ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    required
                    minLength={8}
                    className="w-full px-4 py-3 pr-10 text-[13px] rounded-[13px] border border-border bg-background text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-[11px] font-bold tracking-[1px] text-muted-foreground uppercase mb-2 block">Confirm password</label>
                <input
                  type={show ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Re-enter password"
                  required
                  minLength={8}
                  className="w-full px-4 py-3 text-[13px] rounded-[13px] border border-border bg-background text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-gradient-to-br from-primary-dark to-primary text-primary-foreground font-bold py-3 rounded-[14px] shadow-button text-[14px]"
              >
                {saving ? "Saving…" : "Set password & log in"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
