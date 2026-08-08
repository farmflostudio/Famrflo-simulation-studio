import PublicHeader from "../components/PublicHeader";
import PublicFooter from "../components/PublicFooter";

export default function About() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <PublicHeader />

      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <h1 className="text-3xl font-semibold text-slate-900">About FarmFlo</h1>
          <p className="mt-6 text-sm leading-relaxed text-slate-600">
            FarmFlo Simulation Studio is a smart irrigation scheduling platform for virtual UK
            farms. Describe a farm in plain language and the system builds a realistic simulated
            environment for it, predicts soil moisture with machine learning, plans irrigation
            with an optimisation based decision engine, and explains the plan in plain language.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-slate-600">
            Every simulation is calibrated against real, publicly available data, including the
            COSMOS UK soil moisture monitoring network, NASA POWER agroclimatology data, and the
            Open-Meteo historical weather API, so results stay grounded in observed conditions
            rather than pure invention.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-slate-600">
            Soil moisture is predicted using three trained models, Random Forest, XGBoost, and an
            LSTM network, compared side by side so the most accurate one drives the irrigation
            schedule shown on your dashboard.
          </p>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
