import { describe, it, expect, vi, beforeAll } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { registerUser, createFarm } from "../helpers.js";
import { runSchedule } from "../../src/services/simulationService.js";
import { explainSchedule } from "../../src/services/languageService.js";

const RECOMMENDED = {
  strategy: "optimised",
  plan: [{ date: "2026-08-07", recommendedMm: 15, predictedVwc: 30 }],
  totalWaterMm: 15,
  irrigationDays: 1,
  minVwc: 28,
  daysBelowWiltingPoint: 0,
};

const BASELINES = {
  fixedInterval: { ...RECOMMENDED, strategy: "fixedInterval", totalWaterMm: 30, irrigationDays: 2 },
  thresholdBased: { ...RECOMMENDED, strategy: "thresholdBased", totalWaterMm: 0, irrigationDays: 0 },
  linearProgramme: { ...RECOMMENDED, strategy: "linearProgramme", totalWaterMm: 10, irrigationDays: 1 },
};

vi.mock("../../src/services/simulationService.js", () => ({
  runSimulation: vi.fn(),
  runPrediction: vi.fn(),
  runSchedule: vi.fn(async () => ({
    referenceSite: "ROTHD",
    soilType: "Mineral soil",
    horizonDays: 7,
    fieldCapacity: 37.08,
    wiltingPoint: 8.92,
    recommended: RECOMMENDED,
    baselines: BASELINES,
  })),
}));

vi.mock("../../src/services/languageService.js", () => ({
  suggestFarmConfig: vi.fn(),
  explainSchedule: vi.fn(async () => ({
    explanation: "Apply 15.0 mm across 1 irrigation day this week.",
    source: "gemini",
    guardrailPassed: true,
  })),
}));

describe("schedule routes", () => {
  let token;
  let farmId;

  beforeAll(async () => {
    ({ token } = await registerUser(app, { email: "scheduleowner@example.com" }));
    const farm = await createFarm(app, token);
    farmId = farm._id;
  });

  it("rejects an out of range horizonDays", async () => {
    const response = await request(app)
      .post(`/api/farms/${farmId}/schedules`)
      .set("Authorization", `Bearer ${token}`)
      .send({ horizonDays: 30 });

    expect(response.status).toBe(400);
  });

  it("creates a schedule with the recommended plan, baselines, and explanation", async () => {
    const response = await request(app)
      .post(`/api/farms/${farmId}/schedules`)
      .set("Authorization", `Bearer ${token}`)
      .send({ horizonDays: 7 });

    expect(response.status).toBe(201);
    const { schedule } = response.body;
    expect(schedule.recommended.totalWaterMm).toBe(15);
    expect(schedule.baselines.fixedInterval.totalWaterMm).toBe(30);
    expect(schedule.explanation).toContain("15.0 mm");
    expect(schedule.explanationSource).toBe("gemini");
    expect(schedule.guardrailPassed).toBe(true);
  });

  it("falls back to a template explanation when the language service is unreachable, without losing the numeric plan", async () => {
    explainSchedule.mockRejectedValueOnce(new Error("language service unavailable"));

    const response = await request(app)
      .post(`/api/farms/${farmId}/schedules`)
      .set("Authorization", `Bearer ${token}`)
      .send({ horizonDays: 7 });

    expect(response.status).toBe(201);
    const { schedule } = response.body;
    expect(schedule.recommended.totalWaterMm).toBe(15);
    expect(schedule.explanationSource).toBe("template");
    expect(schedule.guardrailPassed).toBe(false);
    expect(schedule.explanation).toContain("15.0 mm");
    expect(schedule.explanation).toContain("1 irrigation day");
  });

  it("lists schedules for the farm", async () => {
    const response = await request(app)
      .get(`/api/farms/${farmId}/schedules`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.schedules.length).toBeGreaterThan(0);
  });

  it("returns 404 when another user requests this farm's schedules", async () => {
    const { token: otherToken } = await registerUser(app, { email: "otherscheduleowner@example.com" });
    const response = await request(app)
      .get(`/api/farms/${farmId}/schedules`)
      .set("Authorization", `Bearer ${otherToken}`);

    expect(response.status).toBe(404);
  });

  it("propagates a simulation service failure as an error response, not a silent success", async () => {
    runSchedule.mockRejectedValueOnce(Object.assign(new Error("simulation service down"), { status: 503 }));

    const response = await request(app)
      .post(`/api/farms/${farmId}/schedules`)
      .set("Authorization", `Bearer ${token}`)
      .send({ horizonDays: 7 });

    expect(response.status).toBe(503);
  });
});
