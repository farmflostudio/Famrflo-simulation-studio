import Farm from "../models/Farm.js";

export async function createFarm(req, res) {
  const { name, description, location, soilType, landCover, areaHectares } = req.body;

  const farm = await Farm.create({
    ownerId: req.user._id,
    name,
    description,
    location,
    soilType,
    landCover,
    areaHectares,
  });

  res.status(201).json({ farm });
}

export async function listFarms(req, res) {
  const farms = await Farm.find({ ownerId: req.user._id }).sort({ createdAt: -1 });
  res.json({ farms });
}

export async function getFarm(req, res) {
  const farm = await Farm.findOne({ _id: req.params.id, ownerId: req.user._id });
  if (!farm) {
    return res.status(404).json({ error: "Farm not found" });
  }
  res.json({ farm });
}

export async function updateFarm(req, res) {
  const { name, description, location, soilType, landCover, areaHectares } = req.body;

  const farm = await Farm.findOneAndUpdate(
    { _id: req.params.id, ownerId: req.user._id },
    { name, description, location, soilType, landCover, areaHectares },
    { new: true, runValidators: true }
  );

  if (!farm) {
    return res.status(404).json({ error: "Farm not found" });
  }
  res.json({ farm });
}

export async function deleteFarm(req, res) {
  const farm = await Farm.findOneAndDelete({ _id: req.params.id, ownerId: req.user._id });
  if (!farm) {
    return res.status(404).json({ error: "Farm not found" });
  }
  res.status(204).send();
}
