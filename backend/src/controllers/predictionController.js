import Farm from "../models/Farm.js";
import Prediction from "../models/Prediction.js";
import { runPrediction } from "../services/simulationService.js";

export async function createPrediction(req, res) {
  const farm = await Farm.findOne({ _id: req.params.farmId, ownerId: req.user._id });
  if (!farm) {
    return res.status(404).json({ error: "Farm not found" });
  }

  const { targetDate } = req.body;

  const result = await runPrediction({
    latitude: farm.location.latitude,
    longitude: farm.location.longitude,
    soilType: farm.soilType,
    landCover: farm.landCover,
    targetDate,
  });

  const prediction = await Prediction.create({
    farmId: farm._id,
    ownerId: req.user._id,
    targetDate: result.targetDate,
    referenceSite: result.referenceSite,
    soilType: result.soilType,
    predictions: result.predictions,
    defaultModel: result.defaultModel,
    defaultPrediction: result.defaultPrediction,
  });

  res.status(201).json({ prediction });
}

export async function listPredictions(req, res) {
  const farm = await Farm.findOne({ _id: req.params.farmId, ownerId: req.user._id });
  if (!farm) {
    return res.status(404).json({ error: "Farm not found" });
  }

  const predictions = await Prediction.find({ farmId: farm._id }).sort({ createdAt: -1 });
  res.json({ predictions });
}
