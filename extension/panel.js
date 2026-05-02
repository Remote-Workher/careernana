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
