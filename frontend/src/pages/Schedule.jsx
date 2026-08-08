import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import Card from "../components/Card";
import MoistureChart from "../components/MoistureChart";
import IrrigationChart from "../components/IrrigationChart";
import SchedulePlanTable from "../components/SchedulePlanTable";
import ExplanationCard from "../components/ExplanationCard";
import BaselineComparisonTable from "../components/BaselineComparisonTable";
import api from "../lib/api";

const HORIZON_OPTIONS = [3, 7, 14];

export default function Schedule() {
  const [farms, setFarms] = useState(null);
  const [selectedFarmId, setSelectedFarmId] = useState("");
  const [horizonDays, setHorizonDays] = useState(7);
  const [schedule, setSchedule] = useState({ status: "idle", data: null, error: "" });

  useEffect(() => {
    api.get("/farms").then(({ data }) => {
      setFarms(data.farms);
      if (data.farms.length > 0) setSelectedFarmId(data.farms[0]._id);
    });
  }, []);

  async function handleGenerate() {
    if (!selectedFarmId) return;

    setSchedule({ status: "loading", data: null, error: "" });
    try {
      const { data } = await api.post(`/farms/${selectedFarmId}/schedules`, { horizonDays });
      setSchedule({ status: "ready", data: data.schedule, error: "" });
    } catch (err) {
      setSchedule({
        status: "error",
        data: null,
        error: err.response?.data?.error || "Could not generate a schedule",
      });
    }
  }

  if (farms === null) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <main className="mx-auto max-w-6xl px-6 py-10">
          <p className="text-sm text-slate-500">Loading your farms…</p>
        </main>
      </div>
    );
  }

  if (farms.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <main className="mx-auto max-w-2xl px-6 py-16">
          <Card>
            <h1 className="text-lg font-semibold text-slate-900">No farms yet</h1>
            <p className="mt-2 text-sm text-slate-500">Set up a farm first to generate an irrigation schedule.</p>
          </Card>
        </main>
      </div>
    );
  }

  const selectedFarm = farms.find((farm) => farm._id === selectedFarmId);
  const moistureSeries = schedule.data?.recommended?.plan.map((entry) => ({
    date: entry.date,
    vwc: entry.predictedVwc,
  }));

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Irrigation schedule</h1>
            <p className="text-sm text-slate-500">
              An optimised plan compared against three baseline strategies, with a plain language explanation.
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            {farms.length > 1 && (
              <div>
                <label htmlFor="farmSelect" className="block text-xs font-medium text-slate-500">
                  Farm
                </label>
                <select
                  id="farmSelect"
                  value={selectedFarmId}
                  onChange={(event) => setSelectedFarmId(event.target.value)}
                  className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {farms.map((farm) => (
                    <option key={farm._id} value={farm._id}>
                      {farm.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label htmlFor="horizonSelect" className="block text-xs font-medium text-slate-500">
                Planning horizon
              </label>
              <select
                id="horizonSelect"
                value={horizonDays}
                onChange={(event) => setHorizonDays(Number(event.target.value))}
                className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                {HORIZON_OPTIONS.map((days) => (
                  <option key={days} value={days}>
                    {days} days
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={schedule.status === "loading"}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {schedule.status === "loading" ? "Generating…" : "Generate schedule"}
            </button>
          </div>
        </div>

        <p role="status" aria-live="polite" className="sr-only">
          {schedule.status === "loading" && "Generating schedule"}
          {schedule.status === "ready" && "Schedule generated"}
          {schedule.status === "error" && schedule.error}
        </p>

        {schedule.status === "error" && (
          <p className="mt-6 text-sm text-red-600">{schedule.error}</p>
        )}

        {schedule.status === "idle" && (
          <p className="mt-6 text-sm text-slate-500">
            Choose a farm and horizon, then generate a schedule for {selectedFarm?.name}.
          </p>
        )}

        {schedule.status === "ready" && schedule.data && (
          <>
            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
              <Card
                title="Recommended irrigation"
                subtitle={`${schedule.data.horizonDays} day plan, reference site ${schedule.data.referenceSite}`}
                className="lg:col-span-2"
              >
                <IrrigationChart plan={schedule.data.recommended.plan} />
                <div className="mt-4">
                  <MoistureChart series={moistureSeries} />
                </div>
                <SchedulePlanTable plan={schedule.data.recommended.plan} />
              </Card>

              <Card title="Plain language explanation">
                <ExplanationCard
                  explanation={schedule.data.explanation}
                  source={schedule.data.explanationSource}
                  guardrailPassed={schedule.data.guardrailPassed}
                />
              </Card>
            </div>

            <Card title="Compare strategies" subtitle="Recommended engine vs the three baselines" className="mt-6">
              <BaselineComparisonTable
                recommended={schedule.data.recommended}
                baselines={schedule.data.baselines}
              />
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
