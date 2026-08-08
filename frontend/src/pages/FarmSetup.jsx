import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import Card from "../components/Card";
import LocationPicker from "../components/LocationPicker";
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
  const { farmId } = useParams();
  const isEditMode = Boolean(farmId);

  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [autoFilling, setAutoFilling] = useState(false);
  const [autoFillStatus, setAutoFillStatus] = useState("");
  const [loading, setLoading] = useState(isEditMode);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (!isEditMode) return;

    api
      .get(`/farms/${farmId}`)
      .then(({ data }) => {
        const farm = data.farm;
        setForm({
          name: farm.name,
          description: farm.description || "",
          latitude: String(farm.location.latitude),
          longitude: String(farm.location.longitude),
          label: farm.location.label || "",
          soilType: farm.soilType,
          landCover: farm.landCover,
          areaHectares: farm.areaHectares != null ? String(farm.areaHectares) : "",
        });
      })
      .catch((err) => {
        setLoadError(err.response?.data?.error || "Could not load this farm");
      })
      .finally(() => setLoading(false));
  }, [farmId, isEditMode]);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleLocationChange({ latitude, longitude, label }) {
    setForm((prev) => ({
      ...prev,
      latitude: String(latitude),
      longitude: String(longitude),
      label: label ?? prev.label,
    }));
  }

  async function handleAutoFill() {
    if (!form.description.trim() || autoFilling) return;

    setAutoFilling(true);
    setAutoFillStatus("");

    try {
      const { data } = await api.post("/language/configure-from-description", {
        description: form.description,
      });
      const suggestion = data.suggestion;

      setForm((prev) => ({
        ...prev,
        name: prev.name || suggestion.name || prev.name,
        label: prev.label || suggestion.locationLabel || prev.label,
        areaHectares:
          prev.areaHectares || (suggestion.areaHectares != null ? String(suggestion.areaHectares) : prev.areaHectares),
        soilType: suggestion.soilType || prev.soilType,
        landCover: suggestion.landCover || prev.landCover,
      }));

      setAutoFillStatus("Suggested from your description — review before creating.");
    } catch (err) {
      setAutoFillStatus(err.response?.data?.error || "Could not generate suggestions from the description");
    } finally {
      setAutoFilling(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    const payload = {
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
    };

    try {
      if (isEditMode) {
        await api.put(`/farms/${farmId}`, payload);
      } else {
        await api.post("/farms", payload);
      }
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || `Could not ${isEditMode ? "save" : "create"} the farm`);
    } finally {
      setSubmitting(false);
    }
  }

  if (isEditMode && loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <main className="mx-auto max-w-2xl px-6 py-10">
          <p className="text-sm text-slate-500">Loading farm details…</p>
        </main>
      </div>
    );
  }

  if (isEditMode && loadError) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <main className="mx-auto max-w-2xl px-6 py-10">
          <Card>
            <p className="text-sm text-red-600">{loadError}</p>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="text-xl font-semibold text-slate-900">{isEditMode ? "Edit farm" : "Set up a farm"}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {isEditMode
            ? "Update your farm's details below."
            : "Tell us where your farm is and what it's like, we'll match it to the nearest calibrated soil model."}
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
              <div className="flex items-center justify-between gap-4">
                <label htmlFor="description" className="block text-sm font-medium text-slate-700">
                  Description
                </label>
                <button
                  type="button"
                  onClick={handleAutoFill}
                  disabled={!form.description.trim() || autoFilling}
                  className="text-xs font-medium text-emerald-600 hover:text-emerald-700 disabled:cursor-not-allowed disabled:text-slate-300"
                >
                  {autoFilling ? "Suggesting…" : "Auto-fill from description"}
                </button>
              </div>
              <textarea
                id="description"
                rows={3}
                placeholder="e.g. A 20 hectare arable wheat farm near Norwich on heavy clay soil"
                value={form.description}
                onChange={(event) => update("description", event.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <p role="status" aria-live="polite" className="mt-1 text-xs text-slate-500">
                {autoFillStatus}
              </p>
            </div>

            <div>
              <span className="block text-sm font-medium text-slate-700">Location</span>
              <p className="mt-0.5 text-xs text-slate-500">
                Search for an address, or click anywhere on the map to set the exact spot.
              </p>
              <LocationPicker
                latitude={form.latitude}
                longitude={form.longitude}
                onLocationChange={handleLocationChange}
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
              {submitting
                ? isEditMode
                  ? "Saving…"
                  : "Creating farm…"
                : isEditMode
                  ? "Save changes"
                  : "Create farm"}
            </button>
          </form>
        </Card>
      </main>
    </div>
  );
}
