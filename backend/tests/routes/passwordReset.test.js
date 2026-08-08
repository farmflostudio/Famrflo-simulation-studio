import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { registerUser } from "../helpers.js";
import { sendPasswordResetEmail } from "../../src/services/emailService.js";

vi.mock("../../src/services/emailService.js", () => ({
  sendPasswordResetEmail: vi.fn(async () => {}),
}));

function extractToken(resetLink) {
  return new URL(resetLink).searchParams.get("token");
}

describe("password reset routes", () => {
  beforeEach(() => {
    sendPasswordResetEmail.mockClear();
  });

  it("returns the same generic message whether or not the email exists, and only emails real accounts", async () => {
    const { email } = await registerUser(app, { email: "resetme@example.com" });

    const realResponse = await request(app).post("/api/auth/forgot-password").send({ email });
    const fakeResponse = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "doesnotexist@example.com" });

    expect(realResponse.status).toBe(200);
    expect(fakeResponse.status).toBe(200);
    expect(realResponse.body.message).toBe(fakeResponse.body.message);
    expect(sendPasswordResetEmail).toHaveBeenCalledTimes(1);
    expect(sendPasswordResetEmail).toHaveBeenCalledWith(email, expect.stringContaining("/reset-password?token="));
  });

  it("resets the password with a valid token and the old password stops working", async () => {
    const { email, password } = await registerUser(app, { email: "resetflow@example.com" });
    await request(app).post("/api/auth/forgot-password").send({ email });

    const [, resetLink] = sendPasswordResetEmail.mock.calls[0];
    const token = extractToken(resetLink);

    const resetResponse = await request(app)
      .post("/api/auth/reset-password")
      .send({ token, password: "BrandNewPass123" });
    expect(resetResponse.status).toBe(200);

    const oldLoginResponse = await request(app).post("/api/auth/login").send({ email, password });
    expect(oldLoginResponse.status).toBe(401);

    const newLoginResponse = await request(app)
      .post("/api/auth/login")
      .send({ email, password: "BrandNewPass123" });
    expect(newLoginResponse.status).toBe(200);
  });

  it("rejects an unknown or malformed token", async () => {
    const response = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: "not-a-real-token", password: "BrandNewPass123" });

    expect(response.status).toBe(400);
  });

  it("rejects an expired token", async () => {
    const { email } = await registerUser(app, { email: "expiredreset@example.com" });
    await request(app).post("/api/auth/forgot-password").send({ email });

    const [, resetLink] = sendPasswordResetEmail.mock.calls[0];
    const token = extractToken(resetLink);

    const User = (await import("../../src/models/User.js")).default;
    await User.updateOne({ email }, { resetPasswordExpires: new Date(Date.now() - 1000) });

    const response = await request(app).post("/api/auth/reset-password").send({ token, password: "BrandNewPass123" });
    expect(response.status).toBe(400);
  });

  it("does not allow the same token to be used twice", async () => {
    const { email } = await registerUser(app, { email: "singleusereset@example.com" });
    await request(app).post("/api/auth/forgot-password").send({ email });

    const [, resetLink] = sendPasswordResetEmail.mock.calls[0];
    const token = extractToken(resetLink);

    const firstUse = await request(app).post("/api/auth/reset-password").send({ token, password: "BrandNewPass123" });
    expect(firstUse.status).toBe(200);

    const secondUse = await request(app)
      .post("/api/auth/reset-password")
      .send({ token, password: "AnotherPass456" });
    expect(secondUse.status).toBe(400);
  });

  it("rejects a weak new password", async () => {
    const { email } = await registerUser(app, { email: "weakreset@example.com" });
    await request(app).post("/api/auth/forgot-password").send({ email });

    const [, resetLink] = sendPasswordResetEmail.mock.calls[0];
    const token = extractToken(resetLink);

    const response = await request(app).post("/api/auth/reset-password").send({ token, password: "short" });
    expect(response.status).toBe(400);
  });
});
