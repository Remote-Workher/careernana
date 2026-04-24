// Global controller for the signup modal so any caller (including
// requireSignedIn) can trigger it without prop drilling.

type Listener = (toolName?: string) => void;
const listeners = new Set<Listener>();

export function openSignupModal(toolName?: string) {
  listeners.forEach((l) => l(toolName));
}

export function subscribeSignupModal(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
