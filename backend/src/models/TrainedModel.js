import mongoose from "mongoose";

const trainedModelSchema = new mongoose.Schema(
  {
    modelType: { type: String, required: true, enum: ["random_forest", "xgboost", "lstm"] },
    rmse: { type: Number, required: true },
    mae: { type: Number, required: true },
    r2: { type: Number, required: true },
    sizeMb: { type: Number, required: true },
    isDefault: { type: Boolean, default: false },
    trainedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("TrainedModel", trainedModelSchema);
