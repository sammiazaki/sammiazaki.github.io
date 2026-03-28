import { Link } from "react-router-dom";
import { motion } from "framer-motion";

export default function Home() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-20">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-4xl font-bold tracking-tight">Hi, I'm Sam.</h1>

        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          <Link
            to="/noodlelab"
            className="group rounded-xl border bg-white p-6 shadow-sm transition hover:shadow-md hover:border-slate-300"
          >
            <div className="text-xl font-semibold group-hover:text-slate-700">
              Noodlelab
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Interactive tutorials.
            </p>
          </Link>
          <a
            href="https://sammiazaki.substack.com"
            target="_blank"
            rel="noopener noreferrer"
            className="group rounded-xl border bg-white p-6 shadow-sm transition hover:shadow-md hover:border-slate-300"
          >
            <div className="text-xl font-semibold group-hover:text-slate-700">
              Writing
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Personal reflections on Substack.
            </p>
          </a>
        </div>
      </motion.div>
    </div>
  );
}
