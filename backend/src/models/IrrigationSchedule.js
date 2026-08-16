import mongoose from "mongoose";

const planEntrySchema = new mongoose.Schema(
  {
    date: String,
    recommendedMm: Number,
    vwcBeforeIrrigation: Number,
    predictedVwc: Number,
  },
  { _id: false }
);

const strategyResultSchema = new mongoose.Schema(
  {
    strategy: String,
    plan: [planEntrySchema],
    totalWaterMm: Number,
    totalWaterLitres: Number,
    irrigationDays: Number,
    minVwc: Number,
    daysBelowWiltingPoint: Number,
  },
  { _id: false }
);

const irrigationScheduleSchema = new mongoose.Schema(
  {
    farmId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Farm",
      required: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    horizonDays: { type: Number, required: true },
    referenceSite: { type: String },
    soilType: { type: String },
    landCover: { type: String },
    fieldCapacity: { type: Number },
    wiltingPoint: { type: Number },
    madThreshold: { type: Number },
    irrigationApplicable: { type: Boolean, default: true },
    policyNote: { type: String },
    recommended: strategyResultSchema,
    baselines: {
      fixedInterval: strategyResultSchema,
      thresholdBased: strategyResultSchema,
      linearProgramme: strategyResultSchema,
    },
    explanation: { type: String, default: "" },
    explanationSource: { type: String, enum: ["gemini", "template"], default: "template" },
    guardrailPassed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("IrrigationSchedule", irrigationScheduleSchema);
