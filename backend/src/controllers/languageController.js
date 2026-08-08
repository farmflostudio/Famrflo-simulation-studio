import { suggestFarmConfig } from "../services/languageService.js";

export async function configureFromDescription(req, res) {
  const { description } = req.body;
  const suggestion = await suggestFarmConfig({ description });
  res.json({ suggestion });
}
