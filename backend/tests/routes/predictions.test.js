import { describe, it, expect, vi, beforeAll } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { registerUser, createFarm } from "../helpers.js";

vi.mock("../../src/services/simulationService.js", () => ({
  runSimulation: vi.fn(),
  runPrediction: vi.fn(async () => ({
    targetDate: "2026-08-07",
    referenceSite: "ROTHD",
    soilType: "Mineral soil",
    predictions: { random_forest: 24.1, xgboost: 23.8, lstm: 25.0 },
    defaultModel: "xgboost",
    defaultPrediction: 23.8,
  })),
  runSchedule: vi.fn(),
}));

describe("prediction routes", () => {
  let token;
  let farmId;

  beforeAll(async () => {
    ({ token } = await registerUser(app, { email: "predowner@example.com" }));
    const farm = await createFarm(app, token);
    farmId = farm._id;
  });

  it("runs a prediction using the mocked service and stores it", async () => {
    const response = await request(app)
      .post(`/api/farms/${farmId}/predictions`)
      .set("Authorization", `Bearer ${token}`)
      .send({});

    expect(response.status).toBe(201);
    expect(response.body.prediction.defaultModel).toBe("xgboost");
    expect(response.body.prediction.defaultPrediction).toBe(23.8);
    expect(response.body.prediction.predictions.random_forest).toBe(24.1);
  });

  it("lists predictions for the farm", async () => {
    const response = await request(app)
      .get(`/api/farms/${farmId}/predictions`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.predictions.length).toBeGreaterThan(0);
  });

  it("rejects an invalid target date", async () => {
    const response = await request(app)
      .post(`/api/farms/${farmId}/predictions`)
      .set("Authorization", `Bearer ${token}`)
      .send({ targetDate: "not-a-date" });

    expect(response.status).toBe(400);
  });
});
