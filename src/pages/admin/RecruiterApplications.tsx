import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Building2, Check, ExternalLink, Globe, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useSEO } from "@/components/SEO";

type Application = {
  id: string;
  created_at: string;
  email: string;
  contact_name: string;
  company_name: string;
  company_website: string | null;
  company_size: string | null;
  industry: string | null;
  company_logo_url: string | null;
  company_description: string | null;
  role_title: string | null;
  culture: string | null;
  hiring_process: string | null;
  linkedin_url: string | null;
  twitter_url: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  youtube_url: string | null;
  status: string;
  reviewer_notes: string | null;
  reviewed_at: string | null;
  approved_user_id: string | null;
};

export default function RecruiterApplications() {
  useSEO({ title: "Recruiter Applications — Admin" });
  const navigate = useNavigate();
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    let q = supabase.from("recruiter_applications").select("*").order("created_at", { ascending: false });
    if (filter !== "all") q = q.eq("status", filter);
    const { data, error } = await q;
    if (error) toast.error(error.message);
    setApps((data as Application[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter]);

  const review = async (id: string, action: "approve" | "reject") => {
    const notes = action === "reject"
      ? window.prompt("Reason (shown to applicant in email):") || ""
      : window.prompt("Optional welcome note (shown in approval email):") || "";
    if (action === "reject" && !notes.trim()) {
      if (!window.confirm("Reject without sending a reason?")) return;
    }
    setBusyId(id);
    try {
      const { data, error } = await supabase.functions.invoke("recruiter-review-application", {
        body: { applicationId: id, action, notes: notes || null },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success(action === "approve" ? "Approved — email sent" : "Rejected — email sent");
      await load();
    } catch (err: any) {
      toast.error(err.message || "Action failed");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <Button variant="ghost" size="sm" onClick={() => navigate("/admin")} className="mb-4">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to admin
      </Button>

      <h1 className="text-2xl font-bold mb-1">Recruiter applications</h1>
      <p className="text-sm text-muted-foreground mb-5">Review &amp; approve employers who requested to hire on Remote Workher.</p>

      <div className="flex gap-2 mb-5 flex-wrap">
        {(["pending", "approved", "rejected", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-[12.5px] font-semibold capitalize ${filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-foreground hover:bg-muted/70"}`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : apps.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">No {filter !== "all" ? filter : ""} applications.</Card>
      ) : (
        <div className="space-y-3">
          {apps.map((app) => (
            <Card key={app.id} className="p-4 md:p-5">
              <div className="flex items-start gap-4">
                {app.company_logo_url ? (
                  <img src={app.company_logo_url} alt="" className="w-14 h-14 rounded-xl object-cover border border-border shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center shrink-0"><Building2 className="w-6 h-6 text-muted-foreground" /></div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <h2 className="text-[17px] font-bold text-foreground">{app.company_name}</h2>
                      <p className="text-[12.5px] text-muted-foreground">
                        {app.contact_name} {app.role_title && <>· {app.role_title}</>} · <a href={`mailto:${app.email}`} className="underline">{app.email}</a>
                      </p>
                      <p className="text-[11.5px] text-muted-foreground mt-0.5">
                        {[app.industry, app.company_size].filter(Boolean).join(" · ")} · submitted {new Date(app.created_at).toLocaleString()}
                      </p>
                    </div>
                    <StatusBadge status={app.status} />
                  </div>

                  {app.company_website && (
                    <a href={app.company_website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[12px] text-primary hover:underline mt-2">
                      <Globe className="w-3.5 h-3.5" /> {app.company_website.replace(/^https?:\/\//, "")} <ExternalLink className="w-3 h-3" />
                    </a>
                  )}

                  {expanded === app.id && (
                    <div className="mt-3 space-y-3 text-[13px] text-foreground/85">
                      {app.company_description && <div><p className="text-[10.5px] font-bold text-muted-foreground uppercase tracking-wider mb-1">About</p><p className="whitespace-pre-line">{app.company_description}</p></div>}
                      {app.culture && <div><p className="text-[10.5px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Culture</p><p className="whitespace-pre-line">{app.culture}</p></div>}
                      {app.hiring_process && <div><p className="text-[10.5px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Hiring process</p><p className="whitespace-pre-line">{app.hiring_process}</p></div>}
                      <div className="flex flex-wrap gap-2 text-[12px]">
                        {(["linkedin_url","twitter_url","instagram_url","facebook_url","youtube_url"] as const).map(k => app[k] && (
                          <a key={k} href={app[k] as string} target="_blank" rel="noreferrer" className="px-2 py-1 rounded-md border border-border hover:bg-muted inline-flex items-center gap-1">
                            {k.replace("_url","")} <ExternalLink className="w-3 h-3" />
                          </a>
                        ))}
                      </div>
                      {app.reviewer_notes && (
                        <div className="p-2.5 rounded-md bg-muted text-[12.5px]">
                          <p className="font-bold text-muted-foreground uppercase text-[10.5px] tracking-wider mb-0.5">Reviewer notes</p>
                          {app.reviewer_notes}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    <button onClick={() => setExpanded(expanded === app.id ? null : app.id)} className="text-[12px] font-semibold text-primary hover:underline">
                      {expanded === app.id ? "Hide details" : "View full details"}
                    </button>
                    {app.status === "pending" && (
                      <>
                        <Button size="sm" disabled={busyId === app.id} onClick={() => review(app.id, "approve")} className="bg-success text-success-foreground hover:opacity-90 ml-auto">
                          {busyId === app.id ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Check className="w-3.5 h-3.5 mr-1" />} Approve
                        </Button>
                        <Button size="sm" variant="outline" disabled={busyId === app.id} onClick={() => review(app.id, "reject")} className="border-destructive text-destructive hover:bg-destructive/10">
                          <X className="w-3.5 h-3.5 mr-1" /> Reject
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "approved") return <Badge className="bg-success text-success-foreground border-0">Approved</Badge>;
  if (status === "rejected") return <Badge variant="destructive">Rejected</Badge>;
  return <Badge variant="outline">Pending</Badge>;
}
