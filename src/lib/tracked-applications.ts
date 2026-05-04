import { supabase } from "@/integrations/supabase/client";

export type TrackedApplication = {
  id: string;
  job_title: string;
  company: string;
  status: string;
  applied_date: string | null;
  created_at: string;
  location: string | null;
  source: "tracker";
};

export async function fetchTrackedApplications(userId: string, limit?: number): Promise<TrackedApplication[]> {
  let query = supabase
    .from("job_applications")
    .select("id, job_id, status, created_at")
    .eq("applicant_user_id", userId)
    .order("created_at", { ascending: false });

  if (limit) query = query.limit(limit);

  const { data: submitted } = await query;
  if (!submitted || submitted.length === 0) return [];

  const jobIds = Array.from(new Set(submitted.map((app: any) => app.job_id).filter(Boolean)));
  const { data: jobs } = jobIds.length
    ? await supabase
        .from("recruiter_jobs")
        .select("id, title, location, user_id")
        .in("id", jobIds)
    : { data: [] as any[] };

  const recruiterIds = Array.from(new Set((jobs || []).map((job: any) => job.user_id).filter(Boolean)));
  const { data: recruiters } = recruiterIds.length
    ? await supabase
        .from("recruiter_profiles")
        .select("user_id, company_name")
        .in("user_id", recruiterIds)
    : { data: [] as any[] };

  const jobMap = new Map((jobs || []).map((job: any) => [job.id, job]));
  const recruiterMap = new Map((recruiters || []).map((recruiter: any) => [recruiter.user_id, recruiter.company_name]));

  return submitted.map((app: any) => {
    const job = jobMap.get(app.job_id);
    return {
      id: app.id,
      job_title: job?.title || "Job",
      company: recruiterMap.get(job?.user_id) || "Recruiter",
      status: app.status || "applied",
      applied_date: app.created_at,
      created_at: app.created_at,
      location: job?.location || null,
      source: "tracker",
    };
  });
}

export async function countTrackedApplications(userId: string): Promise<number> {
  const { count } = await supabase
    .from("job_applications")
    .select("id", { count: "exact", head: true })
    .eq("applicant_user_id", userId);

  return count || 0;
}
