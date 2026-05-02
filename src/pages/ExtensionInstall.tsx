import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Download,
  Chrome,
  CheckCircle2,
  Sparkles,
  ListChecks,
  Bell,
  Copy,
  ExternalLink,
  ArrowRight,
  ArrowLeft,
  FolderOpen,
  ToggleRight,
  PlugZap,
  PartyPopper,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const EXTENSION_ID_HINT = "remote-workher-extension.zip";
const STORAGE_KEY = "rw-extension-setup-progress";

type StepId = "download" | "unzip" | "open-chrome" | "dev-mode" | "load-unpacked" | "connect";

const STEPS: { id: StepId; title: string; subtitle: string; icon: any }[] = [
  { id: "download", title: "Download the extension", subtitle: "Grab the .zip package", icon: Download },
  { id: "unzip", title: "Unzip the file", subtitle: "Extract it somewhere you'll remember", icon: FolderOpen },
  { id: "open-chrome", title: "Open Chrome extensions", subtitle: "Visit chrome://extensions", icon: Chrome },
  { id: "dev-mode", title: "Turn on Developer mode", subtitle: "Toggle in the top-right corner", icon: ToggleRight },
  { id: "load-unpacked", title: "Load unpacked", subtitle: "Select the unzipped folder", icon: FolderOpen },
  { id: "connect", title: "Connect your account", subtitle: "Sign in inside the extension", icon: PlugZap },
];

export default function ExtensionPage() {
  const [params] = useSearchParams();
  const isConnect = params.get("connect") !== null || window.location.pathname.endsWith("/connect");
  const [bridging, setBridging] = useState(false);
  const [bridgeOk, setBridgeOk] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  // Auth bridge for /extension/connect
  useEffect(() => {
    if (!isConnect || !user) return;
    (async () => {
      setBridging(true);
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!session) return;
      window.postMessage(
        {
          type: "RW_SET_SESSION_FROM_PAGE",
          session: {
            access_token: session.access_token,
            refresh_token: session.refresh_token,
            expires_at: session.expires_at,
            user: { id: session.user.id, email: session.user.email },
          },
        },
        "*",
      );
      (window as any).__RW_SESSION__ = session;
      setBridgeOk(true);
      setBridging(false);
      toast.success("Extension connected — you can close this tab.");
    })();
  }, [isConnect, user]);

  if (isConnect) {
    return (
      <div className="max-w-md mx-auto py-16 text-center px-4">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary inline-flex items-center justify-center mb-4">
          <Chrome className="w-7 h-7" />
        </div>
        <h1 className="headline text-[24px] text-foreground mb-2">
          {bridgeOk ? "Connected!" : bridging ? "Connecting…" : user ? "Connecting…" : "Sign in to connect"}
        </h1>
        <p className="text-[13px] text-muted-foreground">
          {user
            ? "We're handing your session to the Remote Workher Chrome extension. You can close this tab."
            : "Sign in to your account first, then return here."}
        </p>
      </div>
    );
  }

  return <SetupWizard />;
}

