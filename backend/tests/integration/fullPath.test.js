import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { registerUser } from "../helpers.js";

vi.mock("../../src/services/simulationService.js", () => ({
  runSimulation: vi.fn(),
  runPrediction: vi.fn(),
  runSchedule: vi.fn(async () => ({
    referenceSite: "ROTHD",
    soilType: "Mineral soil",
    horizonDays: 7,
    fieldCapacity: 37.08,
    wiltingPoint: 8.92,
    recommended: {
      strategy: "optimised",
      plan: [{ date: "2026-08-07", recommendedMm: 15, predictedVwc: 30 }],
      totalWaterMm: 15,
      irrigationDays: 1,
      minVwc: 28,
      daysBelowWiltingPoint: 0,
    },
    baselines: {
      fixedInterval: { strategy: "fixedInterval", plan: [], totalWaterMm: 30, irrigationDays: 2, minVwc: 26, daysBelowWiltingPoint: 0 },
      thresholdBased: { strategy: "thresholdBased", plan: [], totalWaterMm: 0, irrigationDays: 0, minVwc: 20, daysBelowWiltingPoint: 0 },
      linearProgramme: { strategy: "linearProgramme", plan: [], totalWaterMm: 10, irrigationDays: 1, minVwc: 25, daysBelowWiltingPoint: 0 },
    },
  })),
}));

vi.mock("../../src/services/languageService.js", () => ({
  suggestFarmConfig: vi.fn(async () => ({
    name: "Norwich Arable Farm",
    locationLabel: "Norwich",
    areaHectares: null,
    soilType: "Mineral soil",
    landCover: "Arable and horticulture",
    notes: "Wheat on clay soil.",
  })),
  explainSchedule: vi.fn(async () => ({
    explanation: "Apply 15.0 mm of irrigation across 1 irrigation day this week.",
    source: "gemini",
    guardrailPassed: true,
  })),
}));

describe("full path: description to finished schedule", () => {
  it("goes from a plain language description through to a schedule visible in history", async () => {
    const { token } = await registerUser(app, { email: "fullpath@example.com" });

    const suggestionResponse = await request(app)
      .post("/api/language/configure-from-description")
      .set("Authorization", `Bearer ${token}`)
      .send({ description: "A small arable farm near Norwich growing wheat on heavy clay soil." });

    expect(suggestionResponse.status).toBe(200);
    const suggestion = suggestionResponse.body.suggestion;

    const farmResponse = await request(app)
      .post("/api/farms")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: suggestion.name,
        location: { latitude: 52.6309, longitude: 1.2974, label: suggestion.locationLabel },
        soilType: suggestion.soilType,
        landCover: suggestion.landCover,
      });

    expect(farmResponse.status).toBe(201);
    const farmId = farmResponse.body.farm._id;

    const scheduleResponse = await request(app)
      .post(`/api/farms/${farmId}/schedules`)
      .set("Authorization", `Bearer ${token}`)
      .send({ horizonDays: 7 });

    expect(scheduleResponse.status).toBe(201);
    expect(scheduleResponse.body.schedule.recommended.totalWaterMm).toBe(15);
    expect(scheduleResponse.body.schedule.explanationSource).toBe("gemini");
    expect(scheduleResponse.body.schedule.guardrailPassed).toBe(true);

    const historyResponse = await request(app).get("/api/history").set("Authorization", `Bearer ${token}`);

    expect(historyResponse.status).toBe(200);
    const entry = historyResponse.body.history.find((item) => item.farm._id === farmId);
    expect(entry).toBeDefined();
    expect(entry.schedules).toHaveLength(1);
    expect(entry.schedules[0].explanation).toContain("15.0 mm");
  });
});
