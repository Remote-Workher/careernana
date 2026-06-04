import { forwardRef, useMemo } from "react";

export interface CoverLetterProfile {
  full_name?: string | null;
  title?: string | null; // e.g. current_role / target_role
  city?: string | null;
  phone?: string | null;
  email?: string | null;
  linkedin?: string | null;
}

export interface CoverLetterPreviewProps {
  letter: string;
  profile: CoverLetterProfile;
  recipientCompany?: string | null;
  recipientLocation?: string | null;
  date?: string;
}

function todayFormatted(): string {
  return new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Strip the closing/signature block and any AI-emitted header (date /
 * recipient / greeting) from the raw letter so we render exactly one of
 * each — the layout supplies them.
 */
function extractBody(raw: string): string[] {
  if (!raw) return [];
  let text = raw.replace(/\r\n/g, "\n").trim();

  // Drop the signature block (everything from the final closing onward)
  const closings = [
    /\n+(sincerely|best regards|kind regards|warm regards|regards|yours sincerely|yours truly|thank you|with appreciation)[\s,]*\n[\s\S]*$/i,
  ];
  for (const rx of closings) text = text.replace(rx, "").trim();

  // Drop leading date line (e.g. "May 14, 2024")
  text = text.replace(
    /^(?:[A-Z][a-z]+\s+\d{1,2},\s*\d{4}|\d{1,2}\s+[A-Z][a-z]+\s+\d{4}|\d{4}-\d{2}-\d{2})\s*\n+/,
    "",
  );

  // Drop a recipient block at the top (e.g. "Hiring Manager\nCompany\nCity\n")
  // Heuristic: up to 4 short lines before the greeting "Dear ..."
  text = text.replace(
    /^(?:[^\n]{1,80}\n){0,4}(?=Dear\b)/i,
    "",
  );

  // Drop the greeting itself ("Dear ...,")
  text = text.replace(/^Dear[^\n]*\n+/i, "");

  return text
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\n+/g, " ").trim())
    .filter(Boolean);
}

const CoverLetterPreview = forwardRef<HTMLDivElement, CoverLetterPreviewProps>(
  function CoverLetterPreview(
    { letter, profile, recipientCompany, recipientLocation, date },
    ref,
  ) {
    const paragraphs = useMemo(() => extractBody(letter), [letter]);
    const contactBits = [
      profile.city,
      profile.phone,
      profile.email,
      profile.linkedin,
    ]
      .map((s) => (s || "").trim())
      .filter(Boolean);

    const displayName = (profile.full_name || "").trim() || "Your Name";
    const displayTitle = (profile.title || "").trim();
    const displayDate = date || todayFormatted();
    const recipientCity = (recipientLocation || profile.city || "").trim();

    return (
      <div
        ref={ref}
        className="bg-white text-[#1A1A1A]"
        style={{
          fontFamily:
            "'Open Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          padding: "56px 64px 64px",
          lineHeight: 1.6,
          fontSize: "12.5pt",
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center" }}>
          <h1
            style={{
              fontSize: "28pt",
              fontWeight: 800,
              letterSpacing: "0.02em",
              margin: 0,
              textTransform: "uppercase",
            }}
          >
            {displayName}
          </h1>
          {displayTitle && (
            <p
              style={{
                fontSize: "14pt",
                fontWeight: 700,
                margin: "6px 0 14px",
              }}
            >
              {displayTitle}
            </p>
          )}
          {contactBits.length > 0 && (
            <p
              style={{
                fontSize: "10.5pt",
                color: "#1A1A1A",
                margin: "0 0 14px",
              }}
            >
              {contactBits.map((bit, i) => (
                <span key={i}>
                  {bit}
                  {i < contactBits.length - 1 && (
                    <span style={{ margin: "0 12px", color: "#999" }}>|</span>
                  )}
                </span>
              ))}
            </p>
          )}
        </div>
        <hr
          style={{
            border: 0,
            borderTop: "1px solid #1A1A1A",
            margin: "0 0 28px",
          }}
        />

        {/* Date */}
        <p style={{ margin: "0 0 24px", fontSize: "11.5pt" }}>{displayDate}</p>

        {/* Recipient */}
        <div style={{ margin: "0 0 28px", fontSize: "11.5pt" }}>
          <p style={{ margin: 0 }}>Hiring Manager</p>
          {recipientCompany && <p style={{ margin: 0 }}>{recipientCompany}</p>}
          {recipientCity && <p style={{ margin: 0 }}>{recipientCity}</p>}
        </div>

        {/* Greeting */}
        <p style={{ margin: "0 0 20px" }}>Dear Hiring Manager,</p>

        {/* Body */}
        {paragraphs.map((p, i) => (
          <p key={i} style={{ margin: "0 0 18px", textAlign: "left" }}>
            {p}
          </p>
        ))}

        {/* Closing */}
        <p style={{ margin: "24px 0 6px" }}>Sincerely,</p>
        <p
          style={{
            fontFamily: "'Dancing Script', 'Brush Script MT', cursive",
            fontSize: "22pt",
            margin: "0 0 8px",
            color: "#1A1A1A",
          }}
        >
          {displayName
            .toLowerCase()
            .replace(/\b\w/g, (c) => c.toUpperCase())}
        </p>
        <p style={{ margin: 0, fontSize: "11.5pt" }}>{displayName.replace(/\b\w/g, (c) => c.toUpperCase()).toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}</p>
      </div>
    );
  },
);

export default CoverLetterPreview;
