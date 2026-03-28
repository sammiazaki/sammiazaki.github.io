import { Link, Outlet } from "react-router-dom";
import { BarChart3 } from "lucide-react";

export default function BlogLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-white/80 backdrop-blur sticky top-0 z-50">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <BarChart3 className="h-5 w-5" />
            noodlelab
          </Link>
          <nav className="flex items-center gap-6 text-sm text-slate-600">
            <Link to="/" className="hover:text-slate-900 transition-colors">Tutorials</Link>
            <Link to="/about" className="hover:text-slate-900 transition-colors">About</Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t bg-white">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-6 py-8 text-sm text-slate-500">
          <span>noodlelab — noodle on ideas, learn by playing</span>
          <a
            href="https://sammiazaki.substack.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-slate-800 transition-colors"
          >
            Substack
          </a>
        </div>
      </footer>
    </div>
  );
}
