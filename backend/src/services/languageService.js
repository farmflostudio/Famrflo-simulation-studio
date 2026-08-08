import axios from "axios";

const client = axios.create({
  baseURL: process.env.SIMULATION_SERVICE_URL || "http://localhost:8000",
  timeout: 30000,
});

function normalizeError(err) {
  if (err.response) {
    const error = new Error(err.response.data?.detail || "The language service rejected the request");
    error.status = err.response.status;
    return error;
  }
  const error = new Error("The language service is unavailable");
  error.status = 503;
  return error;
}

export async function suggestFarmConfig({ description }) {
  try {
    const { data } = await client.post("/configure", { description });
    return data;
  } catch (err) {
    throw normalizeError(err);
  }
}

export async function explainSchedule({ farmName, referenceSite, horizonDays, totalWaterMm, irrigationDays }) {
  try {
    const { data } = await client.post("/explain", {
      farmName,
      referenceSite,
      horizonDays,
      totalWaterMm,
      irrigationDays,
    });
    return data;
  } catch (err) {
    throw normalizeError(err);
  }
}
