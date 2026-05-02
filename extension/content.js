/* eslint-disable */
// Content script — runs on every page. Provides:
// 1. A floating "Tailor with AI" launcher button.
// 2. Auto-detection of likely application form submissions, with a confirm
//    toast before logging.
// 3. A side panel iframe for the AI Apply experience.

const RW = {
  panelOpen: false,
  panelEl: null,
  toastEl: null,
};

// ---------- Helpers: scrape job context ----------
function pickText(selectors) {
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el) {
      const t = (el.innerText || el.textContent || "").trim();
      if (t.length > 4) return t;
    }
  }
  return "";
}

function detectJobContext() {
  const url = location.href;
  const host = location.hostname.replace(/^www\./, "");

  // Title
  const title =
    pickText([
      "[data-testid='jobsearch-JobInfoHeader-title']", // Indeed
      "h1.top-card-layout__title", // LinkedIn public
      ".job-details-jobs-unified-top-card__job-title h1", // LinkedIn signed-in
      ".jobs-unified-top-card__job-title", // LinkedIn fallback
      "h1[class*='job-title']",
      "h1[class*='JobTitle']",
      "[class*='posting-headline'] h2", // Lever
      ".app-title", // Greenhouse
      "h1",
    ]) || document.title.split(/[-|–]/)[0].trim();

  // Company
  const company =
    pickText([
      "[data-testid='inlineHeader-companyName']", // Indeed
      ".topcard__org-name-link", // LinkedIn public
      ".job-details-jobs-unified-top-card__company-name a",
      ".job-details-jobs-unified-top-card__company-name",
      ".jobs-unified-top-card__company-name",
      "[class*='company-name']",
      "[class*='CompanyName']",
      ".company-name",
      ".main-header-text-wrapper .h2",
    ]) || host;

  // Location
  const location_ =
    pickText([
      "[data-testid='inlineHeader-companyLocation']",
      ".topcard__flavor--bullet",
      ".job-details-jobs-unified-top-card__primary-description-container span",
      "[class*='location']",
    ]) || "";

  // Description — biggest text block heuristic
  let description = pickText([
    "#jobDescriptionText", // Indeed
    ".description__text", // LinkedIn public
    ".jobs-description__content",
    ".jobs-description-content__text",
    "[data-qa='job-description']", // Workable
    "#content", // Greenhouse
    "[data-automation-id='jobPostingDescription']", // Workday
    "[class*='posting-page'] [class*='content']", // Lever
    "article",
    "main",
  ]);
  if (!description || description.length < 200) {
    // Fallback: grab the largest <section>/<div> on the page
    const candidates = Array.from(document.querySelectorAll("section, article, div"))
      .map((el) => ({ el, len: (el.innerText || "").length }))
      .filter((x) => x.len > 400 && x.len < 30000)
      .sort((a, b) => b.len - a.len);
    description = candidates[0]?.el.innerText?.trim() || description;
  }
  description = (description || "").slice(0, 8000);

  return { title, company, location: location_, description, source_url: url, source: host };
}

// ---------- Floating launcher ----------
function createLauncher() {
  if (document.getElementById("rw-launcher")) return;
  const btn = document.createElement("button");
  btn.id = "rw-launcher";
  btn.title = "Tailor this application with Remote Workher";
  btn.innerHTML = "✨";
  btn.addEventListener("click", openPanel);
  document.documentElement.appendChild(btn);
}

// ---------- Toast (confirm log) ----------
function showToast({ title, body, primaryLabel, onPrimary, secondaryLabel = "Dismiss" }) {
  removeToast();
  const wrap = document.createElement("div");
  wrap.id = "rw-toast";
  wrap.innerHTML = `
    <div class="rw-toast-card">
      <div class="rw-toast-head">
        <img src="${chrome.runtime.getURL("icon.png")}" width="22" height="22" alt="" />
        <strong>${title}</strong>
        <button class="rw-toast-x" aria-label="Close">×</button>
      </div>
      <p>${body}</p>
      <div class="rw-toast-actions">
        <button class="rw-toast-secondary">${secondaryLabel}</button>
        <button class="rw-toast-primary">${primaryLabel}</button>
      </div>
    </div>
  `;
  document.documentElement.appendChild(wrap);
  RW.toastEl = wrap;
  wrap.querySelector(".rw-toast-x").addEventListener("click", removeToast);
  wrap.querySelector(".rw-toast-secondary").addEventListener("click", removeToast);
  wrap.querySelector(".rw-toast-primary").addEventListener("click", () => {
    onPrimary?.();
    removeToast();
  });
  // Auto-hide after 20s
  setTimeout(removeToast, 20000);
}
function removeToast() {
  RW.toastEl?.remove();
  RW.toastEl = null;
}

