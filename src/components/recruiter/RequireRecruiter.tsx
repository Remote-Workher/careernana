import { useNavigate } from "react-router-dom";
import { Lock, ArrowRight } from "lucide-react";
import { useRecruiterAuth } from "@/hooks/useRecruiterAuth";

interface Props {
  /** Action label shown on the lock screen, e.g. "post a job", "see your applicants" */
  action: string;
  children: React.ReactNode;
}

/**
 * Wraps a recruiter page so its content is only visible when signed in
 * as a recruiter. Otherwise shows a soft lock with a sign-in CTA.
 */
export default function RequireRecruiter({ action, children }: Props) {
  const navigate = useNavigate();
  const { user, isRecruiter, loading } = useRecruiterAuth();

  if (loading) {
    return (
      <div className="p-10 text-center text-[13px] text-muted-foreground">Loading...</div>
    );
  }

  if (user && isRecruiter) {
    return <>{children}</>;
  }

  return (
    <div className="p-6 md:p-10 flex items-start justify-center">
      <div className="w-full max-w-[480px] bg-card border-[1.5px] border-border rounded-2xl p-7 md:p-9 text-center mt-6 md:mt-10">
        <div className="w-14 h-14 rounded-2xl bg-primary-tint border border-primary-border mx-auto flex items-center justify-center mb-4">
          <Lock className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-[24px] font-serif text-foreground mb-1.5">
          Sign in to <em>{action}</em>
        </h2>
        <p className="text-[13px] text-muted-foreground leading-relaxed mb-6 max-w-[380px] mx-auto">
          Create a free recruiter account or log in to continue. It takes about a minute.
        </p>
        <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
          <button
            onClick={() => navigate("/recruiter/auth")}
            className="px-5 py-2.5 bg-gradient-to-br from-primary-dark to-primary text-primary-foreground rounded-[10px] text-[13px] font-semibold shadow-[0_4px_14px_rgba(224,72,122,0.35)] inline-flex items-center justify-center gap-1"
          >
            Sign in or create account <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => navigate("/recruiter")}
            className="px-5 py-2.5 border-[1.5px] border-border bg-card rounded-[10px] text-[13px] font-medium hover:border-primary transition-colors"
          >
            Back to recruiter home
          </button>
        </div>
      </div>
    </div>
  );
}
