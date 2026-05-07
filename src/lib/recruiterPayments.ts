import { supabase } from "@/integrations/supabase/client";

export type RecruiterPurpose = "extra_job_slot" | "feature_job" | "hire_for_me" | "boost_job";

export const RECRUITER_PRICING = {
  extra_job_slot: { naira: 10_000, label: "Extra job posting" },
  feature_job: { naira: 50_000, label: "Featured job (30 days)", days: 30 },
  boost_job: { naira: 50_000, label: "Boost job (social + email)" },
} as const;

export const FREE_JOB_LIMIT = 3;

export async function startRecruiterCheckout(opts: {
  purpose: RecruiterPurpose;
  job_id?: string | null;
  amount_naira?: number; // required only for hire_for_me
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabase.functions.invoke("paystack-checkout", {
    body: {
      ...opts,
      callback_origin: window.location.origin,
    },
  });
  if (error) throw new Error(error.message || "Checkout failed");
  if (!data?.authorization_url) throw new Error(data?.error || "Checkout failed");
  // Persist what we're paying for so the success page knows what to do next
  sessionStorage.setItem(
    "rwh_pending_payment",
    JSON.stringify({ reference: data.reference, purpose: opts.purpose, job_id: opts.job_id ?? null }),
  );
  window.location.href = data.authorization_url;
}

export async function verifyRecruiterPayment(reference: string) {
  const { data, error } = await supabase.functions.invoke("paystack-verify", {
    body: { reference },
  });
  if (error) throw new Error(error.message || "Verification failed");
  return data;
}

/** Returns # of active jobs for this recruiter and # of unused paid extra-slot credits. */
export async function getRecruiterPostingQuota(userId: string) {
  const [{ count: activeCount }, { data: unusedSlots }] = await Promise.all([
    supabase
      .from("recruiter_jobs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "active"),
    supabase
      .from("recruiter_payments")
      .select("id")
      .eq("user_id", userId)
      .eq("purpose", "extra_job_slot")
      .eq("status", "success")
      .is("job_id", null),
  ]);
  return {
    activeCount: activeCount ?? 0,
    freeRemaining: Math.max(FREE_JOB_LIMIT - (activeCount ?? 0), 0),
    unusedPaidSlots: unusedSlots?.length ?? 0,
    needsPayment: (activeCount ?? 0) >= FREE_JOB_LIMIT && (unusedSlots?.length ?? 0) === 0,
  };
}

/** After successfully creating a paid job, attach the new job_id to one unused paid slot. */
export async function consumePaidSlotForJob(userId: string, jobId: string) {
  const { data: slot } = await supabase
    .from("recruiter_payments")
    .select("id")
    .eq("user_id", userId)
    .eq("purpose", "extra_job_slot")
    .eq("status", "success")
    .is("job_id", null)
    .limit(1)
    .maybeSingle();
  if (!slot) return;
  await supabase.from("recruiter_payments").update({ job_id: jobId }).eq("id", slot.id);
  await supabase.from("recruiter_jobs").update({ is_paid_slot: true }).eq("id", jobId);
}
