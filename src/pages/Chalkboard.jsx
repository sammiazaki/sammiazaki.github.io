import { Link } from "react-router-dom";
import tutorials from "@/tutorials/registry";
import { motion } from "framer-motion";
import { BookOpen, ArrowUpRight } from "lucide-react";
import { useDocumentHead, SITE_URL } from "@/lib/seo";

const MAX_VISIBLE_TAGS = 4;

export default function Chalkboard() {
  const sorted = [...tutorials].sort((a, b) => b.date.localeCompare(a.date));

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

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <header className="mb-10 flex items-end justify-between gap-6 border-b border-slate-100 pb-6">
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
            {sorted.length} {sorted.length === 1 ? "tutorial" : "tutorials"}
          </span>
        </div>
      </header>

      <div className="grid auto-rows-fr gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((t, i) => {
          const extra = t.tags.length - MAX_VISIBLE_TAGS;
          return (
            <motion.div
              key={t.slug}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.3 }}
              className="h-full"
            >
              <Link
                to={`/chalkboard/${t.slug}`}
                className="group relative flex h-full flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
              >
                {/* Top row — date + arrow */}
                <div className="flex items-center justify-between">
                  <time className="font-mono text-[11px] uppercase tracking-wider text-slate-400">
                    {t.date}
                  </time>
                  <ArrowUpRight className="h-4 w-4 text-slate-300 transition-colors group-hover:text-slate-700" />
                </div>

                {/* Title */}
                <h2 className="mt-3 text-lg font-semibold leading-snug text-slate-900 transition-colors group-hover:text-slate-700">
                  {t.title}
                </h2>

                {/* Description — clamped to keep cards uniform */}
                <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-600">
                  {t.description}
                </p>

                {/* Spacer — pushes footer to the bottom so all cards align */}
                <div className="flex-1" />

                {/* Footer — tags + source attribution */}
                <div className="mt-5 space-y-3">
                  <div className="flex flex-wrap gap-1.5">
                    {t.tags.slice(0, MAX_VISIBLE_TAGS).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600"
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
                      <span className="text-slate-500">{t.source.author}</span>
                    </p>
                  )}
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
