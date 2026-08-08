import Farm from "../models/Farm.js";
import SimulationRun from "../models/SimulationRun.js";
import Prediction from "../models/Prediction.js";
import IrrigationSchedule from "../models/IrrigationSchedule.js";

const RECENT_LIMIT = 10;

export async function getHistory(req, res) {
  const farms = await Farm.find({ ownerId: req.user._id }).sort({ createdAt: -1 });

  const entries = await Promise.all(
    farms.map(async (farm) => {
      const [simulations, predictions, schedules] = await Promise.all([
        SimulationRun.find({ farmId: farm._id }).sort({ createdAt: -1 }).limit(RECENT_LIMIT),
        Prediction.find({ farmId: farm._id }).sort({ createdAt: -1 }).limit(RECENT_LIMIT),
        IrrigationSchedule.find({ farmId: farm._id }).sort({ createdAt: -1 }).limit(RECENT_LIMIT),
      ]);

      return { farm, simulations, predictions, schedules };
    })
  );

  res.json({ history: entries });
}
