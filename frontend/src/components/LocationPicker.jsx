import { useEffect, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import api from "../lib/api";

// Vite doesn't resolve Leaflet's default marker image paths automatically - point them
// at the bundled assets instead.
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const UK_CENTER = [54.5, -3];
const UK_DEFAULT_ZOOM = 6;
const SELECTED_ZOOM = 13;

function ClickHandler({ onSelect }) {
  useMapEvents({
    click(event) {
      onSelect(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

function RecenterOnChange({ position, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.setView(position, zoom, { animate: true });
    }
  }, [map, position?.[0], position?.[1], zoom]);
  return null;
}

export default function LocationPicker({ latitude, longitude, onLocationChange }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  const hasPosition =
    latitude !== "" && longitude !== "" && !Number.isNaN(Number(latitude)) && !Number.isNaN(Number(longitude));
  const position = hasPosition ? [Number(latitude), Number(longitude)] : null;

  async function handleSearch() {
    if (!query.trim() || searching) return;

    setSearching(true);
    setSearchError("");
    try {
      const { data } = await api.get("/geocode/search", { params: { q: query } });
      setResults(data.results);
      if (data.results.length === 0) {
        setSearchError("No matching UK locations found");
      }
    } catch (err) {
      setResults([]);
      setSearchError(err.response?.data?.error || "Could not search for that location");
    } finally {
      setSearching(false);
    }
  }

  function selectResult(result) {
    onLocationChange({ latitude: result.latitude, longitude: result.longitude, label: result.label });
    setResults([]);
    setQuery("");
  }

  async function handleMapClick(lat, lng) {
    onLocationChange({ latitude: lat, longitude: lng });
    try {
      const { data } = await api.get("/geocode/reverse", { params: { lat, lon: lng } });
      onLocationChange({ latitude: lat, longitude: lng, label: data.label });
    } catch {
      // Reverse geocoding is a nice-to-have for the label field - the coordinates
      // themselves are already set either way, so a failure here is silent.
    }
  }

  return (
    <div>
      {/*
        Plain div, not a <form> - this sits inside FarmSetup's own <form>, and a nested
        <form> would have its submit event bubble up and also trigger the outer form's
        submit (saving/creating the farm) before search results could ever be shown.
      */}
      <div className="flex gap-2">
        <label htmlFor="locationSearch" className="sr-only">
          Search for a UK place or address
        </label>
        <input
          id="locationSearch"
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              handleSearch();
            }
          }}
          placeholder="Search for a UK place or address"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
        <button
          type="button"
          onClick={handleSearch}
          disabled={searching || !query.trim()}
          className="shrink-0 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
        >
          {searching ? "Searching…" : "Search"}
        </button>
      </div>

      {results.length > 0 && (
        <ul className="mt-2 divide-y divide-slate-100 rounded-md border border-slate-200 bg-white text-sm shadow-sm">
          {results.map((result, index) => (
            <li key={index}>
              <button
                type="button"
                onClick={() => selectResult(result)}
                className="block w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-50"
              >
                {result.label}
              </button>
            </li>
          ))}
        </ul>
      )}

      {searchError && <p className="mt-2 text-xs text-red-600">{searchError}</p>}

      <div className="mt-3 h-64 overflow-hidden rounded-md border border-slate-300">
        <MapContainer
          center={position || UK_CENTER}
          zoom={position ? SELECTED_ZOOM : UK_DEFAULT_ZOOM}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onSelect={handleMapClick} />
          {position && <Marker position={position} />}
          {position && <RecenterOnChange position={position} zoom={SELECTED_ZOOM} />}
        </MapContainer>
      </div>
      <p className="mt-1 text-xs text-slate-400">Click anywhere on the map to set the exact location.</p>
    </div>
  );
}
