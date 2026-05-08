import { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { Menu, X, ExternalLink } from "lucide-react";

function NavLink({ to, children, onClick }) {
  const { pathname } = useLocation();
  const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
  return (
    <Link
      to={to}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`relative transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 ${
        active
          ? "text-slate-900 font-medium"
          : "text-slate-500 hover:text-slate-900"
      }`}
    >
      {children}
      {active && (
        <span className="pointer-events-none absolute -bottom-[19px] left-0 right-0 hidden h-[2px] bg-slate-900 sm:block" />
      )}
    </Link>
  );
}

export default function BlogLayout() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  // Close the mobile menu on route change.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen flex flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-slate-900 focus:px-3 focus:py-2 focus:text-sm focus:text-white"
      >
        Skip to content
      </a>

      <header className="border-b bg-white/80 backdrop-blur sticky top-0 z-50">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-6 py-4">
          <Link
            to="/"
            className="rounded-sm text-lg font-semibold tracking-tight transition-colors hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
          >
            Sam Miazaki
          </Link>

          <nav
            className="hidden items-center gap-7 text-sm sm:flex"
            aria-label="Primary"
          >
            <NavLink to="/chalkboard">Chalkboard</NavLink>
            <a
              href="/notebooks/"
              className="inline-flex items-center gap-1 rounded-sm text-slate-500 transition-colors hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
            >
              Workbench
              <ExternalLink size={11} className="text-slate-300" aria-hidden />
            </a>
            <NavLink to="/about">AboutMe</NavLink>
          </nav>

          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 sm:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close navigation" : "Open navigation"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {open && (
          <nav
            id="mobile-nav"
            aria-label="Primary mobile"
            className="border-t bg-white px-6 py-3 text-sm sm:hidden"
          >
            <ul className="flex flex-col gap-1">
              <li>
                <NavLink to="/chalkboard" onClick={() => setOpen(false)}>
                  <span className="block py-2">Chalkboard</span>
                </NavLink>
              </li>
              <li>
                <a
                  href="/notebooks/"
                  className="flex items-center gap-1 py-2 text-slate-500 hover:text-slate-900"
                >
                  Workbench
                  <ExternalLink size={11} className="text-slate-300" aria-hidden />
                </a>
              </li>
              <li>
                <NavLink to="/about" onClick={() => setOpen(false)}>
                  <span className="block py-2">AboutMe</span>
                </NavLink>
              </li>
            </ul>
          </nav>
        )}
      </header>

      <main id="main" className="flex-1" tabIndex={-1}>
        <Outlet />
      </main>

      <footer className="border-t bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>
            © {new Date().getFullYear()} Sam Miazaki
          </span>
          <div className="flex gap-4">
            <a
              href="https://github.com/sammiazaki"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-sm transition-colors hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
            >
              GitHub
            </a>
            <a
              href="https://www.linkedin.com/in/sajad-mirzababaei/"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-sm transition-colors hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
            >
              LinkedIn
            </a>
            <a
              href="https://sammiazaki.substack.com"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-sm transition-colors hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
            >
              Substack
            </a>
            <a
              href="/sitemap.xml"
              className="rounded-sm transition-colors hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
            >
              Sitemap
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
