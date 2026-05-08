import { useEffect } from "react";

const SITE_URL = "https://sammiazaki.github.io";
const DEFAULT_IMAGE = `${SITE_URL}/avatar.png`;

export { SITE_URL, DEFAULT_IMAGE };

function setMeta(selector, attr, value) {
  if (value == null) return;
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement("meta");
    const [key, val] = selector
      .replace(/^meta\[/, "")
      .replace(/\]$/, "")
      .split("=");
    el.setAttribute(key, val.replace(/['"]/g, ""));
    document.head.appendChild(el);
  }
  el.setAttribute(attr, value);
}

function setLink(rel, href) {
  if (!href) return;
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

function setJsonLd(id, data) {
  const existing = document.getElementById(id);
  if (existing) existing.remove();
  if (!data) return;
  const s = document.createElement("script");
  s.type = "application/ld+json";
  s.id = id;
  s.textContent = JSON.stringify(data);
  document.head.appendChild(s);
}

/**
 * Mutate the document head on each render of a page component.
 * `path` is the app-relative path (e.g. "/chalkboard"); we build the canonical URL.
 */
export function useDocumentHead({
  title,
  description,
  path = "/",
  image = DEFAULT_IMAGE,
  type = "website",
  jsonLd,
  noindex = false,
} = {}) {
  useEffect(() => {
    const url = `${SITE_URL}${path}`;
    const fullTitle = title ? `${title} — Sam Miazaki` : "Sam Miazaki";

    document.title = fullTitle;
    setMeta('meta[name="description"]', "content", description);
    setLink("canonical", url);

    setMeta('meta[property="og:type"]', "content", type);
    setMeta('meta[property="og:url"]', "content", url);
    setMeta('meta[property="og:title"]', "content", fullTitle);
    setMeta('meta[property="og:description"]', "content", description);
    setMeta('meta[property="og:image"]', "content", image);

    setMeta('meta[name="twitter:title"]', "content", fullTitle);
    setMeta('meta[name="twitter:description"]', "content", description);
    setMeta('meta[name="twitter:image"]', "content", image);

    const existingRobots = document.head.querySelector('meta[name="robots"]');
    if (noindex) {
      if (!existingRobots) {
        const m = document.createElement("meta");
        m.setAttribute("name", "robots");
        m.setAttribute("content", "noindex, nofollow");
        document.head.appendChild(m);
      } else {
        existingRobots.setAttribute("content", "noindex, nofollow");
      }
    } else if (existingRobots) {
      existingRobots.remove();
    }

    setJsonLd("ld-page", jsonLd);

    return () => {
      const s = document.getElementById("ld-page");
      if (s) s.remove();
    };
  }, [title, description, path, image, type, noindex, JSON.stringify(jsonLd)]);
}
