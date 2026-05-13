import { useEffect } from "react";

interface SEOProps {
  title: string;
  description?: string;
  canonical?: string;
  /** Optional JSON-LD object(s) injected into <head> for the lifetime of the page. */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
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

export function useSEO({ title, description, canonical, jsonLd }: SEOProps) {
  useEffect(() => {
    const lower = title.toLowerCase();
    const fullTitle = lower.includes("remote workher") ? title : `${title} | Remote WorkHER`;
    document.title = fullTitle.length > 60 ? fullTitle.slice(0, 57) + "…" : fullTitle;

    const desc = (description || DEFAULT_DESCRIPTION).slice(0, 160);
    setMeta('meta[name="description"]', "content", desc);
    setMeta('meta[property="og:title"]', "content", fullTitle);
    setMeta('meta[property="og:description"]', "content", desc);
    setMeta('meta[name="twitter:title"]', "content", fullTitle);
    setMeta('meta[name="twitter:description"]', "content", desc);

    const url = canonical || (typeof window !== "undefined" ? window.location.href.split("?")[0] : "");
    if (url) {
      setLink("canonical", url);
      setMeta('meta[property="og:url"]', "content", url);
    }

    // Inject JSON-LD scripts for the lifetime of this page.
    const scripts: HTMLScriptElement[] = [];
    if (jsonLd) {
      const blocks = Array.isArray(jsonLd) ? jsonLd : [jsonLd];
      for (const block of blocks) {
        const s = document.createElement("script");
        s.type = "application/ld+json";
        s.dataset.dynamic = "true";
        try { s.textContent = JSON.stringify(block); } catch { /* noop */ }
        document.head.appendChild(s);
        scripts.push(s);
      }
    }
    return () => {
      for (const s of scripts) s.remove();
    };
  }, [title, description, canonical, JSON.stringify(jsonLd ?? null)]);
}

export default function SEO(props: SEOProps) {
  useSEO(props);
  return null;
}
