import mongoose from "mongoose";

const predictionSchema = new mongoose.Schema(
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
    targetDate: { type: String, required: true },
    referenceSite: { type: String },
    soilType: { type: String },
    predictions: {
      random_forest: Number,
      xgboost: Number,
      lstm: Number,
    },
    defaultModel: { type: String },
    defaultPrediction: { type: Number },
  },
  { timestamps: true }
);

export default mongoose.model("Prediction", predictionSchema);
