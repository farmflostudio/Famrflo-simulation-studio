import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { registerUser, createFarm } from "../helpers.js";
import SimulationRun from "../../src/models/SimulationRun.js";
import Prediction from "../../src/models/Prediction.js";
import IrrigationSchedule from "../../src/models/IrrigationSchedule.js";

describe("history route", () => {
  let token;
  let userId;
  let farm;

  beforeAll(async () => {
    const registered = await registerUser(app, { email: "historyowner@example.com" });
    token = registered.token;
    userId = registered.user._id;
    farm = await createFarm(app, token, { name: "History Farm" });

    await SimulationRun.create({
      farmId: farm._id,
      ownerId: userId,
      startDate: "2026-07-01",
      endDate: "2026-07-30",
      referenceSite: "ROTHD",
      soilType: "Mineral soil",
      series: [{ date: "2026-07-01", vwc: 25 }],
    });
    await Prediction.create({
      farmId: farm._id,
      ownerId: userId,
      targetDate: "2026-08-07",
      predictions: { random_forest: 24, xgboost: 23.5, lstm: 25 },
      defaultModel: "xgboost",
      defaultPrediction: 23.5,
    });
    await IrrigationSchedule.create({
      farmId: farm._id,
      ownerId: userId,
      horizonDays: 7,
      referenceSite: "ROTHD",
      recommended: { strategy: "optimised", plan: [], totalWaterMm: 15, irrigationDays: 1, minVwc: 28, daysBelowWiltingPoint: 0 },
      baselines: {},
      explanation: "Apply 15 mm this week.",
      explanationSource: "template",
      guardrailPassed: false,
    });
  });

  it("returns simulations, predictions, and schedules grouped by farm", async () => {
    const response = await request(app).get("/api/history").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.history).toHaveLength(1);

    const entry = response.body.history[0];
    expect(entry.farm.name).toBe("History Farm");
    expect(entry.simulations).toHaveLength(1);
    expect(entry.predictions).toHaveLength(1);
    expect(entry.schedules).toHaveLength(1);
    expect(entry.schedules[0].recommended.totalWaterMm).toBe(15);
  });

  it("does not leak another user's history", async () => {
    const { token: otherToken } = await registerUser(app, { email: "otherhistoryowner@example.com" });
    const response = await request(app).get("/api/history").set("Authorization", `Bearer ${otherToken}`);

    expect(response.status).toBe(200);
    expect(response.body.history).toHaveLength(0);
  });

  it("rejects requests without auth", async () => {
    const response = await request(app).get("/api/history");
    expect(response.status).toBe(401);
  });
});
