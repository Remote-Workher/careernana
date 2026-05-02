const $ = (id) => document.getElementById(id);
let ctx = null;
let liCtx = null;
const lastResults = { resume: null, skills: null, linkedin: null };

window.parent.postMessage({ type: "RW_PANEL_READY" }, "*");

window.addEventListener("message", (e) => {
  if (e.data?.type === "RW_PANEL_CONTEXT") {
    ctx = e.data.ctx;
    liCtx = e.data.liCtx ?? null;
    renderCtx();
    renderLinkedInState();
  }
});

function renderCtx() {
  if (!ctx) return;
  $("rw-ctx").innerHTML = `<b>${escape(ctx.title || "(no title detected)")}</b><br/>${escape(ctx.company || "")} · ${escape(ctx.location || "")}`;
}

function renderLinkedInState() {
  if (liCtx?.profile_text) {
    $("rw-li-hint").textContent = `Detected LinkedIn profile (${(liCtx.profile_text.length / 1000).toFixed(1)}k chars).`;
    $("rw-li-go").disabled = false;
  } else {
    $("rw-li-hint").textContent = "Open a LinkedIn profile (linkedin.com/in/...) to scan it.";
    $("rw-li-go").disabled = true;
  }
}

function escape(s = "") {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

// ---------- Tabs ----------
document.querySelectorAll(".tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    const tab = btn.dataset.tab;
    document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t === btn));
    document.querySelectorAll(".pane").forEach((p) => p.classList.toggle("active", p.dataset.pane === tab));
  });
});

$("rw-close").addEventListener("click", () => window.parent.postMessage({ type: "RW_PANEL_CLOSE" }, "*"));

// ---------- Helpers ----------
function setMsg(id, text, ok = false) {
  const el = $(id);
  el.textContent = text;
  el.className = ok ? "msg ok" : "msg";
}
function tokensMsg(d) {
  return d?.tokens_remaining != null ? `Done. ${d.tokens_remaining} coins left.` : "Done.";
}
function humanError(e) {
  const m = e?.message || String(e);
  if (m === "not_signed_in") return "Sign in from the extension popup first.";
  if (m === "profile_incomplete") return "Finish your Workher profile to use this tool.";
  if (m === "insufficient_tokens") return "Not enough coins. Top up in the app.";
  if (m === "rate_limited") return "Rate limited — try again in a moment.";
  if (m === "ai_credits_exhausted") return "AI credits exhausted. Try again later.";
  return `Error: ${m}`;
}

function jdPayload() {
  return {
    job_title: ctx?.title,
    company: ctx?.company,
    job_description: ctx?.description,
    source_url: ctx?.source_url,
  };
}
function ensureJd(msgId) {
  if (!ctx?.description || ctx.description.length < 100) {
    setMsg(msgId, "Couldn't read a job description on this page.");
    return false;
  }
  return true;
}

// ---------- Apply ----------
$("rw-go").addEventListener("click", async () => {
  if (!ensureJd("rw-msg")) return;
  setMsg("rw-msg", "Generating…", true);
  $("rw-go").disabled = true;
  try {
    const { data, error } = await chrome.runtime.sendMessage({ type: "RW_TAILOR", payload: jdPayload() });
    if (error) throw new Error(error);
    $("rw-resume").value = data.resume || "";
    $("rw-cover").value = data.cover_letter || "";
    $("rw-talk").innerHTML = (data.talking_points || []).map((t) => `<li>${escape(t)}</li>`).join("");
    $("rw-out").hidden = false;
    setMsg("rw-msg", tokensMsg(data), true);
  } catch (e) { setMsg("rw-msg", humanError(e)); }
  finally { $("rw-go").disabled = false; }
});

$("rw-log").addEventListener("click", () => window.parent.postMessage({ type: "RW_PANEL_LOG" }, "*"));