// ---------- Side panel ----------
function openPanel() {
  if (RW.panelOpen) return;
  const iframe = document.createElement("iframe");
  iframe.id = "rw-panel";
  iframe.src = chrome.runtime.getURL("panel.html");
  document.documentElement.appendChild(iframe);
  RW.panelEl = iframe;
  RW.panelOpen = true;

  // Send context once the iframe is ready
  window.addEventListener("message", function handler(e) {
    if (e.data?.type === "RW_PANEL_READY") {
      const ctx = detectJobContext();
      iframe.contentWindow.postMessage({ type: "RW_PANEL_CONTEXT", ctx }, "*");
    }
    if (e.data?.type === "RW_PANEL_CLOSE") {
      closePanel();
      window.removeEventListener("message", handler);
    }
    if (e.data?.type === "RW_PANEL_LOG") {
      const ctx = detectJobContext();
      logApplication(ctx);
    }
  });
}
function closePanel() {
  RW.panelEl?.remove();
  RW.panelEl = null;
  RW.panelOpen = false;
}

// ---------- Log application ----------
async function logApplication(ctx) {
  const payload = {
    job_title: ctx.title,
    company: ctx.company,
    source_url: ctx.source_url,
    source: ctx.source,
    location: ctx.location,
    description: ctx.description,
  };
  try {
    const res = await chrome.runtime.sendMessage({ type: "RW_LOG_APPLICATION", payload });
    if (res?.error === "not_signed_in") {
      showToast({
        title: "Sign in to track",
        body: "Sign in to your Remote Workher account to log applications automatically.",
        primaryLabel: "Sign in",
        onPrimary: () => chrome.runtime.sendMessage({ type: "RW_OPEN_SIGNIN" }),
      });
    } else if (res?.error) {
      showToast({ title: "Couldn't log", body: res.error, primaryLabel: "OK", onPrimary: () => {} });
    }
  } catch (e) {
    console.warn("RW log failed", e);
  }
}

// ---------- Auto-detect submissions ----------
const APPLY_HINTS = [
  /apply now/i, /submit application/i, /submit my application/i,
  /send application/i, /apply for this job/i, /^apply$/i,
];

function looksLikeApplyButton(el) {
  if (!el) return false;
  const text = (el.innerText || el.value || el.getAttribute("aria-label") || "").trim();
  if (!text) return false;
  return APPLY_HINTS.some((rx) => rx.test(text));
}

function maybePromptLog(reason) {
  const ctx = detectJobContext();
  if (!ctx.title || ctx.title.length < 3) return;
  showToast({
    title: "Did you just apply?",
    body: `Log <b>${escapeHtml(ctx.title)}</b> at <b>${escapeHtml(ctx.company)}</b> in your Remote Workher tracker?`,
    primaryLabel: "Yes, log it",
    onPrimary: () => logApplication(ctx),
  });
}

function escapeHtml(s = "") {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// Click capture — works even on SPAs that don't submit a real form
document.addEventListener(
  "click",
  (e) => {
    const target = e.target.closest("button, a, input[type='submit'], [role='button']");
    if (looksLikeApplyButton(target)) {
      // Wait a beat for the action to complete, then prompt
      setTimeout(() => maybePromptLog("apply-click"), 1500);
    }
  },
  true,
);

// Form submit fallback
document.addEventListener(
  "submit",
  (e) => {
    const form = e.target;
    if (!(form instanceof HTMLFormElement)) return;
    const inner = form.innerText || "";
    if (/apply|application|cover letter|resume|cv/i.test(inner)) {
      setTimeout(() => maybePromptLog("form-submit"), 1500);
    }
  },
  true,
);

// ---------- Listen for popup commands ----------
chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === "RW_OPEN_PANEL") openPanel();
  if (msg?.type === "RW_LOG_FROM_PAGE") {
    const ctx = detectJobContext();
    showToast({
      title: "Log this job?",
      body: `<b>${escapeHtml(ctx.title)}</b> at <b>${escapeHtml(ctx.company)}</b>`,
      primaryLabel: "Log it",
      onPrimary: () => logApplication(ctx),
    });
  }
});

// Boot
createLauncher();
