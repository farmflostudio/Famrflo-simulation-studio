import mongoose from "mongoose";

const farmSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    location: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
      label: { type: String, trim: true, default: "" },
    },
    soilType: { type: String, required: true },
    landCover: { type: String, required: true },
    areaHectares: { type: Number, min: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("Farm", farmSchema);
