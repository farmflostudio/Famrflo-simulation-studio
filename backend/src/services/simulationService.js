import axios from "axios";

const client = axios.create({
  baseURL: process.env.SIMULATION_SERVICE_URL || "http://localhost:8000",
  timeout: 30000,
});

function normalizeError(err) {
  if (err.response) {
    const error = new Error(err.response.data?.detail || "The simulation service rejected the request");
    error.status = err.response.status;
    return error;
  }
  const error = new Error("The simulation service is unavailable");
  error.status = 503;
  return error;
}

export async function runSimulation({ latitude, longitude, startDate, endDate, soilType, initialVwc }) {
  try {
    const { data } = await client.post("/simulate", {
      latitude,
      longitude,
      startDate,
      endDate,
      soilType,
      initialVwc,
    });
    return data;
  } catch (err) {
    throw normalizeError(err);
  }
}

export async function runPrediction({ latitude, longitude, soilType, landCover, targetDate }) {
  try {
    const { data } = await client.post("/predict", {
      latitude,
      longitude,
      soilType,
      landCover,
      targetDate,
    });
    return data;
  } catch (err) {
    throw normalizeError(err);
  }
}

export async function runSchedule({ latitude, longitude, soilType, landCover, horizonDays }) {
  try {
    const { data } = await client.post("/schedule", {
      latitude,
      longitude,
      soilType,
      landCover,
      horizonDays,
    });
    return data;
  } catch (err) {
    throw normalizeError(err);
  }
}