// ---------- Resume Optimizer ----------
$("rw-resume-go").addEventListener("click", async () => {
  if (!ensureJd("rw-resume-msg")) return;
  setMsg("rw-resume-msg", "Scoring…", true);
  $("rw-resume-go").disabled = true;
  try {
    const { data, error } = await chrome.runtime.sendMessage({ type: "RW_RESUME_OPTIMIZE", payload: jdPayload() });
    if (error) throw new Error(error);
    lastResults.resume = data;
    $("rw-ats-score").textContent = data.ats_score ?? "–";
    $("rw-verdict").textContent = data.verdict || "";
    $("rw-missing").innerHTML = (data.missing_keywords || []).map((k) => `<span>${escape(k)}</span>`).join("");
    $("rw-fixes").innerHTML = (data.fixes || []).map((f) => `<li>${escape(f)}</li>`).join("");
    $("rw-summary").value = data.rewrite_summary || "";
    $("rw-resume-out").hidden = false;
    setMsg("rw-resume-msg", tokensMsg(data), true);
  } catch (e) { setMsg("rw-resume-msg", humanError(e)); }
  finally { $("rw-resume-go").disabled = false; }
});

// ---------- Skills Gap ----------
$("rw-skills-go").addEventListener("click", async () => {
  if (!ensureJd("rw-skills-msg")) return;
  setMsg("rw-skills-msg", "Analyzing…", true);
  $("rw-skills-go").disabled = true;
  try {
    const { data, error } = await chrome.runtime.sendMessage({ type: "RW_SKILLS_GAP", payload: jdPayload() });
    if (error) throw new Error(error);
    lastResults.skills = data;
    $("rw-skills-score").textContent = data.match_score ?? "–";
    $("rw-skills-summary").textContent = data.summary || "";
    $("rw-matched").innerHTML = (data.matched || []).map((m) => `<span>${escape(m)}</span>`).join("");
    $("rw-gaps").innerHTML = (data.gaps || []).map((g) => `<li><b>${escape(g.skill)}</b> <em>(${escape(g.priority || "")})</em> — ${escape(g.why || "")}</li>`).join("");
    $("rw-actions").innerHTML = (data.actions || []).map((a) => `<li><b>${escape(a.title)}</b> — ${escape(a.resource || "")} · ${escape(a.duration || "")}</li>`).join("");
    $("rw-skills-out").hidden = false;
    setMsg("rw-skills-msg", tokensMsg(data), true);
  } catch (e) { setMsg("rw-skills-msg", humanError(e)); }
  finally { $("rw-skills-go").disabled = false; }
});

// ---------- LinkedIn Optimizer ----------
$("rw-li-go").addEventListener("click", async () => {
  if (!liCtx?.profile_text) { setMsg("rw-li-msg", "Open a LinkedIn /in/ profile first."); return; }
  setMsg("rw-li-msg", "Optimizing…", true);
  $("rw-li-go").disabled = true;
  try {
    const { data, error } = await chrome.runtime.sendMessage({
      type: "RW_LINKEDIN_OPTIMIZE",
      payload: {
        profile_url: liCtx.profile_url,
        profile_text: liCtx.profile_text,
      },
    });
    if (error) throw new Error(error);
    lastResults.linkedin = { ...data, _profile_url: liCtx.profile_url };
    $("rw-li-score").textContent = data.score ?? "–";
    $("rw-li-summary").textContent = data.summary || "";
    $("rw-headline").value = data.headline_rewrite || "";
    $("rw-about").value = data.about_rewrite || "";
    $("rw-li-bullets").innerHTML = (data.experience_bullets || []).map((b) => `<li>${escape(b)}</li>`).join("");
    $("rw-li-wins").innerHTML = (data.quick_wins || []).map((w) => `<li>${escape(w)}</li>`).join("");
    $("rw-li-out").hidden = false;
    setMsg("rw-li-msg", tokensMsg(data), true);
  } catch (e) { setMsg("rw-li-msg", humanError(e)); }
  finally { $("rw-li-go").disabled = false; }
});

