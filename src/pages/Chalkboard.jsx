import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import tutorials from "@/tutorials/registry";
import { motion } from "framer-motion";
import { BookOpen, ArrowUpRight, Search, X } from "lucide-react";
import { useDocumentHead, SITE_URL } from "@/lib/seo";

const MAX_VISIBLE_TAGS = 4;

function tutorialMatches(tutorial, query, tag) {
  if (tag && !tutorial.tags.includes(tag)) return false;
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    tutorial.title.toLowerCase().includes(q) ||
    tutorial.description.toLowerCase().includes(q) ||
    tutorial.tags.some((t) => t.toLowerCase().includes(q))
  );
}

export default function Chalkboard() {
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState(null);

  const sorted = useMemo(
    () => [...tutorials].sort((a, b) => b.date.localeCompare(a.date)),
    []
  );

  // Top tags by frequency (cap to keep the chip row compact).
  const topTags = useMemo(() => {
    const counts = new Map();
    for (const t of sorted) {
      for (const tag of t.tags) {
        counts.set(tag, (counts.get(tag) || 0) + 1);
      }
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 8)
      .map(([tag]) => tag);
  }, [sorted]);

  const visible = useMemo(
    () => sorted.filter((t) => tutorialMatches(t, query, activeTag)),
    [sorted, query, activeTag]
  );

  useDocumentHead({
    title: "Chalkboard — Interactive tutorials",
    description:
      "Interactive, math-first tutorials on statistics, causal inference, and the derivations that make them click.",
    path: "/chalkboard",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Chalkboard",
      url: `${SITE_URL}/chalkboard`,
      hasPart: sorted.map((t) => ({
        "@type": "LearningResource",
        name: t.title,
        url: `${SITE_URL}/chalkboard/${t.slug}`,
        description: t.description,
        datePublished: t.date,
        keywords: t.tags.join(", "),
      })),
    },
  });

  const filtered = query !== "" || activeTag !== null;

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <header className="mb-8 flex items-end justify-between gap-6 border-b border-slate-100 pb-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">
            Chalkboard
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Interactive, math-first tutorials on statistics, causal inference,
            and the derivations that make them click.
          </p>
        </div>
        <div className="hidden shrink-0 items-center gap-2 text-xs text-slate-400 sm:flex">
          <BookOpen className="h-3.5 w-3.5" />
          <span>
            {filtered
              ? `${visible.length} of ${sorted.length}`
              : `${sorted.length} ${sorted.length === 1 ? "tutorial" : "tutorials"}`}
          </span>
        </div>
      </header>

      {/* Search + tag filter row */}
      <div className="mb-8 flex flex-col gap-4">
        <div className="relative max-w-md">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
          <label htmlFor="chalkboard-search" className="sr-only">
            Search tutorials
          </label>
          <input
            id="chalkboard-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tutorials…"
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-9 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {topTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTag(null)}
              aria-pressed={activeTag === null}
              className={`rounded-full px-3 py-1 text-xs transition-colors ${
                activeTag === null
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All
            </button>
            {topTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() =>
                  setActiveTag((cur) => (cur === tag ? null : tag))
                }
                aria-pressed={activeTag === tag}
                className={`rounded-full px-3 py-1 text-xs transition-colors ${
                  activeTag === tag
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
          <p className="text-sm text-slate-500">
            No tutorials match{" "}
            {query ? (
              <>
                “
                <span className="text-slate-700">{query}</span>
                ”
              </>
            ) : (
              "your filter"
            )}
            .
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setActiveTag(null);
            }}
            className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-xs text-white transition-colors hover:bg-slate-700"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid auto-rows-fr gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((t, i) => {
            const extra = t.tags.length - MAX_VISIBLE_TAGS;
            return (
              <motion.div
                key={t.slug}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.4), duration: 0.3 }}
                className="h-full"
              >
                <Link
                  to={`/chalkboard/${t.slug}`}
                  className="group relative flex h-full flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus-visible:-translate-y-0.5 focus-visible:border-slate-300 focus-visible:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <time
                      className="font-mono text-[11px] uppercase tracking-wider text-slate-400"
                      dateTime={t.date}
                    >
                      {t.date}
                    </time>
                    <ArrowUpRight className="h-4 w-4 text-slate-300 transition-colors group-hover:text-slate-700 group-focus-visible:text-slate-700" />
                  </div>

                  <h2 className="mt-3 text-lg font-semibold leading-snug text-slate-900">
                    {t.title}
                  </h2>

                  <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-600">
                    {t.description}
                  </p>

                  <div className="flex-1" />

                  <div className="mt-5 space-y-3">
                    <div className="flex flex-wrap gap-1.5">
                      {t.tags.slice(0, MAX_VISIBLE_TAGS).map((tag) => (
                        <span
                          key={tag}
                          className={`rounded-full px-2 py-0.5 text-[11px] ${
                            activeTag === tag
                              ? "bg-slate-900 text-white"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {tag}
                        </span>
                      ))}
                      {extra > 0 && (
                        <span className="rounded-full px-2 py-0.5 text-[11px] text-slate-400">
                          +{extra}
                        </span>
                      )}
                    </div>
                    {t.source && (
                      <p className="text-[11px] text-slate-400">
                        Based on{" "}
                        <span className="text-slate-500">
                          {t.source.author}
                        </span>
                      </p>
                    )}
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
