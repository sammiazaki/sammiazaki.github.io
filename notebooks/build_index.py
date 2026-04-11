"""Generate public/notebooks/index.html from the exported notebook HTML files."""

import re
from pathlib import Path

NOTEBOOKS_DIR = Path(__file__).parent
PUBLIC_DIR = NOTEBOOKS_DIR.parent / "public" / "notebooks"

# Extract title and subtitle from markdown inside mo.md() cells
# Match "# Title" lines but skip Python section-separator comments like # ── Title ──
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
    }


def build_index():
    sources = sorted(NOTEBOOKS_DIR.glob("0*.py"))
    entries = [extract_meta(s) for s in sources]

    cards = ""
    for e in entries:
        cards += f"""
      <a href="{e['file']}" class="card">
        <h2>{e['title']}</h2>
        <p>{e['subtitle']}</p>
      </a>"""

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Noodlelab Notebooks</title>
  <style>
    * {{ margin: 0; padding: 0; box-sizing: border-box; }}
    body {{
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #f8fafc;
      color: #1e293b;
      min-height: 100vh;
      padding: 3rem 1.5rem;
    }}
    .container {{ max-width: 720px; margin: 0 auto; }}
    h1 {{
      font-size: 1.75rem;
      margin-bottom: 0.25rem;
    }}
    .subtitle {{
      color: #64748b;
      margin-bottom: 2rem;
      font-size: 0.95rem;
    }}
    .card {{
      display: block;
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 1.25rem 1.5rem;
      margin-bottom: 0.75rem;
      text-decoration: none;
      color: inherit;
      transition: border-color 0.15s, box-shadow 0.15s;
    }}
    .card:hover {{
      border-color: #94a3b8;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    }}
    .card h2 {{
      font-size: 1.1rem;
      margin-bottom: 0.25rem;
    }}
    .card p {{
      color: #64748b;
      font-size: 0.875rem;
    }}
    .back {{
      display: inline-block;
      margin-bottom: 1.5rem;
      color: #64748b;
      text-decoration: none;
      font-size: 0.875rem;
    }}
    .back:hover {{ color: #1e293b; }}
  </style>
</head>
<body>
  <div class="container">
    <a href="/" class="back">&larr; Back to site</a>
    <h1>Noodlelab Notebooks</h1>
    <p class="subtitle">Applied causal inference with real data &mdash; powered by marimo</p>
    {cards}
  </div>
</body>
</html>"""

    PUBLIC_DIR.mkdir(parents=True, exist_ok=True)
    (PUBLIC_DIR / "index.html").write_text(html)
    print(f"  Built index with {len(entries)} notebooks")


if __name__ == "__main__":
    build_index()
