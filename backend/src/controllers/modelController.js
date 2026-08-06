import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MODELS_DIR = path.resolve(__dirname, "../../../models");

export async function listModels(req, res) {
  const [metricsRaw, defaultRaw] = await Promise.all([
    readFile(path.join(MODELS_DIR, "metrics.json"), "utf-8"),
    readFile(path.join(MODELS_DIR, "default_model.json"), "utf-8"),
  ]);

  res.json({
    models: JSON.parse(metricsRaw),
    defaultModel: JSON.parse(defaultRaw).default,
  });
}
