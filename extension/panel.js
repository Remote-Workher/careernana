const $ = (id) => document.getElementById(id);
let ctx = null;

window.parent.postMessage({ type: "RW_PANEL_READY" }, "*");

window.addEventListener("message", (e) => {
  if (e.data?.type === "RW_PANEL_CONTEXT") {
    ctx = e.data.ctx;
    $("rw-ctx").innerHTML = `<b>${escape(ctx.title)}</b><br/>${escape(ctx.company)} · ${escape(ctx.location || "")}`;
  }
});

function escape(s = "") {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

$("rw-close").addEventListener("click", () => window.parent.postMessage({ type: "RW_PANEL_CLOSE" }, "*"));

$("rw-go").addEventListener("click", async () => {
  if (!ctx) return;
  $("rw-msg").textContent = "Generating…"; $("rw-msg").className = "msg";
  $("rw-go").disabled = true;
  try {
    const { data, error } = await chrome.runtime.sendMessage({
      type: "RW_TAILOR",
      payload: { job_title: ctx.title, company: ctx.company, job_description: ctx.description, source_url: ctx.source_url },
    });
    if (error) throw new Error(error);
    $("rw-resume").value = data.resume || "";
    $("rw-cover").value = data.cover_letter || "";
    $("rw-talk").innerHTML = (data.talking_points || []).map((t) => `<li>${escape(t)}</li>`).join("");
    $("rw-out").hidden = false;
    $("rw-msg").textContent = data.tokens_remaining != null ? `Done. ${data.tokens_remaining} coins left.` : "Done.";
    $("rw-msg").className = "msg ok";
  } catch (e) {
    $("rw-msg").textContent = e.message === "not_signed_in" ? "Sign in from the extension popup first." : `Error: ${e.message}`;
  } finally {
    $("rw-go").disabled = false;
  }
});

$("rw-log").addEventListener("click", () => window.parent.postMessage({ type: "RW_PANEL_LOG" }, "*"));

document.addEventListener("click", (e) => {
  const t = e.target.closest("button.copy");
  if (!t) return;
  const el = document.getElementById(t.dataset.target);
  el.select(); document.execCommand("copy");
  t.textContent = "Copied!"; setTimeout(() => (t.textContent = t.dataset.target.includes("resume") ? "Copy resume" : "Copy cover letter"), 1500);
});
