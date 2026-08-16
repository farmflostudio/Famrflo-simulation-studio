import Farm from "../models/Farm.js";
import IrrigationSchedule from "../models/IrrigationSchedule.js";
import { runSchedule } from "../services/simulationService.js";
import { explainSchedule } from "../services/languageService.js";

function localTemplateExplanation({ totalWaterMm, irrigationDays, horizonDays }) {
  if (irrigationDays === 0) {
    return `No irrigation is needed over the next ${horizonDays} days. Forecast rainfall and current soil moisture are expected to stay above the wilting point on their own.`;
  }
  const dayWord = irrigationDays === 1 ? "day" : "days";
  return `Apply a total of ${totalWaterMm.toFixed(1)} mm of irrigation across ${irrigationDays} irrigation ${dayWord} over the next ${horizonDays} days, following the recommended plan below.`;
}

export async function createSchedule(req, res) {
  const farm = await Farm.findOne({ _id: req.params.farmId, ownerId: req.user._id });
  if (!farm) {
    return res.status(404).json({ error: "Farm not found" });
  }

  const { horizonDays } = req.body;

  const result = await runSchedule({
    latitude: farm.location.latitude,
    longitude: farm.location.longitude,
    soilType: farm.soilType,
    landCover: farm.landCover,
    horizonDays,
    areaHectares: farm.areaHectares,
  });

  const numbers = {
    horizonDays: result.horizonDays,
    totalWaterMm: result.recommended.totalWaterMm,
    irrigationDays: result.recommended.irrigationDays,
  };

  let explanationResult;
  try {
    explanationResult = await explainSchedule({
      farmName: farm.name,
      referenceSite: result.referenceSite,
      ...numbers,
    });
  } catch {
    // The language service itself is unreachable (not the same as a guardrail mismatch,
    // which the language service already resolves internally). The numeric plan below is
    // the safety-critical part and must never be blocked by this.
    explanationResult = {
      explanation: localTemplateExplanation(numbers),
      source: "template",
      guardrailPassed: false,
    };
  }

  const schedule = await IrrigationSchedule.create({
    farmId: farm._id,
    ownerId: req.user._id,
    horizonDays: result.horizonDays,
    referenceSite: result.referenceSite,
    soilType: result.soilType,
    landCover: result.landCover,
    fieldCapacity: result.fieldCapacity,
    wiltingPoint: result.wiltingPoint,
    madThreshold: result.madThreshold,
    irrigationApplicable: result.irrigationApplicable,
    policyNote: result.policyNote,
    recommended: result.recommended,
    baselines: result.baselines,
    explanation: explanationResult.explanation,
    explanationSource: explanationResult.source,
    guardrailPassed: explanationResult.guardrailPassed,
  });

  res.status(201).json({ schedule });
}

export async function listSchedules(req, res) {
  const farm = await Farm.findOne({ _id: req.params.farmId, ownerId: req.user._id });
  if (!farm) {
    return res.status(404).json({ error: "Farm not found" });
  }

  const schedules = await IrrigationSchedule.find({ farmId: farm._id }).sort({ createdAt: -1 });
  res.json({ schedules });
}
