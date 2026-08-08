import { Link } from "react-router-dom";

export default function PublicFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-6 py-8 text-sm sm:flex-row sm:justify-between">
        <span className="text-slate-500">© {new Date().getFullYear()} FarmFlo Simulation Studio</span>
        <nav className="flex items-center gap-6 text-slate-500">
          <Link to="/about" className="hover:text-slate-900">
            About
          </Link>
          <Link to="/privacy" className="hover:text-slate-900">
            Privacy
          </Link>
          <Link to="/contact" className="hover:text-slate-900">
            Contact
          </Link>
        </nav>
      </div>
    </footer>
  );
}
