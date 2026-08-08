import { reverseGeocode, searchLocation } from "../services/geocodingService.js";

export async function search(req, res) {
  const results = await searchLocation(req.query.q);
  res.json({ results });
}

export async function reverse(req, res) {
  const { lat, lon } = req.query;
  const result = await reverseGeocode(lat, lon);
  res.json(result);
}
