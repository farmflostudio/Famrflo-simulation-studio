import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { registerUser } from "../helpers.js";

describe("auth routes", () => {
  it("registers a new user and returns a token without the password hash", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({ email: "newuser@example.com", password: "GoodPass123", name: "New User" });

    expect(response.status).toBe(201);
    expect(response.body.token).toBeTypeOf("string");
    expect(response.body.user.email).toBe("newuser@example.com");
    expect(response.body.user.passwordHash).toBeUndefined();
  });

  it("rejects a duplicate email", async () => {
    await registerUser(app, { email: "dupe@example.com" });
    const response = await request(app)
      .post("/api/auth/register")
      .send({ email: "dupe@example.com", password: "GoodPass123" });

    expect(response.status).toBe(409);
  });

  it("rejects a weak password", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({ email: "weak@example.com", password: "short" });

    expect(response.status).toBe(400);
  });

  it("logs in with correct credentials", async () => {
    const { email, password } = await registerUser(app, { email: "login@example.com" });
    const response = await request(app).post("/api/auth/login").send({ email, password });

    expect(response.status).toBe(200);
    expect(response.body.token).toBeTypeOf("string");
  });

  it("rejects login with the wrong password", async () => {
    const { email } = await registerUser(app, { email: "wrongpass@example.com" });
    const response = await request(app).post("/api/auth/login").send({ email, password: "NotTheRightOne1" });

    expect(response.status).toBe(401);
  });

  it("rejects /me without a token", async () => {
    const response = await request(app).get("/api/auth/me");
    expect(response.status).toBe(401);
  });

  it("returns the current user for a valid token", async () => {
    const { token, email } = await registerUser(app, { email: "me@example.com" });
    const response = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe(email);
  });
});
