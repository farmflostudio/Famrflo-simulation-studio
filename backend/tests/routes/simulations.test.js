import { describe, it, expect, vi, beforeAll } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { registerUser, createFarm } from "../helpers.js";

vi.mock("../../src/services/simulationService.js", () => ({
  runSimulation: vi.fn(async () => ({
    referenceSite: "ROTHD",
    soilType: "Mineral soil",
    params: { field_capacity: 37.08, wilting_point: 8.92 },
    saturation: 52.29,
    series: [
      { date: "2026-07-01", vwc: 25.1 },
      { date: "2026-07-02", vwc: 24.8 },
    ],
  })),
  runPrediction: vi.fn(),
  runSchedule: vi.fn(),
}));

describe("simulation routes", () => {
  let token;
  let farmId;

  beforeAll(async () => {
    ({ token } = await registerUser(app, { email: "simowner@example.com" }));
    const farm = await createFarm(app, token);
    farmId = farm._id;
  });

  it("rejects an invalid date range", async () => {
    const response = await request(app)
      .post(`/api/farms/${farmId}/simulations`)
      .set("Authorization", `Bearer ${token}`)
      .send({ startDate: "not-a-date", endDate: "2026-07-30" });

    expect(response.status).toBe(400);
  });

  it("runs a simulation using the mocked simulation service and stores it", async () => {
    const response = await request(app)
      .post(`/api/farms/${farmId}/simulations`)
      .set("Authorization", `Bearer ${token}`)
      .send({ startDate: "2026-07-01", endDate: "2026-07-02" });

    expect(response.status).toBe(201);
    expect(response.body.simulationRun.referenceSite).toBe("ROTHD");
    expect(response.body.simulationRun.series).toHaveLength(2);

    const listResponse = await request(app)
      .get(`/api/farms/${farmId}/simulations`)
      .set("Authorization", `Bearer ${token}`);

    expect(listResponse.body.simulationRuns).toHaveLength(1);
  });

  it("returns 404 for a farm that does not belong to the user", async () => {
    const response = await request(app)
      .post(`/api/farms/000000000000000000000000/simulations`)
      .set("Authorization", `Bearer ${token}`)
      .send({ startDate: "2026-07-01", endDate: "2026-07-02" });

    expect(response.status).toBe(404);
  });
});
