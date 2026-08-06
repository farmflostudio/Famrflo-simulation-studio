import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Card from "../components/Card";
import api from "../lib/api";

const SOIL_TYPES = ["Mineral soil", "Calcareous mineral soil", "Organic soil"];
const LAND_COVERS = [
  "Arable and horticulture",
  "Improved grassland",
  "Acid grassland",
  "Heather grassland",
  "Broadleaf woodland",
];

const initialForm = {
  name: "",
  description: "",
  latitude: "",
  longitude: "",
  label: "",
  soilType: SOIL_TYPES[0],
  landCover: LAND_COVERS[0],
  areaHectares: "",
};

export default function FarmSetup() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await api.post("/farms", {
        name: form.name,
        description: form.description,
        location: {
          latitude: parseFloat(form.latitude),
          longitude: parseFloat(form.longitude),
          label: form.label,
        },
        soilType: form.soilType,
        landCover: form.landCover,
        areaHectares: form.areaHectares ? parseFloat(form.areaHectares) : undefined,
      });
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Could not create the farm");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="text-xl font-semibold text-slate-900">Set up a farm</h1>
        <p className="mt-1 text-sm text-slate-500">
          Tell us where your farm is and what it's like, we'll match it to the nearest calibrated soil model.
        </p>

        <Card className="mt-6">
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-700">
                Farm name
              </label>
              <input
                id="name"
                type="text"
                required
                value={form.name}
                onChange={(event) => update("name", event.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-slate-700">
                Description
              </label>
              <textarea
                id="description"
                rows={3}
                value={form.description}
                onChange={(event) => update("description", event.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label htmlFor="label" className="block text-sm font-medium text-slate-700">
                Location name
              </label>
              <input
                id="label"
                type="text"
                placeholder="e.g. Cambridge, UK"
                value={form.label}
                onChange={(event) => update("label", event.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="latitude" className="block text-sm font-medium text-slate-700">
                  Latitude
                </label>
                <input
                  id="latitude"
                  type="number"
                  step="any"
                  required
                  placeholder="52.2053"
                  value={form.latitude}
                  onChange={(event) => update("latitude", event.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label htmlFor="longitude" className="block text-sm font-medium text-slate-700">
                  Longitude
                </label>
                <input
                  id="longitude"
                  type="number"
                  step="any"
                  required
                  placeholder="0.1218"
                  value={form.longitude}
                  onChange={(event) => update("longitude", event.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="soilType" className="block text-sm font-medium text-slate-700">
                  Soil type
                </label>
                <select
                  id="soilType"
                  value={form.soilType}
                  onChange={(event) => update("soilType", event.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {SOIL_TYPES.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="landCover" className="block text-sm font-medium text-slate-700">
                  Land cover
                </label>
                <select
                  id="landCover"
                  value={form.landCover}
                  onChange={(event) => update("landCover", event.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {LAND_COVERS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="areaHectares" className="block text-sm font-medium text-slate-700">
                Area (hectares)
              </label>
              <input
                id="areaHectares"
                type="number"
                step="any"
                min="0"
                value={form.areaHectares}
                onChange={(event) => update("areaHectares", event.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {error && (
              <p role="alert" className="text-sm text-red-600">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {submitting ? "Creating farm…" : "Create farm"}
            </button>
          </form>
        </Card>
      </main>
    </div>
  );
}
