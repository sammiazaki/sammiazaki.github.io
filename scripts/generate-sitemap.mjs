#!/usr/bin/env node
// Parse src/tutorials/registry.js and write public/sitemap.xml.
// Runs pre-build via `npm run build` (see package.json).

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://sammiazaki.github.io";
const STATIC_ROUTES = [
  { path: "/", priority: "1.0", changefreq: "monthly" },
  { path: "/chalkboard", priority: "0.9", changefreq: "weekly" },
  { path: "/about", priority: "0.7", changefreq: "monthly" },
  { path: "/anime", priority: "0.5", changefreq: "monthly" },
];

function extractTutorials() {
  const src = readFileSync(resolve(ROOT, "src/tutorials/registry.js"), "utf8");
  // Match objects with slug + date; descriptions/tags are ignored for the sitemap.
  const re = /slug:\s*"([^"]+)"[\s\S]*?date:\s*"([^"]+)"/g;
  const out = [];
  let m;
  while ((m = re.exec(src)) !== null) {
    out.push({ slug: m[1], date: m[2] });
  }
  return out;
}

function urlEntry({ loc, lastmod, priority, changefreq }) {
  return [
    "  <url>",
    `    <loc>${loc}</loc>`,
    lastmod ? `    <lastmod>${lastmod}</lastmod>` : null,
    changefreq ? `    <changefreq>${changefreq}</changefreq>` : null,
    priority ? `    <priority>${priority}</priority>` : null,
    "  </url>",
  ]
    .filter(Boolean)
    .join("\n");
}

function build() {
  const tutorials = extractTutorials();
  const today = new Date().toISOString().slice(0, 10);
  const urls = [
    ...STATIC_ROUTES.map((r) =>
      urlEntry({ loc: SITE + r.path, lastmod: today, priority: r.priority, changefreq: r.changefreq })
    ),
    ...tutorials.map((t) =>
      urlEntry({
        loc: `${SITE}/chalkboard/${t.slug}`,
        lastmod: t.date,
        priority: "0.8",
        changefreq: "monthly",
      })
    ),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>
`;
  const outPath = resolve(ROOT, "public/sitemap.xml");
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, xml);
  console.log(`Wrote ${outPath} (${STATIC_ROUTES.length + tutorials.length} URLs)`);
}

build();
