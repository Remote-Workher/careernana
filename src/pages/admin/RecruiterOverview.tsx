import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Mail, Phone, Globe, Building2, Briefcase, CreditCard, ExternalLink, CheckCircle2, XCircle, RotateCcw, Save, Linkedin, Twitter, Instagram, Facebook, Youtube } from "lucide-react";
import { useSEO } from "@/components/SEO";

function fmtNaira(kobo: number) {
  const naira = (kobo || 0) / 100;
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(naira);
}

function StatusBadge({ status }: { status?: string | null }) {
  const s = status || "pending";
  if (s === "verified") return <Badge className="bg-success text-success-foreground border-0">Verified</Badge>;
  if (s === "rejected") return <Badge variant="destructive">Rejected</Badge>;
  return <Badge variant="outline">Pending review</Badge>;
}

export default function RecruiterOverview() {
  useSEO({ title: "Recruiter Overview" });
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [pays, setPays] = useState<any[]>([]);
  const [refresh, setRefresh] = useState(0);
  const [edit, setEdit] = useState<any>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setEdit({
      company_website: profile.company_website || "",
      linkedin_url: profile.linkedin_url || "",
      twitter_url: profile.twitter_url || "",
      instagram_url: profile.instagram_url || "",
      facebook_url: profile.facebook_url || "",
      youtube_url: profile.youtube_url || "",
      mission: profile.mission || "",
      culture: profile.culture || "",
      hiring_process: profile.hiring_process || "",
      company_description: profile.company_description || "",
    });
  }, [profile]);

  const saveDetails = async () => {
    if (!userId) return;
    setSaving(true);
    const { error } = await supabase.from("recruiter_profiles").update(edit).eq("user_id", userId);
    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Company details saved" });
    setRefresh(r => r + 1);
  };

  useEffect(() => {
    if (!userId) return;
    (async () => {
      setLoading(true);
      const [p, j, pay] = await Promise.all([
        supabase.from("recruiter_profiles").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("recruiter_jobs").select("id, title, status, applications_count, shortlisted_count, location, work_type, employment_type, created_at, is_featured").eq("user_id", userId).order("created_at", { ascending: false }),
        supabase.from("recruiter_payments").select("id, amount_kobo, currency, purpose, status, created_at, paid_at").eq("user_id", userId).order("created_at", { ascending: false }),
      ]);
      setProfile(p.data);
      setJobs(j.data || []);
      setPays(pay.data || []);
      setLoading(false);
    })();
  }, [userId, refresh]);

  const setStatus = async (status: "verified" | "rejected" | "pending", notes?: string) => {
    if (!userId || !profile) return;
    const patch: any = {
      verification_status: status,
      verification_notes: notes ?? null,
      verified_at: status === "verified" ? new Date().toISOString() : null,
    };
    const { error } = await supabase.from("recruiter_profiles").update(patch).eq("user_id", userId);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: status === "verified" ? "Company verified" : status === "rejected" ? "Company rejected" : "Reset to pending" });
    setRefresh(r => r + 1);

    if ((status === "verified" || status === "rejected") && profile.email) {
      try {
        await supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "recruiter-verification",
            recipientEmail: profile.email,
            idempotencyKey: `recruiter-verification-${status}-${userId}-${Date.now()}`,
            templateData: {
              contactName: profile.contact_name || "",
              companyName: profile.company_name || "",
              status,
              reviewerNotes: notes || "",
            },
          },
        });
      } catch { /* non-blocking */ }
    }
  };

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading recruiter…</div>;
  }
  if (!profile) {
    return (
      <div className="p-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
        <Card className="p-6 mt-4">Recruiter not found.</Card>
      </div>
    );
  }

  const status = profile.verification_status || "pending";
  const totalPaid = pays.filter(p => p.status === "success").reduce((a, p) => a + (p.amount_kobo || 0), 0);
  const activeJobs = jobs.filter(j => j.status === "active").length;
  const totalApps = jobs.reduce((a, j) => a + (j.applications_count || 0), 0);

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to admin
        </Button>
        <StatusBadge status={status} />
      </div>

      <Card className="p-5">
        <div className="flex items-start gap-4">
          {profile.company_logo_url ? (
            <img src={profile.company_logo_url} alt="" className="w-16 h-16 rounded-lg object-cover border" />
          ) : (
            <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center"><Building2 className="w-7 h-7 text-muted-foreground" /></div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold tracking-tight">{profile.company_name || "—"}</h1>
            <div className="text-sm text-muted-foreground mt-0.5">
              {profile.industry || "—"} {profile.company_size ? `• ${profile.company_size}` : ""}
            </div>
            {profile.company_website && (
              <a href={profile.company_website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-primary underline mt-1">
                <Globe className="w-3.5 h-3.5" /> {profile.company_website} <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5 text-sm">
          <div><span className="text-muted-foreground">Contact:</span> <span className="font-medium">{profile.contact_name || "—"}</span> {profile.role_title ? <span className="text-muted-foreground">({profile.role_title})</span> : null}</div>
          <div className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-muted-foreground" /> <a href={`mailto:${profile.email}`} className="underline break-all">{profile.email}</a></div>
          {profile.phone && <div className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-muted-foreground" /> {profile.phone}</div>}
          <div className="text-muted-foreground">Joined {new Date(profile.created_at).toLocaleDateString()}</div>
          {profile.verified_at && <div className="text-muted-foreground">Verified {new Date(profile.verified_at).toLocaleDateString()}</div>}
        </div>

        {profile.company_description && (
          <div className="mt-4">
            <div className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1">About</div>
            <p className="text-sm whitespace-pre-wrap">{profile.company_description}</p>
          </div>
        )}
        {profile.mission && (
          <div className="mt-4">
            <div className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1">Mission</div>
            <p className="text-sm whitespace-pre-wrap">{profile.mission}</p>
          </div>
        )}
        {(profile.linkedin_url || profile.twitter_url || profile.instagram_url || profile.facebook_url || profile.youtube_url) && (
          <div className="mt-4">
            <div className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1">Social</div>
            <div className="flex flex-wrap gap-2 text-sm">
              {profile.linkedin_url && <a href={profile.linkedin_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-2 py-1 rounded-md border hover:bg-muted"><Linkedin className="w-3.5 h-3.5" /> LinkedIn <ExternalLink className="w-3 h-3" /></a>}
              {profile.twitter_url && <a href={profile.twitter_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-2 py-1 rounded-md border hover:bg-muted"><Twitter className="w-3.5 h-3.5" /> Twitter <ExternalLink className="w-3 h-3" /></a>}
              {profile.instagram_url && <a href={profile.instagram_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-2 py-1 rounded-md border hover:bg-muted"><Instagram className="w-3.5 h-3.5" /> Instagram <ExternalLink className="w-3 h-3" /></a>}
              {profile.facebook_url && <a href={profile.facebook_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-2 py-1 rounded-md border hover:bg-muted"><Facebook className="w-3.5 h-3.5" /> Facebook <ExternalLink className="w-3 h-3" /></a>}
              {profile.youtube_url && <a href={profile.youtube_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-2 py-1 rounded-md border hover:bg-muted"><Youtube className="w-3.5 h-3.5" /> YouTube <ExternalLink className="w-3 h-3" /></a>}
            </div>
          </div>
        )}
        {profile.culture && (
          <div className="mt-4">
            <div className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1">Culture</div>
            <p className="text-sm whitespace-pre-wrap">{profile.culture}</p>
          </div>
        )}
        {profile.hiring_process && (
          <div className="mt-4">
            <div className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1">Hiring process</div>
            <p className="text-sm whitespace-pre-wrap">{profile.hiring_process}</p>
          </div>
        )}
        {profile.verification_notes && (
          <div className="mt-4 p-3 rounded-md bg-muted/60 text-sm">
            <div className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1">Reviewer notes</div>
            {profile.verification_notes}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 mt-5 pt-4 border-t">
          {status !== "verified" && (
            <Button onClick={() => setStatus("verified")} className="bg-success text-success-foreground hover:opacity-90">
              <CheckCircle2 className="w-4 h-4 mr-1.5" /> Verify
            </Button>
          )}
          {status !== "rejected" && (
            <Button
              variant="outline"
              className="border-destructive text-destructive hover:bg-destructive/10"
              onClick={() => {
                const note = window.prompt("Reason (optional, shown to recruiter):") || "";
                setStatus("rejected", note || undefined);
              }}
            >
              <XCircle className="w-4 h-4 mr-1.5" /> Reject
            </Button>
          )}
          {status !== "pending" && (
            <Button variant="ghost" onClick={() => setStatus("pending")}>
              <RotateCcw className="w-4 h-4 mr-1.5" /> Reset to pending
            </Button>
          )}
        </div>
      </Card>

      <Card className="p-5 space-y-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="font-semibold flex items-center gap-2"><Building2 className="w-4 h-4" /> Edit company details</h2>
          <Button size="sm" onClick={saveDetails} disabled={saving}>
            <Save className="w-4 h-4 mr-1.5" /> {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="website" className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> Company website</Label>
            <Input id="website" placeholder="https://company.com" value={edit.company_website || ""} onChange={(e) => setEdit({ ...edit, company_website: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="linkedin" className="flex items-center gap-1.5"><Linkedin className="w-3.5 h-3.5" /> LinkedIn</Label>
            <Input id="linkedin" placeholder="https://linkedin.com/company/…" value={edit.linkedin_url || ""} onChange={(e) => setEdit({ ...edit, linkedin_url: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="twitter" className="flex items-center gap-1.5"><Twitter className="w-3.5 h-3.5" /> Twitter / X</Label>
            <Input id="twitter" placeholder="https://x.com/…" value={edit.twitter_url || ""} onChange={(e) => setEdit({ ...edit, twitter_url: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="instagram" className="flex items-center gap-1.5"><Instagram className="w-3.5 h-3.5" /> Instagram</Label>
            <Input id="instagram" placeholder="https://instagram.com/…" value={edit.instagram_url || ""} onChange={(e) => setEdit({ ...edit, instagram_url: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="facebook" className="flex items-center gap-1.5"><Facebook className="w-3.5 h-3.5" /> Facebook</Label>
            <Input id="facebook" placeholder="https://facebook.com/…" value={edit.facebook_url || ""} onChange={(e) => setEdit({ ...edit, facebook_url: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="youtube" className="flex items-center gap-1.5"><Youtube className="w-3.5 h-3.5" /> YouTube</Label>
            <Input id="youtube" placeholder="https://youtube.com/@…" value={edit.youtube_url || ""} onChange={(e) => setEdit({ ...edit, youtube_url: e.target.value })} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="about">About the company</Label>
          <Textarea id="about" rows={4} placeholder="Short company description" value={edit.company_description || ""} onChange={(e) => setEdit({ ...edit, company_description: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="mission">Mission</Label>
          <Textarea id="mission" rows={3} placeholder="What the company is trying to achieve" value={edit.mission || ""} onChange={(e) => setEdit({ ...edit, mission: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="culture">Culture & values</Label>
          <Textarea id="culture" rows={4} placeholder="How the team works and what they value" value={edit.culture || ""} onChange={(e) => setEdit({ ...edit, culture: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="hiring">Hiring process</Label>
          <Textarea id="hiring" rows={4} placeholder="Steps a candidate should expect" value={edit.hiring_process || ""} onChange={(e) => setEdit({ ...edit, hiring_process: e.target.value })} />
        </div>

        <div className="flex justify-end pt-2 border-t">
          <Button onClick={saveDetails} disabled={saving}>
            <Save className="w-4 h-4 mr-1.5" /> {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4"><div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Active jobs</div><div className="text-2xl font-bold mt-1">{activeJobs}</div></Card>
        <Card className="p-4"><div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Total jobs</div><div className="text-2xl font-bold mt-1">{jobs.length}</div></Card>
        <Card className="p-4"><div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Applications</div><div className="text-2xl font-bold mt-1">{totalApps}</div></Card>
        <Card className="p-4"><div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Total paid</div><div className="text-2xl font-bold mt-1">{fmtNaira(totalPaid)}</div></Card>
      </div>

      <Card className="p-4">
        <h2 className="font-semibold mb-3 flex items-center gap-2"><Briefcase className="w-4 h-4" /> Jobs</h2>
        {jobs.length === 0 ? (
          <div className="text-sm text-muted-foreground">No jobs posted yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground border-b">
                <tr>
                  <th className="py-2 pr-4">Title</th>
                  <th className="py-2 pr-4">Location</th>
                  <th className="py-2 pr-4">Type</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Apps</th>
                  <th className="py-2 pr-4">Posted</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map(j => (
                  <tr key={j.id} className="border-b last:border-0">
                    <td className="py-2 pr-4 font-medium">{j.title}{j.is_featured && <Badge className="ml-2" variant="secondary">Featured</Badge>}</td>
                    <td className="py-2 pr-4">{j.location || "—"}</td>
                    <td className="py-2 pr-4">{[j.work_type, j.employment_type].filter(Boolean).join(" • ") || "—"}</td>
                    <td className="py-2 pr-4"><Badge variant={j.status === "active" ? "default" : "secondary"}>{j.status}</Badge></td>
                    <td className="py-2 pr-4">{j.applications_count || 0}</td>
                    <td className="py-2 pr-4 text-muted-foreground text-xs whitespace-nowrap">{new Date(j.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="p-4">
        <h2 className="font-semibold mb-3 flex items-center gap-2"><CreditCard className="w-4 h-4" /> Payments</h2>
        {pays.length === 0 ? (
          <div className="text-sm text-muted-foreground">No payments yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground border-b">
                <tr>
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Purpose</th>
                  <th className="py-2 pr-4">Amount</th>
                  <th className="py-2 pr-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {pays.map(p => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="py-2 pr-4 text-xs whitespace-nowrap">{new Date(p.created_at).toLocaleDateString()}</td>
                    <td className="py-2 pr-4">{p.purpose || "—"}</td>
                    <td className="py-2 pr-4 font-medium">{fmtNaira(p.amount_kobo)}</td>
                    <td className="py-2 pr-4"><Badge variant={p.status === "success" ? "default" : "secondary"}>{p.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
