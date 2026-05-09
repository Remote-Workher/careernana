// Strip "how to apply" instructions, URLs, and emails from public job text so
// non-members can't bypass the in-app Apply flow. Members must click the
// Apply button (which is gated by membership) to actually apply.

const APPLY_HEADING_PATTERNS: RegExp[] = [
  /^\s*(how\s*to\s*apply|to\s*apply|application(?:\s+process|\s+instructions|\s+method|\s+details)?|apply(?:\s+now|\s+here|\s+via|\s+through|\s+by|\s+at|\s+on)?|to\s+submit|submit\s+your\s+application|send\s+your\s+(?:cv|resume|application)|interested\?\s*apply|hiring\s+process|recruitment\s+process)\s*[:\-—].*/i,
  /^\s*(how\s*to\s*apply|to\s*apply|application(?:\s+process|\s+instructions|\s+method|\s+details)?|apply\s+(?:now|here|via|through|by|at|on)|to\s+submit|submit\s+your\s+application|send\s+your\s+(?:cv|resume|application)|interested\?\s*apply|hiring\s+process|recruitment\s+process)\s*$/i,
];

function isApplyHeading(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  return APPLY_HEADING_PATTERNS.some((re) => re.test(trimmed));
}

function stripApplySection(text: string): string {
  const lines = text.split(/\r?\n/);
  const cutAt = lines.findIndex(isApplyHeading);
  if (cutAt === -1) return text;
  return lines.slice(0, cutAt).join("\n").replace(/\s+$/g, "");
}

// Inline sentences that smell like apply instructions even without a heading.
const INLINE_INSTRUCTION_SENTENCE = /(?:^|(?<=[.!?]\s))[^.!?\n]{0,200}?\b(apply\s+(?:now|here|via|through|by|at|on|using)|click\s+(?:here|the\s+link|below)|send\s+your\s+(?:cv|resume|application)|email\s+your\s+(?:cv|resume|application)|submit\s+your\s+(?:cv|resume|application)|to\s+apply[, ])[^.!?\n]*[.!?]?/gi;

export function sanitizeJobText(input: string | null | undefined): string {
  if (!input) return "";
  let out = input;

  // 1. Remove a trailing "How to apply" block (most common pattern).
  out = stripApplySection(out);

  // 2. Remove inline application instructions sentences anywhere in the body.
  out = out.replace(INLINE_INSTRUCTION_SENTENCE, "");

  // 3. Strip all URLs (any scheme + bare domains with /path).
  out = out.replace(/\bhttps?:\/\/\S+/gi, "");
  out = out.replace(/\bwww\.[^\s)]+/gi, "");
  out = out.replace(/\b[a-z0-9-]+\.(?:com|co|io|org|net|app|dev|ai|me|ng|africa|jobs|careers|work|hr)(?:\/\S*)?/gi, "");

  // 4. Strip email addresses.
  out = out.replace(/\b[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}\b/g, "");

  // 5. Strip mailto: and tel: links.
  out = out.replace(/\b(?:mailto|tel):\S+/gi, "");

  // 6. Tidy up leftover empty bullets / dangling punctuation / extra blank lines.
  out = out
    .split(/\r?\n/)
    .map((l) => l.replace(/\s{2,}/g, " ").replace(/[\s•\-–—*:]+$/g, "").trimEnd())
    .filter((l, i, arr) => !(l.trim() === "" && arr[i - 1]?.trim() === ""))
    .join("\n")
    .trim();

  return out;
}
