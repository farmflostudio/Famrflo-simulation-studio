import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { registerUser, createFarm } from "../helpers.js";

describe("farm routes", () => {
  let token;

  beforeAll(async () => {
    ({ token } = await registerUser(app, { email: "farmowner@example.com" }));
  });

  it("rejects farm creation without auth", async () => {
    const response = await request(app).post("/api/farms").send({ name: "No Auth Farm" });
    expect(response.status).toBe(401);
  });

  it("rejects farm creation missing required fields", async () => {
    const response = await request(app)
      .post("/api/farms")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "" });

    expect(response.status).toBe(400);
  });

  it("creates a farm and lists it back", async () => {
    const farm = await createFarm(app, token, { name: "Cambridge Farm" });
    expect(farm._id).toBeTypeOf("string");
    expect(farm.name).toBe("Cambridge Farm");

    const listResponse = await request(app).get("/api/farms").set("Authorization", `Bearer ${token}`);
    expect(listResponse.status).toBe(200);
    expect(listResponse.body.farms.some((f) => f._id === farm._id)).toBe(true);
  });

  it("updates a farm", async () => {
    const farm = await createFarm(app, token, { name: "Old Name" });
    const response = await request(app)
      .put(`/api/farms/${farm._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "New Name",
        location: farm.location,
        soilType: farm.soilType,
        landCover: farm.landCover,
      });

    expect(response.status).toBe(200);
    expect(response.body.farm.name).toBe("New Name");
  });

  it("deletes a farm", async () => {
    const farm = await createFarm(app, token);
    const deleteResponse = await request(app)
      .delete(`/api/farms/${farm._id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(deleteResponse.status).toBe(204);

    const getResponse = await request(app)
      .get(`/api/farms/${farm._id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(getResponse.status).toBe(404);
  });

  it("does not let one user see another user's farm", async () => {
    const farm = await createFarm(app, token);
    const { token: otherToken } = await registerUser(app, { email: "otherfarmowner@example.com" });

    const response = await request(app)
      .get(`/api/farms/${farm._id}`)
      .set("Authorization", `Bearer ${otherToken}`);

    expect(response.status).toBe(404);
  });
});
