// Background service worker — handles auth storage, edge-function calls, and
// messaging between the popup, content script, and side panel.

importScripts("config.js");

const { SUPABASE_URL, SUPABASE_ANON_KEY } = self.RW_CONFIG;

// ---------- Storage helpers ----------
async function getSession() {
  const { rw_session } = await chrome.storage.local.get("rw_session");
  return rw_session ?? null;
}
async function setSession(session) {
  await chrome.storage.local.set({ rw_session: session });
}
async function clearSession() {
  await chrome.storage.local.remove("rw_session");
}

// ---------- Token refresh ----------
async function refreshIfNeeded(session) {
  if (!session) return null;
  const now = Math.floor(Date.now() / 1000);
  // Refresh 60s before expiry
  if (session.expires_at && session.expires_at - now > 60) return session;
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ refresh_token: session.refresh_token }),
    });
    if (!res.ok) {
      await clearSession();
      return null;
    }
    const data = await res.json();
    const next = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_at ?? Math.floor(Date.now() / 1000) + (data.expires_in ?? 3600),
      user: data.user ?? session.user,
    };
    await setSession(next);
    return next;
  } catch {
    return null;
  }
}

// ---------- Edge function caller ----------
async function callEdge(name, body) {
  let session = await getSession();
  session = await refreshIfNeeded(session);
  if (!session?.access_token) throw new Error("not_signed_in");
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(body ?? {}),
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  if (!res.ok) throw new Error(json?.error ?? `edge_${res.status}`);
  return json;
}

// ---------- Message router ----------
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    try {
      switch (msg?.type) {
        case "RW_GET_SESSION": {
          const s = await refreshIfNeeded(await getSession());
          sendResponse({ session: s });
          break;
        }
        case "RW_SET_SESSION": {
          await setSession(msg.session);
          sendResponse({ ok: true });
          break;
        }
        case "RW_SIGN_OUT": {
          await clearSession();
          sendResponse({ ok: true });
          break;
        }
        case "RW_TAILOR": {
          const data = await callEdge("tailor-external", msg.payload);
          sendResponse({ data });
          break;
        }
        case "RW_LOG_APPLICATION": {
          const data = await callEdge("log-external-application", msg.payload);
          // Notify the user
          chrome.notifications?.create({
            type: "basic",
            iconUrl: "icon.png",
            title: data.already_existed ? "Application updated" : "Application logged",
            message: `${msg.payload?.job_title ?? "Job"} at ${msg.payload?.company ?? ""} added to your tracker.`,
          });
          sendResponse({ data });
          break;
        }
        default:
          sendResponse({ error: "unknown_type" });
      }
    } catch (e) {
      console.error("RW background error", msg?.type, e);
      sendResponse({ error: e?.message ?? String(e) });
    }
  })();
  return true; // keep the message channel open for async sendResponse
});
