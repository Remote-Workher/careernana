import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSEO } from "@/components/SEO";
import logo from "@/assets/logo.svg";
import { Eye, EyeOff } from "lucide-react";

export default function ResetPassword() {
  useSEO({ title: "Reset Password" });
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase auto-exchanges the recovery token in the URL hash and fires
    // a PASSWORD_RECOVERY event. Wait for a session before allowing submit.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords don't match.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated. You're signed in.");
      navigate("/", { replace: true });
    } catch (e: any) {
      toast.error(e.message || "Could not update password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-5 py-10 font-sans">
      <img src={logo} alt="Remote Workher" className="h-8 mb-8" />
      <div className="w-full max-w-[400px] bg-card border border-border rounded-2xl p-6 md:p-8 shadow-sm">
        <h1 className="text-2xl font-serif font-semibold text-foreground mb-2">Set a new password</h1>
        <p className="text-sm text-muted-foreground mb-6">
          {ready
            ? "Choose a new password to log back in."
            : "Verifying your reset link…"}
        </p>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
              New password
            </label>
            <div className="relative">
              <input
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 characters"
                required
                minLength={6}
                disabled={!ready}
                className="w-full px-4 py-3 pr-10 border border-border rounded-[14px] text-sm bg-background outline-none focus:border-primary disabled:opacity-60"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Confirm password
            </label>
            <input
              type={show ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Re-enter your password"
              required
              minLength={6}
              disabled={!ready}
              className="w-full px-4 py-3 border border-border rounded-[14px] text-sm bg-background outline-none focus:border-primary disabled:opacity-60"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !ready}
            className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-[14px] text-sm hover:bg-primary-dark transition-colors disabled:opacity-60"
          >
            {loading ? "Updating…" : "Update password"}
          </button>
        </form>
      </div>
    </div>
  );
}
