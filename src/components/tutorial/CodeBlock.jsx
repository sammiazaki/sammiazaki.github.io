import { useState, useMemo } from "react";

/* ------------------------------------------------------------------ */
/*  Minimal Python tokenizer — splits source into typed spans          */
/* ------------------------------------------------------------------ */

const KEYWORDS = new Set([
  "from","import","def","return","for","in","if","else","elif","print",
  "True","False","None","as","not","and","or","with","class","lambda",
  "yield","raise","try","except","finally","while","break","continue",
  "pass","del","assert","global","nonlocal",
]);

const BUILTINS = new Set([
  "sum","len","range","enumerate","zip","map","filter","sorted",
  "list","dict","set","tuple","int","float","str","bool","type",
  "isinstance","round","abs","min","max","np","pd","np.array",
  "result","analysis",
]);

function tokenize(src) {
  const tokens = [];
  let i = 0;
  while (i < src.length) {
    // Comments
    if (src[i] === "#") {
      let end = src.indexOf("\n", i);
      if (end === -1) end = src.length;
      tokens.push({ type: "comment", value: src.slice(i, end) });
      i = end;
      continue;
    }
    // Strings (single/double, including f-strings)
    if (
      src[i] === '"' || src[i] === "'" ||
      (src[i] === "f" && (src[i + 1] === '"' || src[i + 1] === "'"))
    ) {
      const fStr = src[i] === "f";
      const start = i;
      if (fStr) i++;
      const quote = src.substr(i, 3) === '"""' || src.substr(i, 3) === "'''"
        ? src.substr(i, 3) : src[i];
      i += quote.length;
      while (i < src.length) {
        if (src[i] === "\\" ) { i += 2; continue; }
        if (src.substr(i, quote.length) === quote) { i += quote.length; break; }
        i++;
      }
      tokens.push({ type: "string", value: src.slice(start, i) });
      continue;
    }
    // Numbers
    if (/\d/.test(src[i]) && (i === 0 || !/\w/.test(src[i - 1]))) {
      const start = i;
      while (i < src.length && /[\d.e+\-]/.test(src[i])) i++;
      tokens.push({ type: "number", value: src.slice(start, i) });
      continue;
    }
    // Words (identifiers / keywords)
    if (/[a-zA-Z_]/.test(src[i])) {
      const start = i;
      while (i < src.length && /\w/.test(src[i])) i++;
      const word = src.slice(start, i);
      if (KEYWORDS.has(word)) tokens.push({ type: "keyword", value: word });
      else if (BUILTINS.has(word)) tokens.push({ type: "builtin", value: word });
      else tokens.push({ type: "ident", value: word });
      continue;
    }
    // Operators and punctuation
    tokens.push({ type: "punct", value: src[i] });
    i++;
  }
  return tokens;
}

const TOKEN_COLORS = {
  keyword:  "text-purple-600",
  builtin:  "text-blue-600",
  string:   "text-green-700",
  number:   "text-orange-600",
  comment:  "text-slate-400 italic",
  ident:    "text-slate-800",
  punct:    "text-slate-500",
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function CodeBlock({ code, language = "python" }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const lines = useMemo(() => {
    const tokens = tokenize(code);
    // Split tokens into lines
    const result = [[]];
    for (const tok of tokens) {
      const parts = tok.value.split("\n");
      parts.forEach((part, pi) => {
        if (pi > 0) result.push([]);
        if (part) result[result.length - 1].push({ ...tok, value: part });
      });
    }
    return result;
  }, [code]);

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-slate-50 border-b border-slate-200">
        <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
          {language}
        </span>
        <button
          onClick={copy}
          className="text-[10px] text-slate-400 hover:text-slate-600 transition-colors"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      {/* Code */}
      <div className="overflow-x-auto">
        <table className="w-full text-[13px] leading-6 font-mono">
          <tbody>
            {lines.map((lineTokens, li) => (
              <tr key={li} className="hover:bg-slate-50/60">
                <td className="select-none text-right pr-4 pl-4 text-slate-300 w-[1%] whitespace-nowrap">
                  {li + 1}
                </td>
                <td className="pr-4">
                  {lineTokens.length === 0 ? (
                    <span>{"\u00A0"}</span>
                  ) : (
                    lineTokens.map((tok, ti) => (
                      <span key={ti} className={TOKEN_COLORS[tok.type] || ""}>
                        {tok.value}
                      </span>
                    ))
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
