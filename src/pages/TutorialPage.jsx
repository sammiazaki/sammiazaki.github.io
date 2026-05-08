import { Suspense, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import tutorials, { getTutorial } from "@/tutorials/registry";
import { ArrowLeft, ArrowRight, ExternalLink } from "lucide-react";
import { useDocumentHead, SITE_URL } from "@/lib/seo";

function useNeighbors(slug) {
  return useMemo(() => {
    const sorted = [...tutorials].sort((a, b) => b.date.localeCompare(a.date));
    const i = sorted.findIndex((t) => t.slug === slug);
    if (i === -1) return { prev: null, next: null };
    return {
      prev: i > 0 ? sorted[i - 1] : null,
      next: i < sorted.length - 1 ? sorted[i + 1] : null,
    };
  }, [slug]);
}

export default function TutorialPage() {
  const { slug } = useParams();
  const tutorial = getTutorial(slug);
  const { prev, next } = useNeighbors(slug);

  useDocumentHead(
    tutorial
      ? {
          title: tutorial.title,
          description: tutorial.description,
          path: `/chalkboard/${tutorial.slug}`,
          type: "article",
          jsonLd: {
            "@context": "https://schema.org",
            "@type": "LearningResource",
            headline: tutorial.title,
            name: tutorial.title,
            description: tutorial.description,
            url: `${SITE_URL}/chalkboard/${tutorial.slug}`,
            datePublished: tutorial.date,
            dateModified: tutorial.date,
            keywords: tutorial.tags.join(", "),
            inLanguage: "en",
            author: { "@type": "Person", name: "Sam Miazaki", url: SITE_URL },
            publisher: { "@type": "Person", name: "Sam Miazaki", url: SITE_URL },
            image: `${SITE_URL}/avatar.png`,
            mainEntityOfPage: `${SITE_URL}/chalkboard/${tutorial.slug}`,
            ...(tutorial.source && {
              isBasedOn: {
                "@type": "CreativeWork",
                name: tutorial.source.title,
                author: { "@type": "Person", name: tutorial.source.author },
                url: tutorial.source.url,
              },
            }),
          },
        }
      : {
          title: "Tutorial not found",
          description: "The tutorial you're looking for doesn't exist.",
          path: `/chalkboard/${slug || ""}`,
          noindex: true,
        }
  );

  if (!tutorial) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-20 text-center">
        <h1 className="text-2xl font-semibold">Tutorial not found</h1>
        <p className="mt-2 text-sm text-slate-500">
          The tutorial{" "}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[12px] text-slate-700">
            {slug}
          </code>{" "}
          doesn't exist (yet).
        </p>
        <Link
          to="/chalkboard"
          className="mt-6 inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-900"
        >
          <ArrowLeft size={14} />
          Back to Chalkboard
        </Link>
      </div>
    );
  }

  const Component = tutorial.component;

  return (
    <div>
      {/* Breadcrumb / back link, sticks just below the global nav */}
      <div className="border-b border-slate-100 bg-white/70 backdrop-blur">
        <nav
          aria-label="Breadcrumb"
          className="mx-auto flex max-w-6xl items-center gap-2 px-6 py-3 text-xs text-slate-500"
        >
          <Link
            to="/chalkboard"
            className="inline-flex items-center gap-1 rounded-sm transition-colors hover:text-slate-800"
          >
            <ArrowLeft size={12} aria-hidden />
            Chalkboard
          </Link>
          <span className="text-slate-300" aria-hidden>
            /
          </span>
          <span className="truncate text-slate-700" title={tutorial.title}>
            {tutorial.title}
          </span>
        </nav>
      </div>

      <Suspense
        fallback={
          <div className="mx-auto max-w-6xl px-6 py-20 text-center text-slate-400">
            Loading…
          </div>
        }
      >
        <Component />
      </Suspense>

      {/* Footer area: source + prev/next */}
      <div className="mx-auto max-w-6xl px-6 pb-16">
        {tutorial.source && (
          <div className="mt-10 border-t border-slate-100 pt-6 text-sm text-slate-500">
            Based on{" "}
            <a
              href={tutorial.source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-slate-700 underline underline-offset-2 hover:text-slate-900"
            >
              {tutorial.source.title}
              <ExternalLink className="h-3 w-3" />
            </a>{" "}
            by {tutorial.source.author}
          </div>
        )}

        {(prev || next) && (
          <nav
            aria-label="Tutorial navigation"
            className="mt-8 grid gap-3 border-t border-slate-100 pt-6 sm:grid-cols-2"
          >
            {prev ? (
              <Link
                to={`/chalkboard/${prev.slug}`}
                className="group flex flex-col rounded-xl border border-slate-200 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm"
              >
                <span className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-slate-400">
                  <ArrowLeft size={11} aria-hidden /> Previous
                </span>
                <span className="mt-1 text-sm font-medium text-slate-800 group-hover:text-slate-900">
                  {prev.title}
                </span>
              </Link>
            ) : (
              <div />
            )}
            {next ? (
              <Link
                to={`/chalkboard/${next.slug}`}
                className="group flex flex-col rounded-xl border border-slate-200 bg-white p-4 text-right transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm sm:items-end"
              >
                <span className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-slate-400">
                  Next <ArrowRight size={11} aria-hidden />
                </span>
                <span className="mt-1 text-sm font-medium text-slate-800 group-hover:text-slate-900">
                  {next.title}
                </span>
              </Link>
            ) : (
              <div />
            )}
          </nav>
        )}
      </div>
    </div>
  );
}