function SetupWizard() {
  const [completed, setCompleted] = useState<Set<StepId>>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [active, setActive] = useState<StepId>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const done: StepId[] = raw ? JSON.parse(raw) : [];
      const next = STEPS.find((s) => !done.includes(s.id));
      return next?.id ?? "download";
    } catch {
      return "download";
    }
  });

  const persist = (next: Set<StepId>) => {
    setCompleted(new Set(next));
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(next)));
    } catch {
      /* noop */
    }
  };

  const markDone = (id: StepId) => {
    const next = new Set(completed);
    next.add(id);
    persist(next);
    const idx = STEPS.findIndex((s) => s.id === id);
    if (idx >= 0 && idx < STEPS.length - 1) setActive(STEPS[idx + 1].id);
  };

  const reset = () => {
    persist(new Set());
    setActive("download");
    toast.message("Walkthrough reset");
  };

  const progress = useMemo(() => Math.round((completed.size / STEPS.length) * 100), [completed]);
  const allDone = completed.size === STEPS.length;

  return (
    <div className="max-w-3xl mx-auto py-8 sm:py-10 px-4">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary inline-flex items-center justify-center mb-4">
          <Chrome className="w-7 h-7" />
        </div>
        <h1 className="headline text-[26px] sm:text-[32px] text-foreground">
          Set up the Chrome extension
        </h1>
        <p className="text-[13.5px] text-muted-foreground mt-2 max-w-xl mx-auto leading-relaxed">
          Six quick steps. We'll walk you through it — just check each one off as you go.
        </p>
      </div>

      {/* Quick benefits */}
      <div className="grid sm:grid-cols-3 gap-3 mb-6">
        <Feature icon={<Sparkles className="w-4 h-4" />} title="AI Apply" body="Tailored resume + cover letter from any JD." />
        <Feature icon={<ListChecks className="w-4 h-4" />} title="Auto-track" body="Logs every Apply click to your tracker." />
        <Feature icon={<Bell className="w-4 h-4" />} title="Universal" body="LinkedIn, Indeed, Greenhouse, Lever & more." />
      </div>

      {/* Progress bar */}
      <div className="bg-card border border-border rounded-2xl p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[12px] font-bold text-foreground">
            {completed.size} of {STEPS.length} steps complete
          </p>
          <p className="text-[11px] text-muted-foreground">{progress}%</p>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary transition-[width] duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        {allDone && (
          <button
            onClick={reset}
            className="mt-3 text-[11px] font-bold text-muted-foreground hover:text-foreground"
          >
            Reset walkthrough
          </button>
        )}
      </div>

      {/* Steps */}
      <div className="space-y-2.5">
        {STEPS.map((s, i) => (
          <StepCard
            key={s.id}
            index={i + 1}
            step={s}
            isActive={active === s.id}
            isDone={completed.has(s.id)}
            onOpen={() => setActive(s.id)}
            onComplete={() => markDone(s.id)}
            onPrev={() => i > 0 && setActive(STEPS[i - 1].id)}
            canPrev={i > 0}
          />
        ))}
      </div>

      {/* Final celebration */}
      {allDone && (
        <div className="mt-6 rounded-2xl border border-success/30 bg-success/5 p-5 text-center">
          <PartyPopper className="w-7 h-7 text-success mx-auto mb-2" />
          <p className="text-[15px] font-bold text-foreground">You're all set!</p>
          <p className="text-[12.5px] text-muted-foreground mt-1">
            Open a job posting and pin the Remote Workher extension to start applying smarter.
          </p>
        </div>
      )}

      <p className="mt-6 text-[12px] text-muted-foreground text-center">
        Works in all Chromium browsers (Chrome, Edge, Brave, Arc, Opera). AI tailoring costs 5 coins per job; logging is free.
      </p>
    </div>
  );
}

