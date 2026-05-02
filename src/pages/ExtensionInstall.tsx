import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Download, Chrome, CheckCircle2, Sparkles, ListChecks, Bell } from "lucide-react";
import { toast } from "sonner";

const EXTENSION_ID_HINT = "remote-workher-extension.zip";

export default function ExtensionPage() {
  const [params] = useSearchParams();
  const isConnect = params.get("connect") !== null || window.location.pathname.endsWith("/connect");
  const [bridging, setBridging] = useState(false);
  const [bridgeOk, setBridgeOk] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  // Auth bridge: when launched at /extension/connect, hand the session
  // to any installed extension via window.postMessage. The extension's
  // content script picks it up and forwards to the background worker.
  useEffect(() => {
    if (!isConnect || !user) return;
    (async () => {
      setBridging(true);
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!session) return;
      // Post a message that any RW content script on this page will catch.
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
      // Also store on a known global the content script polls.
      (window as any).__RW_SESSION__ = session;
      setBridgeOk(true);
      setBridging(false);
      toast.success("Extension connected — you can close this tab.");
    })();
  }, [isConnect, user]);

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
    } catch (e: any) {
      toast.error(e.message || "Could not download");
    }
  };

  if (isConnect) {
    return (
      <div className="max-w-md mx-auto py-16 text-center">
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

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <div className="text-center mb-10">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary inline-flex items-center justify-center mb-4">
          <Chrome className="w-7 h-7" />
        </div>
        <h1 className="headline text-[32px] text-foreground">Remote Workher Chrome extension</h1>
        <p className="text-[14px] text-muted-foreground mt-2 max-w-xl mx-auto leading-relaxed">
          Tailor your resume and cover letter on any job page with AI — and auto-track every job you apply to.
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-3 mb-8">
        <Feature icon={<Sparkles className="w-4 h-4" />} title="AI Apply" body="Side panel that drafts a tailored resume + cover letter from any JD." />
        <Feature icon={<ListChecks className="w-4 h-4" />} title="Auto-track" body="Detects when you click Apply and prompts to log it to your tracker." />
        <Feature icon={<Bell className="w-4 h-4" />} title="Universal" body="Works on LinkedIn, Indeed, Greenhouse, Lever, Workday and any career page." />
      </div>

      <div className="bg-card border border-border rounded-2xl p-6">
        <button
          onClick={handleDownload}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-5 h-11 rounded-xl text-[14px] font-bold hover:bg-primary-dark"
        >
          <Download className="w-4 h-4" /> Download extension (.zip)
        </button>

        <ol className="mt-6 space-y-3 text-[13.5px] text-foreground/85">
          <Step n={1}>Unzip the downloaded file.</Step>
          <Step n={2}>
            Open <code className="px-1.5 py-0.5 rounded bg-muted">chrome://extensions</code> in Chrome (or Edge / Brave / Arc).
          </Step>
          <Step n={3}>Toggle <b>Developer mode</b> on (top-right).</Step>
          <Step n={4}>Click <b>Load unpacked</b> and select the unzipped folder.</Step>
          <Step n={5}>
            Open the extension and click <b>Sign in</b> — it'll bring you back here to connect your account.
          </Step>
        </ol>

        <p className="mt-5 text-[12px] text-muted-foreground">
          Works in all Chromium browsers. AI tailoring costs 5 coins per job; logging is free.
        </p>
      </div>
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
function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="w-6 h-6 rounded-full bg-primary-tint text-primary text-[12px] font-bold inline-flex items-center justify-center shrink-0">{n}</span>
      <span className="leading-relaxed pt-0.5">{children}</span>
    </li>
  );
}
