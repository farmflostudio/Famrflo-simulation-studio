import mongoose from "mongoose";

const irrigationScheduleSchema = new mongoose.Schema(
  {
    farmId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Farm",
      required: true,
    },
    predictionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Prediction",
    },
    plan: [
      {
        date: String,
        recommendedMm: Number,
      },
    ],
    explanation: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("IrrigationSchedule", irrigationScheduleSchema);
