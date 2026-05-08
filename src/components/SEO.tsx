import { useEffect } from "react";

interface SEOProps {
  title: string;
  description?: string;
  canonical?: string;
}

const DEFAULT_DESCRIPTION =
  "Remote WorkHER helps women land remote jobs, get freelance clients, and grow online with AI tools, job opportunities, and career resources.";

function setMeta(selector: string, attr: string, value: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    const [k, v] = selector.replace(/[\[\]"]/g, "").split("=");
    el.setAttribute(k, v);
    document.head.appendChild(el);
  }
  el.setAttribute(attr, value);
}

function setLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

export default function SEO({ title, description, canonical }: SEOProps) {
  useEffect(() => {
    const fullTitle =
      title.toLowerCase().includes("remote workher") || title.toLowerCase().includes("remote workher")
        ? title
        : `${title} | Remote WorkHER`;
    document.title = fullTitle.length > 60 ? fullTitle.slice(0, 57) + "…" : fullTitle;

    const desc = (description || DEFAULT_DESCRIPTION).slice(0, 160);
    setMeta('meta[name="description"]', "content", desc);
    setMeta('meta[property="og:title"]', "content", fullTitle);
    setMeta('meta[property="og:description"]', "content", desc);
    setMeta('meta[name="twitter:title"]', "content", fullTitle);
    setMeta('meta[name="twitter:description"]', "content", desc);

    const url = canonical || (typeof window !== "undefined" ? window.location.href.split("?")[0] : "");
    if (url) setLink("canonical", url);
  }, [title, description, canonical]);

  return null;
}
