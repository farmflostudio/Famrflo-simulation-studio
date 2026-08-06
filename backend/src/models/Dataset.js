import mongoose from "mongoose";

const datasetSchema = new mongoose.Schema(
  {
    farmId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Farm",
    },
    source: {
      type: String,
      required: true,
      enum: ["cosmos_uk", "nasa_power", "open_meteo", "synthetic"],
    },
    dateRangeStart: { type: String, required: true },
    dateRangeEnd: { type: String, required: true },
    rowCount: { type: Number, required: true },
  },
  { timestamps: true }
);

export default mongoose.model("Dataset", datasetSchema);
