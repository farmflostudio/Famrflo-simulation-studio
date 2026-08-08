import { describe, it, expect, vi, beforeAll } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { registerUser } from "../helpers.js";

vi.mock("../../src/services/geocodingService.js", () => ({
  searchLocation: vi.fn(async (query) => {
    if (query === "Nowhere") return [];
    return [{ label: "Cambridge, England, United Kingdom", latitude: 52.2053, longitude: 0.1218 }];
  }),
  reverseGeocode: vi.fn(async () => ({ label: "Hobson Street, Cambridge, England, United Kingdom" })),
}));

describe("geocoding routes", () => {
  let token;

  beforeAll(async () => {
    ({ token } = await registerUser(app, { email: "geoowner@example.com" }));
  });

  it("rejects requests without auth", async () => {
    const response = await request(app).get("/api/geocode/search").query({ q: "Cambridge" });
    expect(response.status).toBe(401);
  });

  it("searches for a location and returns real-shaped results", async () => {
    const response = await request(app)
      .get("/api/geocode/search")
      .set("Authorization", `Bearer ${token}`)
      .query({ q: "Cambridge" });

    expect(response.status).toBe(200);
    expect(response.body.results[0]).toMatchObject({
      label: expect.any(String),
      latitude: expect.any(Number),
      longitude: expect.any(Number),
    });
  });

  it("rejects an empty search query", async () => {
    const response = await request(app)
      .get("/api/geocode/search")
      .set("Authorization", `Bearer ${token}`)
      .query({ q: "" });

    expect(response.status).toBe(400);
  });

  it("returns an empty list for a query with no matches", async () => {
    const response = await request(app)
      .get("/api/geocode/search")
      .set("Authorization", `Bearer ${token}`)
      .query({ q: "Nowhere" });

    expect(response.status).toBe(200);
    expect(response.body.results).toEqual([]);
  });

  it("reverse geocodes a coordinate", async () => {
    const response = await request(app)
      .get("/api/geocode/reverse")
      .set("Authorization", `Bearer ${token}`)
      .query({ lat: 52.2053, lon: 0.1218 });

    expect(response.status).toBe(200);
    expect(response.body.label).toEqual(expect.any(String));
  });

  it("rejects an out of range coordinate", async () => {
    const response = await request(app)
      .get("/api/geocode/reverse")
      .set("Authorization", `Bearer ${token}`)
      .query({ lat: 200, lon: 0 });

    expect(response.status).toBe(400);
  });
});
