"""Generate public/notebooks/index.html from the exported notebook HTML files.

The generated page mirrors the SPA's visual language:
- Sticky top navbar with the four site links.
- Inter typography, slate palette, grid of cards matching the Chalkboard page.
- Uniform card heights via flex column + grow spacer.

The page is a standalone static HTML file (no Vite, no React) so all styles are
embedded. Keep the generated file server-relative (`/chalkboard` etc.) so links
work both locally under `make preview` and on GitHub Pages.
"""

import re
from pathlib import Path

NOTEBOOKS_DIR = Path(__file__).parent
PUBLIC_DIR = NOTEBOOKS_DIR.parent / "public" / "notebooks"

# Match the first "# Title" and the first standalone "## Subtitle" line.
# Exclude divider comments like "# ── section ──".
TITLE_RE = re.compile(r"^\s*#\s+(?!──)(.+)$", re.MULTILINE)
SUBTITLE_RE = re.compile(r"^\s*##\s+(?!──)(.+)$", re.MULTILINE)


def extract_meta(py_path: Path) -> dict:
    text = py_path.read_text()
    title = TITLE_RE.search(text)
    subtitle = SUBTITLE_RE.search(text)
    return {
        "file": py_path.stem + ".html",
        "title": title.group(1).strip() if title else py_path.stem,
        "subtitle": subtitle.group(1).strip() if subtitle else "",
        "index": py_path.stem.split("_")[0],  # "01", "02", ...
    }


CSS = """
* { margin: 0; padding: 0; box-sizing: border-box; }
html { -webkit-font-smoothing: antialiased; }
body {
  font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: #f8fafc;
  color: #0f172a;
  min-height: 100vh;
  line-height: 1.5;
}

/* ---- navbar ---- */
.navbar {
  position: sticky; top: 0; z-index: 10;
  background: rgba(255,255,255,0.85);
  backdrop-filter: saturate(180%) blur(8px);
  border-bottom: 1px solid #e2e8f0;
}
.navbar-inner {
  max-width: 72rem; margin: 0 auto;
  padding: 1rem 1.5rem;
  display: flex; align-items: center; justify-content: space-between; gap: 1.5rem;
}
.brand {
  font-weight: 600; font-size: 1.0625rem;
  letter-spacing: -0.01em;
  color: #0f172a; text-decoration: none;
}
.nav-links {
  display: flex; gap: 1.5rem;
  font-size: 0.875rem;
}
.nav-links a {
  color: #64748b; text-decoration: none;
  transition: color 0.15s;
}
.nav-links a:hover { color: #0f172a; }
.nav-links a.active { color: #0f172a; font-weight: 500; }

/* ---- page header ---- */
.container { max-width: 72rem; margin: 0 auto; padding: 3rem 1.5rem; }
.page-header {
  display: flex; align-items: flex-end; justify-content: space-between; gap: 1.5rem;
  border-bottom: 1px solid #f1f5f9;
  padding-bottom: 1.5rem; margin-bottom: 2.5rem;
}
h1 {
  font-size: 2.25rem; font-weight: 700; letter-spacing: -0.025em;
  color: #0f172a;
}
.tagline {
  color: #64748b; font-size: 0.875rem; margin-top: 0.5rem; max-width: 36rem;
}
.count {
  color: #94a3b8; font-size: 0.75rem;
  display: flex; align-items: center; gap: 0.5rem;
  white-space: nowrap;
}
.count svg { width: 14px; height: 14px; }

/* ---- grid ---- */
.grid {
  display: grid; gap: 1.25rem;
  grid-template-columns: repeat(1, 1fr);
  grid-auto-rows: 1fr;
}
@media (min-width: 640px)  { .grid { grid-template-columns: repeat(2, 1fr); } }
@media (min-width: 1024px) { .grid { grid-template-columns: repeat(3, 1fr); } }

/* ---- card ---- */
.card {
  display: flex; flex-direction: column;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  padding: 1.5rem;
  text-decoration: none; color: inherit;
  box-shadow: 0 1px 2px rgba(15,23,42,0.04);
  transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s;
}
.card:hover {
  transform: translateY(-2px);
  border-color: #cbd5e1;
  box-shadow: 0 4px 12px rgba(15,23,42,0.08);
}
.card-top {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 0.75rem;
}
.card-index {
  font-family: "JetBrains Mono", "Menlo", monospace;
  font-size: 0.6875rem;
  letter-spacing: 0.1em; text-transform: uppercase;
  color: #94a3b8;
}
.card-arrow {
  width: 16px; height: 16px; color: #cbd5e1;
  transition: color 0.15s;
}
.card:hover .card-arrow { color: #334155; }
.card h2 {
  font-size: 1rem; font-weight: 600; line-height: 1.35;
  color: #0f172a;
  margin-bottom: 0.5rem;
}
.card-subtitle {
  color: #475569; font-size: 0.8125rem; line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 3; -webkit-box-orient: vertical;
  overflow: hidden;
}
.card-spacer { flex: 1; }
.card-footer {
  margin-top: 1rem;
  font-size: 0.6875rem; color: #94a3b8;
  display: flex; align-items: center; gap: 0.375rem;
}
.pill {
  display: inline-flex; align-items: center;
  background: #f1f5f9; color: #475569;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.6875rem;
}

/* ---- footer ---- */
footer {
  max-width: 72rem; margin: 0 auto;
  padding: 2rem 1.5rem;
  border-top: 1px solid #f1f5f9;
  display: flex; justify-content: space-between;
  font-size: 0.75rem; color: #94a3b8;
}
footer a { color: inherit; text-decoration: none; margin-left: 1rem; }
footer a:hover { color: #334155; }
"""

