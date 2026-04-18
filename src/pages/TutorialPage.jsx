import { Suspense } from "react";
import { useParams, Link } from "react-router-dom";
import { getTutorial } from "@/tutorials/registry";
import { ExternalLink } from "lucide-react";
import { useDocumentHead, SITE_URL } from "@/lib/seo";

export default function TutorialPage() {
  const { slug } = useParams();
  const tutorial = getTutorial(slug);

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
            author: { "@type": "Person", "name": "Sam Miazaki", "url": SITE_URL },
            publisher: { "@type": "Person", "name": "Sam Miazaki", "url": SITE_URL },
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
        }
  );

  if (!tutorial) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-20 text-center">
        <h1 className="text-2xl font-semibold">Tutorial not found</h1>
        <Link to="/chalkboard" className="mt-4 inline-block text-sm text-slate-500 hover:text-slate-800">
          Back to Chalkboard
        </Link>
      </div>
    );
  }

  const Component = tutorial.component;

  return (
    <div>
      <Suspense
        fallback={
          <div className="mx-auto max-w-6xl px-6 py-20 text-center text-slate-400">Loading...</div>
        }
      >
        <Component />
      </Suspense>
      {tutorial.source && (
        <div className="mx-auto max-w-6xl px-6 py-8 border-t mt-6">
          <div className="text-sm text-slate-500">
            Based on{" "}
            <a
              href={tutorial.source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-slate-700 underline underline-offset-2 hover:text-slate-900"
            >
              {tutorial.source.title}
              <ExternalLink className="h-3 w-3" />
            </a>
            {" "}by {tutorial.source.author}
          </div>
        </div>
      )}
    </div>
  );
}
