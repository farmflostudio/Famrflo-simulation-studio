import mongoose from "mongoose";

const simulationRunSchema = new mongoose.Schema(
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
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    referenceSite: { type: String },
    soilType: { type: String },
    params: { type: mongoose.Schema.Types.Mixed },
    series: [
      {
        date: String,
        vwc: Number,
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model("SimulationRun", simulationRunSchema);
