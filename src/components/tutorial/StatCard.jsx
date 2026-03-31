import { useMemo } from "react";
import katex from "katex";

export default function StatCard({ label, value, formula, className = "" }) {
  const formulaHtml = useMemo(() => {
    if (!formula) return null;
    try {
      return katex.renderToString(formula, {
        displayMode: false,
        throwOnError: false,
        strict: false,
      });
    } catch {
      return formula;
    }
  }, [formula]);

  return (
    <div className={`rounded-lg border p-4 overflow-visible ${className}`}>
      {formula ? (
        <div className="relative group/stat inline-block">
          <div className="text-slate-500 cursor-help border-b border-dashed border-slate-300">
            {label}
          </div>
          <div
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-md bg-slate-800 whitespace-nowrap opacity-0 pointer-events-none group-hover/stat:opacity-100 transition-opacity duration-150 z-[100] [&_.katex]:text-white [&_.katex]:text-sm"
            dangerouslySetInnerHTML={{ __html: formulaHtml }}
          />
        </div>
      ) : (
        <div className="text-slate-500">{label}</div>
      )}
      <div className="font-mono mt-1">{value}</div>
    </div>
  );
}
