import { describe, it, expect, vi, beforeAll } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { registerUser } from "../helpers.js";
import { suggestFarmConfig } from "../../src/services/languageService.js";

vi.mock("../../src/services/languageService.js", () => ({
  suggestFarmConfig: vi.fn(async () => ({
    name: "Norwich Arable Farm",
    locationLabel: "Norwich",
    areaHectares: null,
    soilType: "Mineral soil",
    landCover: "Arable and horticulture",
    notes: "Wheat on clay soil maps to Mineral soil and Arable and horticulture.",
  })),
  explainSchedule: vi.fn(),
}));

describe("language routes", () => {
  let token;

  beforeAll(async () => {
    ({ token } = await registerUser(app, { email: "languageowner@example.com" }));
  });

  it("rejects an empty description", async () => {
    const response = await request(app)
      .post("/api/language/configure-from-description")
      .set("Authorization", `Bearer ${token}`)
      .send({ description: "   " });

    expect(response.status).toBe(400);
  });

  it("returns a structured suggestion for a valid description", async () => {
    const response = await request(app)
      .post("/api/language/configure-from-description")
      .set("Authorization", `Bearer ${token}`)
      .send({ description: "A small arable farm near Norwich growing wheat on heavy clay soil." });

    expect(response.status).toBe(200);
    expect(response.body.suggestion.soilType).toBe("Mineral soil");
    expect(response.body.suggestion.landCover).toBe("Arable and horticulture");
  });

  it("surfaces an upstream language service failure instead of hanging or crashing", async () => {
    suggestFarmConfig.mockRejectedValueOnce(Object.assign(new Error("language model unavailable"), { status: 502 }));

    const response = await request(app)
      .post("/api/language/configure-from-description")
      .set("Authorization", `Bearer ${token}`)
      .send({ description: "A farm." });

    expect(response.status).toBe(502);
  });

  it("rejects requests without auth", async () => {
    const response = await request(app)
      .post("/api/language/configure-from-description")
      .send({ description: "A farm." });

    expect(response.status).toBe(401);
  });
});