// ---------- Copy buttons ----------
document.addEventListener("click", (e) => {
  const t = e.target.closest("button.copy");
  if (!t) return;
  const el = document.getElementById(t.dataset.target);
  el.select(); document.execCommand("copy");
  const orig = t.textContent;
  t.textContent = "Copied!"; setTimeout(() => (t.textContent = orig), 1500);
});

// ---------- Export to PDF (clean print-ready report opened in a new tab) ----------
function reportShellHTML(title, bodyHTML) {
  const today = new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  return `<!doctype html><html><head><meta charset="utf-8"/>
<title>${escape(title)}</title>
<style>
  @page { size: A4; margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  body { font: 13px/1.55 -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1a1a1a; margin: 0; padding: 32px 36px; max-width: 800px; }
  header { border-bottom: 2px solid #E0487A; padding-bottom: 14px; margin-bottom: 22px; display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; }
  header .brand { font-weight: 700; font-size: 13px; letter-spacing: 0.04em; text-transform: uppercase; color: #E0487A; }
  header h1 { margin: 4px 0 0; font-size: 22px; font-weight: 700; }
  header .meta { font-size: 11px; color: #666; text-align: right; white-space: nowrap; }
  h2 { font-size: 14px; margin: 22px 0 8px; color: #1a1a1a; border-bottom: 1px solid #eee; padding-bottom: 4px; }
  ul { margin: 6px 0 12px; padding-left: 20px; }
  li { margin-bottom: 6px; }
  p { margin: 6px 0 12px; }
  .score { display: inline-flex; align-items: baseline; gap: 6px; padding: 8px 14px; border-radius: 999px; background: #fdf1f5; border: 1px solid #f7cdd9; color: #c73868; font-weight: 700; font-size: 18px; }
  .score small { font-size: 10px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: #888; }
  .score-row { display: flex; align-items: center; gap: 14px; margin-bottom: 14px; flex-wrap: wrap; }
  .verdict { font-size: 13px; color: #444; margin: 0; flex: 1; min-width: 220px; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; margin: 6px 0 12px; }
  .chips span { display: inline-block; padding: 3px 10px; border-radius: 999px; background: #f3eeff; border: 1px solid #d5c4f0; color: #4a2a82; font-size: 11px; font-weight: 500; }
  .chips.ok span { background: #edfaf4; border-color: #b5e8d5; color: #1f6f4a; }
  .quote { background: #f9f6f4; border-left: 3px solid #E0487A; padding: 10px 14px; margin: 6px 0 14px; white-space: pre-wrap; font-size: 12.5px; }
  .ctx-block { background: #faf7f5; border: 1px solid #ebe6e2; border-radius: 8px; padding: 10px 14px; margin-bottom: 18px; font-size: 12px; color: #555; }
  footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #eee; font-size: 10.5px; color: #888; text-align: center; }
  @media print { body { padding: 0; } .no-print { display: none; } }
  .toolbar { position: fixed; top: 12px; right: 16px; }
  .toolbar button { background: #E0487A; color: #fff; border: 0; padding: 8px 14px; border-radius: 8px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 14px rgba(224,72,122,0.35); }
</style></head><body>
<div class="toolbar no-print"><button onclick="window.print()">Save as PDF</button></div>
<header>
  <div><div class="brand">Remote Workher</div><h1>${escape(title)}</h1></div>
  <div class="meta">${escape(today)}</div>
</header>
${bodyHTML}
<footer>Generated by the Remote Workher Chrome extension · remoteworkher.com</footer>
<script>setTimeout(() => window.print(), 350);<\/script>
</body></html>`;
}

function ctxBlockHTML() {
  if (!ctx?.title && !ctx?.company) return "";
  const url = ctx?.source_url ? `<div style="margin-top:4px;color:#888;font-size:11px;word-break:break-all">${escape(ctx.source_url)}</div>` : "";
  return `<div class="ctx-block"><b>${escape(ctx?.title || "")}</b>${ctx?.company ? ` · ${escape(ctx.company)}` : ""}${ctx?.location ? ` · ${escape(ctx.location)}` : ""}${url}</div>`;
}

