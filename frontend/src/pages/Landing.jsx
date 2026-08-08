import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import PublicHeader from "../components/PublicHeader";
import PublicFooter from "../components/PublicFooter";

const FEATURES = [
  {
    title: "Describe your farm in plain language",
    description:
      "Tell FarmFlo where your farm is and what it grows. It builds a realistic simulated environment from that description, no spreadsheets required.",
  },
  {
    title: "Grounded in real UK data",
    description:
      "Every simulation is calibrated against COSMOS UK soil moisture monitoring, NASA POWER, and Open-Meteo weather records, not invented numbers.",
  },
  {
    title: "Machine learning soil moisture prediction",
    description:
      "Random Forest, XGBoost, and LSTM models are trained and compared side by side, so the most accurate one drives your schedule.",
  },
  {
    title: "Plans you can explain to anyone",
    description:
      "The optimisation engine builds an irrigation schedule and explains it in plain language, checked against the real numbers before you see it.",
  },
];

const STEPS = [
  {
    step: "1",
    title: "Describe",
    description: "Write a short plain language description of your farm and its conditions.",
  },
  {
    step: "2",
    title: "Simulate & predict",
    description: "FarmFlo builds a calibrated environment and predicts soil moisture over time.",
  },
  {
    step: "3",
    title: "Irrigate",
    description: "Get a recommended schedule with a plain language explanation of the plan.",
  },
];

export default function Landing() {
  const { status } = useAuth();
  const isAuthenticated = status === "authenticated";

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <PublicHeader />

      <main className="flex-1">
        <section className="mx-auto max-w-4xl px-6 pt-20 pb-16 text-center">
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
            Smart irrigation for UK farms
          </span>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
            Know exactly when and how much to irrigate
          </h1>
          <p className="mt-5 text-lg text-slate-600">
            FarmFlo Simulation Studio turns a plain language description of your farm into a
            calibrated simulation, a machine learning soil moisture forecast, and an irrigation
            plan you can trust.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link
              to={isAuthenticated ? "/farms/new" : "/register"}
              className="rounded-md bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
            >
              {isAuthenticated ? "Add a farm" : "Get started free"}
            </Link>
            {!isAuthenticated && (
              <Link
                to="/login"
                className="rounded-md border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-white"
              >
                Sign in
              </Link>
            )}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-16">
          <div className="grid gap-6 sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <h2 className="text-base font-semibold text-slate-900">{feature.title}</h2>
                <p className="mt-2 text-sm text-slate-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-y border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <h2 className="text-center text-2xl font-semibold text-slate-900">How it works</h2>
            <div className="mt-10 grid gap-8 sm:grid-cols-3">
              {STEPS.map((item) => (
                <div key={item.step} className="text-center">
                  <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-sm font-semibold text-white">
                    {item.step}
                  </span>
                  <h3 className="mt-4 text-base font-semibold text-slate-900">{item.title}</h3>
                  <p className="mt-2 text-sm text-slate-600">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-6 py-16 text-center">
          <h2 className="text-2xl font-semibold text-slate-900">
            Ready to see your farm's irrigation plan?
          </h2>
          <p className="mt-3 text-slate-600">
            No credit card, no spreadsheets. Just a description of your farm and a few minutes.
          </p>
          <div className="mt-6">
            <Link
              to={isAuthenticated ? "/dashboard" : "/register"}
              className="inline-block rounded-md bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
            >
              {isAuthenticated ? "Go to dashboard" : "Create your account"}
            </Link>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
