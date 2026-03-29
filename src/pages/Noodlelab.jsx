import { Link } from "react-router-dom";
import tutorials from "@/tutorials/registry";
import { motion } from "framer-motion";

export default function Noodlelab() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-12">
        <h1 className="text-4xl font-bold tracking-tight">Noodlelab</h1>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[...tutorials].sort((a, b) => b.date.localeCompare(a.date)).map((t, i) => (
          <motion.div
            key={t.slug}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Link
              to={`/noodlelab/${t.slug}`}
              className="group block rounded-xl border bg-white p-6 shadow-sm transition hover:shadow-md hover:border-slate-300"
            >
              <div className="text-xs text-slate-400 font-mono">{t.date}</div>
              <h2 className="mt-2 text-xl font-semibold group-hover:text-slate-700 transition-colors">
                {t.title}
              </h2>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                {t.description}
              </p>
              {t.source && (
                <div className="mt-3 text-xs text-slate-400">
                  Based on {t.source.author}
                </div>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {t.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
