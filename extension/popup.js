const { APP_URL, CONNECT_PATH } = self.RW_CONFIG;

const $ = (id) => document.getElementById(id);
const statusEl = $("rw-status");
const signedOut = $("rw-signed-out");
const signedIn = $("rw-signed-in");

async function refreshUI() {
  const { session } = await chrome.runtime.sendMessage({ type: "RW_GET_SESSION" });
  if (session?.user) {
    statusEl.textContent = session.user.email ?? "Signed in";
    signedOut.hidden = true;
    signedIn.hidden = false;
  } else {
    statusEl.textContent = "Not signed in";
    signedOut.hidden = false;
    signedIn.hidden = true;
  }
  $("rw-tracker").href = `${APP_URL}/applications`;
}

$("rw-signin").addEventListener("click", () => {
  chrome.tabs.create({ url: `${APP_URL}${CONNECT_PATH}` });
  window.close();
});

$("rw-signout").addEventListener("click", async () => {
  await chrome.runtime.sendMessage({ type: "RW_SIGN_OUT" });
  refreshUI();
});

$("rw-tailor").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  await chrome.tabs.sendMessage(tab.id, { type: "RW_OPEN_PANEL" });
  window.close();
});

$("rw-log").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  await chrome.tabs.sendMessage(tab.id, { type: "RW_LOG_FROM_PAGE" });
  window.close();
});

refreshUI();
