import Farm from "../models/Farm.js";
import SimulationRun from "../models/SimulationRun.js";
import { runSimulation } from "../services/simulationService.js";

export async function createSimulation(req, res) {
  const farm = await Farm.findOne({ _id: req.params.farmId, ownerId: req.user._id });
  if (!farm) {
    return res.status(404).json({ error: "Farm not found" });
  }

  const { startDate, endDate, initialVwc } = req.body;

  const result = await runSimulation({
    latitude: farm.location.latitude,
    longitude: farm.location.longitude,
    soilType: farm.soilType,
    startDate,
    endDate,
    initialVwc,
  });

  const run = await SimulationRun.create({
    farmId: farm._id,
    ownerId: req.user._id,
    startDate,
    endDate,
    referenceSite: result.referenceSite,
    soilType: result.soilType,
    params: result.params,
    series: result.series,
  });

  res.status(201).json({ simulationRun: run });
}

export async function listSimulations(req, res) {
  const farm = await Farm.findOne({ _id: req.params.farmId, ownerId: req.user._id });
  if (!farm) {
    return res.status(404).json({ error: "Farm not found" });
  }

  const runs = await SimulationRun.find({ farmId: farm._id }).sort({ createdAt: -1 });
  res.json({ simulationRuns: runs });
}
