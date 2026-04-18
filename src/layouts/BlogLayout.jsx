import { Link, Outlet, useLocation } from "react-router-dom";

function NavLink({ to, children }) {
  const { pathname } = useLocation();
  const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
  return (
    <Link
      to={to}
      className={`transition-colors ${active ? "text-slate-900 font-medium" : "text-slate-500 hover:text-slate-900"}`}
    >
      {children}
    </Link>
  );
}

export default function BlogLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-white/80 backdrop-blur sticky top-0 z-50">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-6 py-4">
          <Link to="/" className="text-lg font-semibold tracking-tight">
            Sam Miazaki
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <NavLink to="/chalkboard">Chalkboard</NavLink>
            <a
              href="/notebooks/"
              className="text-slate-500 hover:text-slate-900 transition-colors"
            >
              Workbench
            </a>
            <NavLink to="/about">AboutMe</NavLink>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t bg-white">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-6 py-8 text-sm text-slate-500">
          <span>Sam Miazaki</span>
          <div className="flex gap-4">
            <a href="https://github.com/sammiazaki" target="_blank" rel="noopener noreferrer" className="hover:text-slate-800 transition-colors">GitHub</a>
            <a href="https://www.linkedin.com/in/sajad-mirzababaei/" target="_blank" rel="noopener noreferrer" className="hover:text-slate-800 transition-colors">LinkedIn</a>
            <a href="https://sammiazaki.substack.com" target="_blank" rel="noopener noreferrer" className="hover:text-slate-800 transition-colors">Substack</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
