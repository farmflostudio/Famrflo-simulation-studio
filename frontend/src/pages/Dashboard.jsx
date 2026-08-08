import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Card from "../components/Card";
import MoistureChart from "../components/MoistureChart";
import PredictionComparison from "../components/PredictionComparison";
import ModelMetricsTable from "../components/ModelMetricsTable";
import StatusBadge, { moistureStatus } from "../components/StatusBadge";
import api from "../lib/api";
import { recentRange } from "../lib/dateRange";

export default function Dashboard() {
  const [farms, setFarms] = useState(null);
  const [selectedFarmId, setSelectedFarmId] = useState("");
  const [simulation, setSimulation] = useState({ status: "idle", data: null, error: "" });
  const [prediction, setPrediction] = useState({ status: "idle", data: null, error: "" });
  const [models, setModels] = useState(null);

  useEffect(() => {
    api.get("/farms").then(({ data }) => {
      setFarms(data.farms);
      if (data.farms.length > 0) setSelectedFarmId(data.farms[0]._id);
    });
    api.get("/models").then(({ data }) => setModels(data));
  }, []);

  useEffect(() => {
    if (!selectedFarmId) return;

    const { startDate, endDate } = recentRange(30);

    setSimulation({ status: "loading", data: null, error: "" });
    api
      .post(`/farms/${selectedFarmId}/simulations`, { startDate, endDate })
      .then(({ data }) => setSimulation({ status: "ready", data: data.simulationRun, error: "" }))
      .catch((err) =>
        setSimulation({ status: "error", data: null, error: err.response?.data?.error || "Could not run the simulation" })
      );

    setPrediction({ status: "loading", data: null, error: "" });
    api
      .post(`/farms/${selectedFarmId}/predictions`, {})
      .then(({ data }) => setPrediction({ status: "ready", data: data.prediction, error: "" }))
      .catch((err) =>
        setPrediction({ status: "error", data: null, error: err.response?.data?.error || "Could not get a prediction" })
      );
  }, [selectedFarmId]);

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
            <p className="mt-2 text-sm text-slate-500">
              Set up your first farm to see soil moisture trends and predictions.
            </p>
            <Link
              to="/farms/new"
              className="mt-4 inline-block rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Set up a farm
            </Link>
          </Card>
        </main>
      </div>
    );
  }

  const selectedFarm = farms.find((farm) => farm._id === selectedFarmId);
  const latestPoint = simulation.data?.series?.[simulation.data.series.length - 1];
  const params = simulation.data?.params;
  const status = latestPoint && params ? moistureStatus(latestPoint.vwc, params.field_capacity, params.wilting_point) : null;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">{selectedFarm?.name}</h1>
            <p className="text-sm text-slate-500">{selectedFarm?.location?.label || "Unlabelled location"}</p>
          </div>

          <div className="flex items-center gap-3">
            {farms.length > 1 && (
              <select
                value={selectedFarmId}
                onChange={(event) => setSelectedFarmId(event.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                {farms.map((farm) => (
                  <option key={farm._id} value={farm._id}>
                    {farm.name}
                  </option>
                ))}
              </select>
            )}

            {selectedFarm && (
              <Link
                to={`/farms/${selectedFarm._id}/edit`}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white"
              >
                Edit farm
              </Link>
            )}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
          <Card>
            <p className="text-sm text-slate-500">Current soil moisture</p>
            {simulation.status === "ready" && latestPoint ? (
              <>
                <p className="mt-1 text-4xl font-semibold text-slate-900">{latestPoint.vwc.toFixed(1)}%</p>
                {status && <div className="mt-2">{<StatusBadge level={status} />}</div>}
              </>
            ) : simulation.status === "error" ? (
              <p className="mt-2 text-sm text-red-600">{simulation.error}</p>
            ) : (
              <p className="mt-2 text-sm text-slate-400">Loading…</p>
            )}
          </Card>

          <Card>
            <p className="text-sm text-slate-500">Soil type</p>
            <p className="mt-1 text-lg font-medium text-slate-900">{selectedFarm?.soilType}</p>
            <p className="mt-1 text-sm text-slate-500">{selectedFarm?.landCover}</p>
          </Card>

          <Card>
            <p className="text-sm text-slate-500">Reference monitoring site</p>
            <p className="mt-1 text-lg font-medium text-slate-900">
              {simulation.data?.referenceSite || "—"}
            </p>
            <p className="mt-1 text-sm text-slate-500">Nearest calibrated COSMOS UK site</p>
          </Card>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card title="Soil moisture trend" subtitle="Last 30 days, calibrated simulation" className="lg:col-span-2">
            {simulation.status === "ready" && simulation.data && <MoistureChart series={simulation.data.series} />}
            {simulation.status === "loading" && <p className="text-sm text-slate-400">Running simulation…</p>}
            {simulation.status === "error" && <p className="text-sm text-red-600">{simulation.error}</p>}
          </Card>

          <Card title="Prediction for today" subtitle="Compared across all three models">
            {prediction.status === "ready" && prediction.data && (
              <>
                <p className="text-3xl font-semibold text-slate-900">
                  {prediction.data.defaultPrediction.toFixed(1)}%
                </p>
                <p className="mb-4 text-xs text-slate-500">from the default model</p>
                <PredictionComparison
                  predictions={prediction.data.predictions}
                  defaultModel={prediction.data.defaultModel}
                />
              </>
            )}
            {prediction.status === "loading" && <p className="text-sm text-slate-400">Getting prediction…</p>}
            {prediction.status === "error" && <p className="text-sm text-red-600">{prediction.error}</p>}
          </Card>
        </div>

        <Card title="Model performance" subtitle="Measured on real, held out COSMOS UK data" className="mt-6">
          {models ? (
            <ModelMetricsTable models={models.models} defaultModel={models.defaultModel} />
          ) : (
            <p className="text-sm text-slate-400">Loading…</p>
          )}
        </Card>
      </main>
    </div>
  );
}
