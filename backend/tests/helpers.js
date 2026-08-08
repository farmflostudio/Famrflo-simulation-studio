import request from "supertest";

export async function registerUser(app, overrides = {}) {
  const email = overrides.email || `user_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`;
  const password = overrides.password || "TestPass123";
  const name = overrides.name || "Test User";

  const response = await request(app).post("/api/auth/register").send({ email, password, name });
  return { token: response.body.token, user: response.body.user, email, password };
}

export async function createFarm(app, token, overrides = {}) {
  const response = await request(app)
    .post("/api/farms")
    .set("Authorization", `Bearer ${token}`)
    .send({
      name: overrides.name || "Test Farm",
      location: overrides.location || { latitude: 52.2053, longitude: 0.1218, label: "Cambridge, UK" },
      soilType: overrides.soilType || "Mineral soil",
      landCover: overrides.landCover || "Arable and horticulture",
      areaHectares: overrides.areaHectares,
    });
  return response.body.farm;
}
