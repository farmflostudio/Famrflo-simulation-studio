import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import Card from "../components/Card";
import api from "../lib/api";

function formatDate(value) {
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function EmptyRow({ label }) {
  return <p className="text-xs text-slate-400">{label}</p>;
}

function FarmHistoryCard({ entry }) {
  const { farm, simulations, predictions, schedules } = entry;

  return (
    <Card title={farm.name} subtitle={farm.location?.label || "Unlabelled location"}>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Simulations</h3>
          <ul className="mt-2 space-y-2">
            {simulations.length === 0 && <EmptyRow label="No simulations yet" />}
            {simulations.map((run) => (
              <li key={run._id} className="text-sm text-slate-600">
                <span className="font-medium text-slate-800">{run.startDate}</span> to {run.endDate}
                <span className="block text-xs text-slate-400">{formatDate(run.createdAt)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Predictions</h3>
          <ul className="mt-2 space-y-2">
            {predictions.length === 0 && <EmptyRow label="No predictions yet" />}
            {predictions.map((prediction) => (
              <li key={prediction._id} className="text-sm text-slate-600">
                <span className="font-medium text-slate-800">{prediction.defaultPrediction?.toFixed(1)}%</span> on{" "}
                {prediction.targetDate}
                <span className="block text-xs text-slate-400">{formatDate(prediction.createdAt)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Schedules</h3>
          <ul className="mt-2 space-y-2">
            {schedules.length === 0 && <EmptyRow label="No schedules yet" />}
            {schedules.map((schedule) => (
              <li key={schedule._id} className="text-sm text-slate-600">
                <span className="font-medium text-slate-800">{schedule.recommended?.totalWaterMm.toFixed(1)} mm</span>{" "}
                over {schedule.horizonDays} days
                <span className="block text-xs text-slate-400">{formatDate(schedule.createdAt)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}

export default function History() {
  const [history, setHistory] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/history")
      .then(({ data }) => setHistory(data.history))
      .catch((err) => setError(err.response?.data?.error || "Could not load history"));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="mx-auto max-w-6xl px-6 py-8">
        <h1 className="text-xl font-semibold text-slate-900">History</h1>
        <p className="mt-1 text-sm text-slate-500">Past farms, simulations, predictions, and schedules.</p>

        {error && <p className="mt-6 text-sm text-red-600">{error}</p>}

        {history === null && !error && <p className="mt-6 text-sm text-slate-400">Loading…</p>}

        {history !== null && history.length === 0 && (
          <Card className="mt-6">
            <p className="text-sm text-slate-500">No farms yet. Set one up to start building history.</p>
          </Card>
        )}

        <div className="mt-6 space-y-6">
          {history?.map((entry) => (
            <FarmHistoryCard key={entry.farm._id} entry={entry} />
          ))}
        </div>
      </main>
    </div>
  );
}