NAVBAR = """
<header class="navbar">
  <div class="navbar-inner">
    <a href="/" class="brand">Sam Miazaki</a>
    <nav class="nav-links">
      <a href="/#/chalkboard">Chalkboard</a>
      <a href="/notebooks/" class="active">Workbench</a>
      <a href="/#/about">AboutMe</a>
    </nav>
  </div>
</header>
"""

FOOTER = """
<footer>
  <span>Sam Miazaki</span>
  <div>
    <a href="https://github.com/sammiazaki">GitHub</a>
    <a href="https://www.linkedin.com/in/sajad-mirzababaei/">LinkedIn</a>
    <a href="https://sammiazaki.substack.com">Substack</a>
  </div>
</footer>
"""

ARROW_SVG = (
    '<svg class="card-arrow" viewBox="0 0 24 24" fill="none" '
    'stroke="currentColor" stroke-width="2" stroke-linecap="round" '
    'stroke-linejoin="round"><path d="M7 17L17 7"/><path d="M7 7h10v10"/></svg>'
)

BOOK_SVG = (
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" '
    'stroke-linecap="round" stroke-linejoin="round">'
    '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>'
    '<path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>'
)


def build_card(entry: dict) -> str:
    return (
        f'<a href="{entry["file"]}" target="_blank" rel="noopener noreferrer" class="card">'
        '<div class="card-top">'
        f'<span class="card-index">Notebook {entry["index"]}</span>'
        f"{ARROW_SVG}"
        "</div>"
        f'<h2>{entry["title"]}</h2>'
        f'<p class="card-subtitle">{entry["subtitle"]}</p>'
        '<div class="card-spacer"></div>'
        '<div class="card-footer">'
        '<span class="pill">marimo</span>'
        '<span>interactive notebook</span>'
        "</div>"
        "</a>"
    )


def build_index():
    sources = sorted(NOTEBOOKS_DIR.glob("0*.py"))
    entries = [extract_meta(s) for s in sources]
    cards = "\n      ".join(build_card(e) for e in entries)

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Workbench — Sam Miazaki</title>
  <link rel="preconnect" href="https://rsms.me/" />
  <link rel="stylesheet" href="https://rsms.me/inter/inter.css" />
  <style>{CSS}</style>
</head>
<body>
  {NAVBAR}
  <main class="container">
    <div class="page-header">
      <div>
        <h1>Workbench</h1>
        <p class="tagline">
          Marimo notebooks that code through each method end-to-end with real
          datasets — the computational companion to the Chalkboard tutorials.
        </p>
      </div>
      <div class="count">
        {BOOK_SVG}
        <span>{len(entries)} {"notebook" if len(entries) == 1 else "notebooks"}</span>
      </div>
    </div>
    <div class="grid">
      {cards}
    </div>
  </main>
  {FOOTER}
</body>
</html>
"""

    PUBLIC_DIR.mkdir(parents=True, exist_ok=True)
    (PUBLIC_DIR / "index.html").write_text(html)
    print(f"  Built index with {len(entries)} notebooks")


if __name__ == "__main__":
    build_index()
