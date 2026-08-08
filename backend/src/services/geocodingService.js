import axios from "axios";

const client = axios.create({
  baseURL: "https://nominatim.openstreetmap.org",
  timeout: 10000,
  headers: {
    // Nominatim's usage policy requires requests to identify the calling application.
    "User-Agent": "FarmFlo-Simulation-Studio/1.0",
  },
});

function normalizeError(err) {
  const error = new Error("The location search service is unavailable");
  error.status = 503;
  return error;
}

export async function searchLocation(query) {
  try {
    const { data } = await client.get("/search", {
      params: {
        q: query,
        format: "json",
        limit: 5,
        countrycodes: "gb",
        addressdetails: 0,
      },
    });

    return data.map((result) => ({
      label: result.display_name,
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
    }));
  } catch (err) {
    throw normalizeError(err);
  }
}

export async function reverseGeocode(latitude, longitude) {
  try {
    const { data } = await client.get("/reverse", {
      params: {
        lat: latitude,
        lon: longitude,
        format: "json",
      },
    });

    return { label: data.display_name || "" };
  } catch (err) {
    throw normalizeError(err);
  }
}
