// Global controller for the "Buy more coins" modal so any page (Profile,
// AI Tools, Apply, etc.) can launch the in-app Paystack coin purchase flow
// without navigating away.

type Listener = () => void;
const listeners = new Set<Listener>();

export function openCoinsModal() {
  listeners.forEach((l) => l());
}

export function subscribeCoinsModal(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
