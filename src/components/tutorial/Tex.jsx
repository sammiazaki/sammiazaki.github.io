import { useMemo } from "react";
import katex from "katex";

/**
 * Renders LaTeX math using KaTeX.
 * - `display` (default false): when true renders in display mode (centered, larger).
 * - `className`: additional classes on the wrapper span/div.
 */
export default function Tex({ children, display = false, className = "" }) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(children, {
        displayMode: display,
        throwOnError: false,
        strict: false,
      });
    } catch {
      return children;
    }
  }, [children, display]);

  if (display) {
    return (
      <div
        className={`overflow-x-auto py-2 ${className}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
