import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, Compass } from "lucide-react";
import { useDocumentHead } from "@/lib/seo";

export default function NotFound() {
  const { pathname } = useLocation();

  useDocumentHead({
    title: "Page not found",
    description: "The page you're looking for doesn't exist.",
    path: pathname,
    noindex: true,
  });

  return (
    <div className="mx-auto max-w-xl px-6 py-24 text-center">
      <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
        <Compass size={20} />
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">
        Page not found
      </h1>
      <p className="mt-3 text-sm text-slate-500">
        Nothing lives at{" "}
        <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[12px] text-slate-700">
          {pathname}
        </code>
        . The link may have moved, or it never existed.
      </p>
      <div className="mt-8 flex items-center justify-center gap-3 text-sm">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-900"
        >
          <ArrowLeft size={14} />
          Home
        </Link>
        <Link
          to="/chalkboard"
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-white transition-colors hover:bg-slate-700"
        >
          Browse the Chalkboard
        </Link>
      </div>
    </div>
  );
}