function listHTML(items, render) {
  if (!items?.length) return "<p style='color:#888'>None.</p>";
  return `<ul>${items.map(render).join("")}</ul>`;
}

function buildResumeReport(d) {
  const body = `
    ${ctxBlockHTML()}
    <div class="score-row">
      <div class="score">${escape(String(d.ats_score ?? "–"))}<small>ATS</small></div>
      <p class="verdict">${escape(d.verdict || "")}</p>
    </div>
    <h2>Missing keywords</h2>
    <div class="chips">${(d.missing_keywords || []).map(k => `<span>${escape(k)}</span>`).join("") || "<span style='background:#f5f5f5;border-color:#ddd;color:#888'>None detected</span>"}</div>
    <h2>Top fixes</h2>
    ${listHTML(d.fixes, (f) => `<li>${escape(f)}</li>`)}
    <h2>Suggested summary rewrite</h2>
    <div class="quote">${escape(d.rewrite_summary || "—")}</div>
  `;
  return reportShellHTML("Resume Optimizer Report", body);
}

function buildSkillsReport(d) {
  const body = `
    ${ctxBlockHTML()}
    <div class="score-row">
      <div class="score">${escape(String(d.match_score ?? "–"))}<small>Match</small></div>
      <p class="verdict">${escape(d.summary || "")}</p>
    </div>
    <h2>You already have</h2>
    <div class="chips ok">${(d.matched || []).map(m => `<span>${escape(m)}</span>`).join("") || "<span>None listed</span>"}</div>
    <h2>Gaps to close</h2>
    ${listHTML(d.gaps, (g) => `<li><b>${escape(g.skill || "")}</b> <em>(${escape(g.priority || "")})</em> — ${escape(g.why || "")}</li>`)}
    <h2>Action plan</h2>
    ${listHTML(d.actions, (a) => `<li><b>${escape(a.title || "")}</b> — ${escape(a.resource || "")} · ${escape(a.duration || "")}</li>`)}
  `;
  return reportShellHTML("Skills Gap Report", body);
}

function buildLinkedInReport(d) {
  const profileLine = d._profile_url ? `<div class="ctx-block"><b>LinkedIn profile</b><div style="margin-top:4px;color:#888;font-size:11px;word-break:break-all">${escape(d._profile_url)}</div></div>` : "";
  const body = `
    ${profileLine}
    <div class="score-row">
      <div class="score">${escape(String(d.score ?? "–"))}<small>Profile</small></div>
      <p class="verdict">${escape(d.summary || "")}</p>
    </div>
    <h2>Headline rewrite</h2>
    <div class="quote">${escape(d.headline_rewrite || "—")}</div>
    <h2>About rewrite</h2>
    <div class="quote">${escape(d.about_rewrite || "—")}</div>
    <h2>Experience bullets</h2>
    ${listHTML(d.experience_bullets, (b) => `<li>${escape(b)}</li>`)}
    <h2>Quick wins</h2>
    ${listHTML(d.quick_wins, (w) => `<li>${escape(w)}</li>`)}
  `;
  return reportShellHTML("LinkedIn Optimizer Report", body);
}

function openReport(html) {
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  // Side panel can't open new tabs directly — ask the background to do it.
  chrome.runtime.sendMessage({ type: "RW_OPEN_TAB", url }).catch(() => {
    // Fallback: try window.open from the panel itself.
    window.open(url, "_blank");
  });
  // Revoke a bit later so the new tab has time to fetch the blob.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

document.addEventListener("click", (e) => {
  const t = e.target.closest("button.export");
  if (!t) return;
  const kind = t.dataset.export;
  const data = lastResults[kind];
  if (!data) return;
  if (kind === "resume") openReport(buildResumeReport(data));
  else if (kind === "skills") openReport(buildSkillsReport(data));
  else if (kind === "linkedin") openReport(buildLinkedInReport(data));
});
