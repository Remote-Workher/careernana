import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type State =
  | { kind: "loading" }
  | { kind: "ready" }
  | { kind: "already" }
  | { kind: "invalid" }
  | { kind: "submitting" }
  | { kind: "done" }
  | { kind: "error"; message: string };

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    document.title = "Unsubscribe — Remote Workher";
    if (!token) {
      setState({ kind: "invalid" });
      return;
    }
    (async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          { headers: { apikey: SUPABASE_ANON } },
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) { setState({ kind: "invalid" }); return; }
        if (data.valid) setState({ kind: "ready" });
        else if (data.reason === "already_unsubscribed") setState({ kind: "already" });
        else setState({ kind: "invalid" });
      } catch (e: any) {
        setState({ kind: "error", message: e?.message ?? "Network error" });
      }
    })();
  }, [token]);

  const confirm = async () => {
    if (!token) return;
    setState({ kind: "submitting" });
    const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", {
      body: { token },
    });
    if (error) { setState({ kind: "error", message: error.message }); return; }
    if ((data as any)?.success) setState({ kind: "done" });
    else if ((data as any)?.reason === "already_unsubscribed") setState({ kind: "already" });
    else setState({ kind: "error", message: "Unable to process request" });
  };

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl p-8 shadow-sm">
        <h1 className="text-3xl font-serif text-foreground mb-3">
          Email preferences
        </h1>

        {state.kind === "loading" && (
          <p className="text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Checking your link…
          </p>
        )}

        {state.kind === "invalid" && (
          <div className="flex items-start gap-3 text-sm">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-foreground">
              This unsubscribe link is invalid or expired. If you keep getting
              emails you don't want, reply to one and we'll handle it.
            </p>
          </div>
        )}

        {state.kind === "already" && (
          <div className="flex items-start gap-3 text-sm">
            <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <p className="text-foreground">
              You've already unsubscribed. You won't receive any more emails
              from Remote Workher.
            </p>
          </div>
        )}

        {state.kind === "ready" && (
          <>
            <p className="text-foreground mb-6 leading-relaxed">
              Click below to stop receiving emails from Remote Workher. You can
              still log in and use your dashboard normally.
            </p>
            <Button onClick={confirm} className="rounded-full px-6">
              Confirm unsubscribe
            </Button>
          </>
        )}

        {state.kind === "submitting" && (
          <p className="text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Updating your preferences…
          </p>
        )}

        {state.kind === "done" && (
          <div className="flex items-start gap-3 text-sm">
            <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <p className="text-foreground">
              You've been unsubscribed. We won't send you more emails. Sorry to
              see you go — you can resubscribe anytime by emailing us.
            </p>
          </div>
        )}

        {state.kind === "error" && (
          <div className="flex items-start gap-3 text-sm">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-foreground">{state.message}</p>
          </div>
        )}
      </div>
    </main>
  );
}
