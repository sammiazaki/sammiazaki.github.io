import { useMemo } from "react";
import katex from "katex";

/**
 * Renders LaTeX math using KaTeX.
 * - `display` (default false): when true renders in display mode (centered, larger).
 * - `className`: additional classes on the wrapper span/div.
 */
export default function Tex({ children, math, display = false, block = false, className = "" }) {
  const source = math ?? children;
  const isDisplay = display || block;
  const html = useMemo(() => {
    try {
      return katex.renderToString(source, {
        displayMode: isDisplay,
        throwOnError: false,
        strict: false,
      });
    } catch {
      return source;
    }
  }, [source, isDisplay]);

  if (isDisplay) {
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
