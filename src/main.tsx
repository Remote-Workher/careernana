import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initRememberMeBridge } from "@/lib/remember-session";

// Honor the "Remember me" preference on every page load.
// Must run before App mounts so it can hydrate or strip the auth token
// before any auth-dependent code reads the session.
initRememberMeBridge();

createRoot(document.getElementById("root")!).render(<App />);
