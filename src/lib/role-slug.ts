export const slugifyRole = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export const unslugifyRole = (slug: string) =>
  slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
