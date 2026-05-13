import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initRememberMeBridge } from "@/lib/remember-session";

// Honor the "Remember me" preference on every page load.
// Must run before App mounts so it can hydrate or strip the auth token
// before any auth-dependent code reads the session.
initRememberMeBridge();

// ---------------------------------------------------------------------------
// Cache-bust safety net for stale deploys.
// After a Publish → Update, a user's browser/CDN may still hold the old
// index.html that references JS chunks which no longer exist on the server.
// When that happens the dynamic import throws and the page renders blank.
// We detect that specific failure and force a hard reload with a cache-bust
// query param, so the user instantly gets the new build instead of a blank screen.
// ---------------------------------------------------------------------------
const RELOAD_FLAG = "__rwh_chunk_reload__";
const isChunkLoadError = (msg: unknown) => {
  if (typeof msg !== "string") return false;
  return (
    msg.includes("Failed to fetch dynamically imported module") ||
    msg.includes("Importing a module script failed") ||
    msg.includes("error loading dynamically imported module") ||
    /Loading chunk \S+ failed/i.test(msg) ||
    /Loading CSS chunk \S+ failed/i.test(msg)
  );
};
const forceFreshReload = () => {
  // Avoid infinite reload loops: only auto-reload once per session.
  if (sessionStorage.getItem(RELOAD_FLAG)) return;
  sessionStorage.setItem(RELOAD_FLAG, "1");
  const url = new URL(window.location.href);
  url.searchParams.set("v", Date.now().toString());
  window.location.replace(url.toString());
};
window.addEventListener("error", (event) => {
  if (isChunkLoadError(event.message) || isChunkLoadError((event.error as Error)?.message)) {
    forceFreshReload();
  }
});
window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason;
  const msg = typeof reason === "string" ? reason : reason?.message;
  if (isChunkLoadError(msg)) forceFreshReload();
});
// Clear the reload flag once the app has successfully booted.
window.addEventListener("load", () => {
  setTimeout(() => sessionStorage.removeItem(RELOAD_FLAG), 5000);
});

createRoot(document.getElementById("root")!).render(<App />);