function StepCard({
  index,
  step,
  isActive,
  isDone,
  onOpen,
  onComplete,
  onPrev,
  canPrev,
}: {
  index: number;
  step: { id: StepId; title: string; subtitle: string; icon: any };
  isActive: boolean;
  isDone: boolean;
  onOpen: () => void;
  onComplete: () => void;
  onPrev: () => void;
  canPrev: boolean;
}) {
  const Icon = step.icon;
  return (
    <div
      className={cn(
        "rounded-2xl border bg-card transition-all overflow-hidden",
        isActive ? "border-primary shadow-sm" : "border-border",
        isDone && !isActive && "opacity-80",
      )}
    >
      <button
        onClick={onOpen}
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        <div
          className={cn(
            "w-9 h-9 rounded-xl inline-flex items-center justify-center shrink-0 text-[12.5px] font-extrabold",
            isDone
              ? "bg-success/15 text-success"
              : isActive
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground",
          )}
        >
          {isDone ? <CheckCircle2 className="w-4.5 h-4.5" /> : index}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-bold text-foreground flex items-center gap-1.5">
            <Icon className="w-3.5 h-3.5 text-muted-foreground" />
            {step.title}
          </p>
          <p className="text-[11.5px] text-muted-foreground truncate">{step.subtitle}</p>
        </div>
        {isDone && (
          <span className="text-[10.5px] font-bold text-success bg-success/10 px-2 py-0.5 rounded-full">
            Done
          </span>
        )}
      </button>

      {isActive && (
        <div className="px-4 pb-4 pt-1 border-t border-border">
          <StepBody id={step.id} />
          <div className="flex items-center justify-between gap-2 mt-4">
            <button
              onClick={onPrev}
              disabled={!canPrev}
              className="inline-flex items-center gap-1 text-[12px] font-bold text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
            <button
              onClick={onComplete}
              className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground px-4 h-9 rounded-xl text-[12.5px] font-bold hover:bg-primary-dark"
            >
              {isDone ? "Next" : "Mark done & continue"} <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StepBody({ id }: { id: StepId }) {
  switch (id) {
    case "download":
      return <DownloadBody />;
    case "unzip":
      return (
        <Body>
          <p>
            Find the file you just downloaded (usually in <Code>Downloads/</Code>) and unzip it.
          </p>
          <ul className="list-disc pl-5 text-[12.5px] text-muted-foreground space-y-1">
            <li><b>Mac</b>: double-click <Code>{EXTENSION_ID_HINT}</Code></li>
            <li><b>Windows</b>: right-click → <i>Extract All…</i></li>
          </ul>
          <Tip>
            Keep the unzipped folder somewhere permanent — Chrome loads it from disk every time you open the browser.
          </Tip>
        </Body>
      );
    case "open-chrome":
      return (
        <Body>
          <p>Paste this URL into your Chrome address bar (or click the button to copy it):</p>
          <CopyRow value="chrome://extensions" />
          <Tip>
            Chrome doesn't allow opening <Code>chrome://</Code> links from web pages — you have to paste it manually. It's a security thing.
          </Tip>
        </Body>
      );
    case "dev-mode":
      return (
        <Body>
          <p>
            On the <Code>chrome://extensions</Code> page, look at the <b>top-right corner</b> and toggle{" "}
            <b>Developer mode</b> ON.
          </p>
          <div className="rounded-xl bg-muted/50 border border-border p-3 flex items-center justify-between">
            <span className="text-[12px] text-muted-foreground">Developer mode</span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-primary">
              <ToggleRight className="w-4 h-4" /> ON
            </span>
          </div>
          <Tip>Three new buttons will appear: <b>Load unpacked</b>, <b>Pack extension</b>, and <b>Update</b>.</Tip>
        </Body>
      );
    case "load-unpacked":
      return (
        <Body>
          <p>
            Click <b>Load unpacked</b>, then select the folder you unzipped in step 2.
          </p>
          <Tip>
            Pick the folder itself (the one containing <Code>manifest.json</Code>) — not the zip file, and not a sub-folder.
          </Tip>
          <p className="text-[12.5px] text-muted-foreground">
            You should see <b>Remote Workher</b> appear in your extensions list. Pin it from the puzzle-piece icon for easy access.
          </p>
        </Body>
      );
    case "connect":
      return (
        <Body>
          <p>
            Open the Remote Workher extension and click <b>Sign in</b>. It opens a tab on{" "}
            <Code>/extension/connect</Code> that hands your session to the extension.
          </p>
          <a
            href="/extension/connect"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-primary hover:underline"
          >
            Open the connect page now <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <Tip>
            Once connected, visit any job page (LinkedIn, Indeed, Greenhouse, Lever, Workday…) and click the extension icon to start tailoring.
          </Tip>
        </Body>
      );
  }
}

function DownloadBody() {
  const [downloaded, setDownloaded] = useState(false);
  const handleDownload = async () => {
    try {
      const res = await fetch(`/${EXTENSION_ID_HINT}`);
      if (!res.ok) throw new Error(`Download failed: ${res.status}`);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = EXTENSION_ID_HINT;
      a.click();
      URL.revokeObjectURL(a.href);
      setDownloaded(true);
      toast.success("Extension downloaded");
    } catch (e: any) {
      toast.error(e.message || "Could not download");
    }
  };
  return (
    <Body>
      <p>Grab the latest extension package. It's a .zip file you'll unzip in the next step.</p>
      <button
        onClick={handleDownload}
        className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 h-10 rounded-xl text-[13px] font-bold hover:bg-primary-dark"
      >
        <Download className="w-4 h-4" />
        {downloaded ? "Download again" : "Download extension (.zip)"}
      </button>
      {downloaded && (
        <p className="text-[11.5px] text-success font-bold inline-flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5" /> Saved to your Downloads folder
        </p>
      )}
    </Body>
  );
}

function Body({ children }: { children: React.ReactNode }) {
  return <div className="space-y-3 text-[13px] text-foreground/85 leading-relaxed">{children}</div>;
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="px-1.5 py-0.5 rounded bg-muted text-[12px] font-mono">{children}</code>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-primary-tint/50 border border-primary/15 px-3 py-2 text-[12px] text-foreground/80">
      💡 {children}
    </div>
  );
}

function CopyRow({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success("Copied");
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2">
      <code className="text-[12.5px] font-mono text-foreground truncate">{value}</code>
      <button
        onClick={copy}
        className="inline-flex items-center gap-1 text-[11.5px] font-bold text-primary hover:underline shrink-0"
      >
        {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <div className="w-8 h-8 rounded-lg bg-primary-tint text-primary inline-flex items-center justify-center mb-2">{icon}</div>
      <p className="text-[13.5px] font-bold text-foreground">{title}</p>
      <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">{body}</p>
    </div>
  );
}
