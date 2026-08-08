import { Link } from "react-router-dom";
import PublicHeader from "../components/PublicHeader";
import PublicFooter from "../components/PublicFooter";

export default function Privacy() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <PublicHeader />

      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <h1 className="text-3xl font-semibold text-slate-900">Privacy</h1>
          <p className="mt-6 text-sm leading-relaxed text-slate-600">
            FarmFlo stores no personal data beyond what account login requires, such as your
            email address. Farms, simulations, and irrigation schedules are built from the farm
            descriptions you provide, together with synthetic data and public reference data from
            sources like COSMOS UK, NASA POWER, and Open-Meteo, not from any personal
            information.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-slate-600">
            Passwords are never stored in plain text, and access to your data is protected by
            authenticated, per account API endpoints.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-slate-600">
            You can stop using the service at any time. If you would like your account data
            removed, reach out through the{" "}
            <Link to="/contact" className="font-medium text-emerald-600 hover:text-emerald-700">
              contact page
            </Link>
            .
          </p>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
