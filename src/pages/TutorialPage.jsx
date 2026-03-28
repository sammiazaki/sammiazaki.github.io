import { Suspense } from "react";
import { useParams, Link } from "react-router-dom";
import { getTutorial } from "@/tutorials/registry";
import { ArrowLeft, ExternalLink } from "lucide-react";

export default function TutorialPage() {
  const { slug } = useParams();
  const tutorial = getTutorial(slug);

  if (!tutorial) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-20 text-center">
        <h1 className="text-2xl font-semibold">Tutorial not found</h1>
        <Link to="/" className="mt-4 inline-block text-sm text-slate-500 hover:text-slate-800">
          Back to tutorials
        </Link>
      </div>
    );
  }

  const Component = tutorial.component;

  return (
    <div>
      <div className="mx-auto max-w-6xl px-6 pt-6">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          All tutorials
        </Link>
      </div>
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
