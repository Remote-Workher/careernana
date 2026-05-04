import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ApplyDialog from "@/components/ApplyDialog";

export default function ApplyToJob() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data: rj } = await supabase
        .from("recruiter_jobs")
        .select("id, title, description, screening_questions, user_id")
        .eq("id", id)
        .maybeSingle();
      if (rj) {
        const { data: rp } = await supabase
          .from("recruiter_profiles")
          .select("company_name")
          .eq("user_id", (rj as any).user_id)
          .maybeSingle();
        setJob({
          id: (rj as any).id,
          title: (rj as any).title,
          company: rp?.company_name ?? "Company",
          recruiter_user_id: (rj as any).user_id,
          screening_questions: (rj as any).screening_questions ?? [],
          description: (rj as any).description ?? "",
        });
      }
      setLoading(false);
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10 text-center">
        <p className="text-foreground font-bold">Job not found</p>
        <Link to="/jobs" className="text-primary text-[13px] mt-3 inline-block">Back to jobs</Link>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-58px)] bg-background py-4 sm:py-8 px-3 sm:px-6">
      <div className="max-w-3xl mx-auto mb-4">
        <button
          onClick={() => navigate(`/jobs/${job.id}`)}
          className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" /> Back to job
        </button>
      </div>
      <ApplyDialog
        open
        variant="page"
        job={job}
        onClose={() => navigate(`/jobs/${job.id}`)}
        onApplied={() => {
          setTimeout(() => navigate(`/applications`), 1500);
        }}
      />
    </div>
  );
}
