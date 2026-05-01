import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ArrowLeft,
  Upload,
  FileText,
  Link as LinkIcon,
  Target,
  Sparkles,
  Loader2,
  X,
  Check,
  Camera,
  Briefcase,
  History,
  Wand2,
  Plus,
  ArrowRight,
  DollarSign,
} from "lucide-react";

const ROLE_SUGGESTIONS = [
  "Product Manager",
  "Product Designer",
  "Frontend Engineer",
  "Backend Engineer",
  "Data Analyst",
  "Customer Success Manager",
  "Marketing Manager",
  "Content Writer",
  "Project Manager",
  "Operations Manager",
  "HR / People Ops",
  "Sales Development Rep",
];

const SKILL_SUGGESTIONS = [
  "Figma",
  "React",
  "TypeScript",
  "Python",
  "SQL",
  "Notion",
  "Excel",
  "Google Analytics",
  "Copywriting",
  "Project Management",
  "Stakeholder Management",
  "Customer Support",
];

export default function ProfileSetup() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [userId, setUserId] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
  const [resumeFileName, setResumeFileName] = useState<string | null>(null);
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [targetRoles, setTargetRoles] = useState<string[]>([]);
  const [roleInput, setRoleInput] = useState("");
  const [careerGoal, setCareerGoal] = useState("");
  const [appCount, setAppCount] = useState(0);
  const [bragCount, setBragCount] = useState(0);
  const [fullName, setFullName] = useState<string>("");
  const [recentApps, setRecentApps] = useState<any[]>([]);
  const [recentBrags, setRecentBrags] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/");
        return;
      }
      setUserId(user.id);

      const { data } = await supabase
        .from("profiles")
        .select(
          "resume_url, resume_file_name, portfolio_url, skills, target_roles, career_goal, avatar_url, full_name",
        )
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setResumeUrl(data.resume_url);
        setResumeFileName(data.resume_file_name);
        setPortfolioUrl(data.portfolio_url ?? "");
        setSkills(data.skills ?? []);
        setTargetRoles(data.target_roles ?? []);
        setCareerGoal(data.career_goal ?? "");
        setAvatarUrl((data as any).avatar_url ?? null);
        setFullName(data.full_name ?? "");
      }

      const [{ count: ac }, { count: bc }, { data: appsRows }, { data: bragRows }] = await Promise.all([
        supabase.from("applications").select("id", { count: "exact", head: true }).eq("user_id", user.id).neq("status", "saved"),
        supabase.from("brag_entries").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("applications").select("id, company, role, status, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(6),
        supabase.from("brag_entries").select("id, title, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(6),
      ]);
      setAppCount(ac ?? 0);
      setBragCount(bc ?? 0);
      setRecentApps(appsRows ?? []);
      setRecentBrags(bragRows ?? []);

      setLoading(false);
    })();
  }, [navigate]);

  const handleAvatarUpload = async (file: File) => {
    if (!userId) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Photo must be under 5MB");
      return;
    }
    setUploadingAvatar(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${userId}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, cacheControl: "3600" });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = pub.publicUrl;
      const { error: dbErr } = await supabase
        .from("profiles")
        .update({ avatar_url: url })
        .eq("user_id", userId);
      if (dbErr) throw dbErr;
      setAvatarUrl(url);
      toast.success("Profile photo updated");
    } catch (e: any) {
      toast.error(e.message || "Could not upload photo");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleResumeUpload = async (file: File) => {
    if (!userId) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Resume must be under 10MB");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "pdf";
      const path = `${userId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("resumes")
        .upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: signed } = await supabase.storage
        .from("resumes")
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      setResumeUrl(signed?.signedUrl ?? path);
      setResumeFileName(file.name);
      toast.success("Resume uploaded");
    } catch (e: any) {
      toast.error(e.message || "Could not upload resume");
    } finally {
      setUploading(false);
    }
  };

  const addItem = (raw: string, list: string[], setList: (v: string[]) => void) => {
    const v = raw.trim();
    if (!v) return;
    if (list.find((x) => x.toLowerCase() === v.toLowerCase())) return;
    setList([...list, v]);
  };
  const removeItem = (v: string, list: string[], setList: (v: string[]) => void) => {
    setList(list.filter((x) => x !== v));
  };

  const isComplete =
    !!resumeUrl &&
    targetRoles.length > 0 &&
    skills.length > 0 &&
    careerGoal.trim().length > 0;

  const handleSave = async (markComplete = false) => {
    if (!userId) return;
    if (markComplete && !isComplete) {
      toast.error("Add a resume, at least 1 target role, 1 skill, and your goal.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          resume_url: resumeUrl,
          resume_file_name: resumeFileName,
          portfolio_url: portfolioUrl || null,
          skills,
          target_roles: targetRoles,
          career_goal: careerGoal || null,
          profile_setup_completed: markComplete ? true : undefined,
        })
        .eq("user_id", userId);
      if (error) throw error;
      toast.success(markComplete ? "Profile setup complete!" : "Saved");
      if (markComplete) navigate("/jobs");
    } catch (e: any) {
      toast.error(e.message || "Could not save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1280px] mx-auto animate-fade-in">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="mb-6">
        <p className="eyebrow mb-2">Profile setup</p>
        <h1 className="headline text-[26px] sm:text-[32px] text-foreground leading-tight">
          Tell us what you're after
        </h1>
        <p className="text-[13px] sm:text-[14px] text-muted-foreground mt-2 max-w-[560px]">
          We'll use this to surface jobs that fit you and to power your <em>Apply with AI</em>.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-6">
        <div className="min-w-0">

      {/* Avatar + history snapshot */}
      <div className="mb-5 p-4 sm:p-5 rounded-2xl border border-border bg-card flex items-center gap-4 sm:gap-5">
        <label className="relative shrink-0 cursor-pointer group">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden bg-primary-tint border-2 border-border flex items-center justify-center">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span className="text-primary text-xl font-bold">
                {(fullName || "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
              </span>
            )}
          </div>
          <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            {uploadingAvatar ? (
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            ) : (
              <Camera className="w-5 h-5 text-white" />
            )}
          </div>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleAvatarUpload(e.target.files[0])}
          />
        </label>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold truncate">{fullName || "Your profile"}</div>
          <div className="text-[12px] text-muted-foreground mb-2">Click photo to change</div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => navigate("/applications")}
              className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold px-2.5 py-1 rounded-full bg-primary-tint text-primary hover:bg-primary/15 transition-colors"
            >
              <Briefcase className="w-3 h-3" /> {appCount} application{appCount === 1 ? "" : "s"}
            </button>
            <button
              onClick={() => navigate("/brag-file")}
              className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold px-2.5 py-1 rounded-full bg-muted text-foreground hover:bg-muted/70 transition-colors"
            >
              <History className="w-3 h-3" /> {bragCount} brag{bragCount === 1 ? "" : "s"} logged
            </button>
          </div>
        </div>
      </div>

      {/* Resume */}
      <Section
        icon={<FileText className="w-4 h-4" />}
        title="Upload your resume"
        subtitle="PDF or DOCX, up to 10MB"
      >
        {resumeUrl ? (
          <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-border bg-card">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-primary-tint text-primary flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[13px] font-semibold truncate">{resumeFileName || "Resume"}</div>
                <a href={resumeUrl} target="_blank" rel="noreferrer" className="text-[11.5px] text-primary hover:underline">
                  View
                </a>
              </div>
            </div>
            <label className="text-[12px] font-semibold text-primary cursor-pointer hover:underline">
              Replace
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleResumeUpload(e.target.files[0])}
              />
            </label>
          </div>
        ) : (
          <label className="block border-[1.5px] border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary hover:bg-primary-tint/30 transition-colors">
            <Upload className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
            <div className="text-[13px] font-semibold text-foreground">
              {uploading ? "Uploading…" : "Click to upload"}
            </div>
            <div className="text-[11.5px] text-muted-foreground mt-1">PDF or DOCX</div>
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleResumeUpload(e.target.files[0])}
            />
          </label>
        )}
      </Section>

      {/* Portfolio */}
      <Section
        icon={<LinkIcon className="w-4 h-4" />}
        title="Portfolio or website"
        subtitle="Optional — your Behance, Notion, GitHub, personal site, etc."
      >
        <input
          value={portfolioUrl}
          onChange={(e) => setPortfolioUrl(e.target.value)}
          placeholder="https://"
          className="w-full px-4 py-3 text-[13.5px] rounded-[12px] border border-border bg-background focus:border-primary focus:outline-none"
        />
      </Section>

      {/* Target Roles */}
      <Section
        icon={<Target className="w-4 h-4" />}
        title="What roles are you targeting?"
        subtitle="We'll rank jobs by how well they match these"
      >
        <ChipInput
          items={targetRoles}
          input={roleInput}
          setInput={setRoleInput}
          onAdd={(v) => addItem(v, targetRoles, setTargetRoles)}
          onRemove={(v) => removeItem(v, targetRoles, setTargetRoles)}
          placeholder="e.g. Product Manager"
          suggestions={ROLE_SUGGESTIONS.filter((s) => !targetRoles.includes(s))}
        />
      </Section>

      {/* Skills */}
      <Section
        icon={<Sparkles className="w-4 h-4" />}
        title="Your top skills"
        subtitle="Tools, soft skills, anything you'd put on a resume"
      >
        <ChipInput
          items={skills}
          input={skillInput}
          setInput={setSkillInput}
          onAdd={(v) => addItem(v, skills, setSkills)}
          onRemove={(v) => removeItem(v, skills, setSkills)}
          placeholder="e.g. Figma"
          suggestions={SKILL_SUGGESTIONS.filter((s) => !skills.includes(s))}
        />
      </Section>

      {/* Goal */}
      <Section
        icon={<Target className="w-4 h-4" />}
        title="What's your career goal right now?"
        subtitle="One or two sentences — keep it real"
      >
        <textarea
          value={careerGoal}
          onChange={(e) => setCareerGoal(e.target.value)}
          rows={3}
          placeholder="e.g. Move from in-house design to a senior remote PM role at a global startup within 6 months."
          className="w-full px-4 py-3 text-[13.5px] rounded-[12px] border border-border bg-background focus:border-primary focus:outline-none resize-none"
        />
      </Section>

      {/* Sticky footer */}
      <div className="sticky bottom-0 left-0 right-0 -mx-4 md:-mx-6 lg:-mx-8 bg-background/90 backdrop-blur border-t border-border mt-6 px-4 md:px-6 lg:px-8 py-3 flex items-center justify-between gap-3 z-10">
        <div className="text-[12px] text-muted-foreground">
          {isComplete ? (
            <span className="inline-flex items-center gap-1 text-success font-semibold">
              <Check className="w-3.5 h-3.5" /> Ready to save
            </span>
          ) : (
            <>Add resume, target role, skill & goal to finish</>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSave(false)}
            disabled={saving}
            className="px-4 py-2 rounded-lg border border-border text-[12.5px] font-semibold text-foreground hover:border-primary disabled:opacity-50"
          >
            Save draft
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={saving || !isComplete}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-[12.5px] font-bold hover:bg-primary-dark disabled:opacity-50"
          >
            {saving ? "Saving…" : "Finish & start applying"}
          </button>
        </div>
      </div>
        </div>

        {/* History sidebar */}
        <aside className="space-y-4">
          <div className="bg-card border border-border rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[14px] font-bold text-foreground inline-flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-primary" /> Recent applications
              </h3>
              <button onClick={() => navigate("/applications")} className="text-[11.5px] font-semibold text-primary hover:underline">
                View all
              </button>
            </div>
            {recentApps.length === 0 ? (
              <p className="text-[12.5px] text-muted-foreground">You haven't tracked any applications yet.</p>
            ) : (
              <ul className="space-y-2">
                {recentApps.map((a) => (
                  <li key={a.id} className="flex items-start justify-between gap-2 p-2.5 rounded-lg hover:bg-muted transition-colors">
                    <div className="min-w-0">
                      <div className="text-[12.5px] font-semibold text-foreground truncate">{a.role || "Untitled"}</div>
                      <div className="text-[11px] text-muted-foreground truncate">{a.company || "—"}</div>
                    </div>
                    <span className="text-[10.5px] font-semibold uppercase tracking-wide text-primary bg-primary-tint px-2 py-0.5 rounded-full shrink-0">
                      {a.status || "saved"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-card border border-border rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[14px] font-bold text-foreground inline-flex items-center gap-2">
                <History className="w-4 h-4 text-primary" /> Recent brag entries
              </h3>
              <button onClick={() => navigate("/brag-file")} className="text-[11.5px] font-semibold text-primary hover:underline">
                View all
              </button>
            </div>
            {recentBrags.length === 0 ? (
              <p className="text-[12.5px] text-muted-foreground">No wins logged yet. Add your first one!</p>
            ) : (
              <ul className="space-y-2">
                {recentBrags.map((b) => (
                  <li key={b.id} className="p-2.5 rounded-lg hover:bg-muted transition-colors">
                    <div className="text-[12.5px] font-semibold text-foreground line-clamp-2">{b.title || "Untitled win"}</div>
                    <div className="text-[10.5px] text-muted-foreground mt-0.5">
                      {new Date(b.created_at).toLocaleDateString()}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function Section({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-5 bg-card border border-border rounded-2xl p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-7 h-7 rounded-lg bg-primary-tint text-primary flex items-center justify-center">
          {icon}
        </div>
        <h2 className="text-[14.5px] font-bold text-foreground">{title}</h2>
      </div>
      {subtitle && (
        <p className="text-[12px] text-muted-foreground mb-3 ml-9">{subtitle}</p>
      )}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function ChipInput({
  items,
  input,
  setInput,
  onAdd,
  onRemove,
  placeholder,
  suggestions,
}: {
  items: string[];
  input: string;
  setInput: (v: string) => void;
  onAdd: (v: string) => void;
  onRemove: (v: string) => void;
  placeholder?: string;
  suggestions?: string[];
}) {
  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2 min-h-[28px]">
        {items.map((it) => (
          <span
            key={it}
            className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full bg-primary-tint border border-primary-border text-primary text-[12px] font-semibold"
          >
            {it}
            <button onClick={() => onRemove(it)} className="hover:bg-primary/15 rounded-full p-0.5">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              onAdd(input);
              setInput("");
            }
          }}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 text-[13px] rounded-lg border border-border bg-background focus:border-primary focus:outline-none"
        />
        <button
          onClick={() => {
            onAdd(input);
            setInput("");
          }}
          className="px-3 py-2 rounded-lg bg-foreground text-background text-[12px] font-semibold"
        >
          Add
        </button>
      </div>
      {suggestions && suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {suggestions.slice(0, 8).map((s) => (
            <button
              key={s}
              onClick={() => onAdd(s)}
              className="text-[11.5px] px-2.5 py-1 rounded-full border border-border bg-card text-muted-foreground hover:border-primary hover:text-primary transition-colors"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
