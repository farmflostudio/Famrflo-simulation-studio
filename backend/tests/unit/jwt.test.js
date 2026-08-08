import { describe, it, expect } from "vitest";
import { signToken, verifyToken } from "../../src/utils/jwt.js";

describe("jwt utils", () => {
  it("signs a token that verifies back to the same user id", () => {
    const token = signToken("abc123");
    const payload = verifyToken(token);
    expect(payload.sub).toBe("abc123");
  });

  it("rejects a tampered token", () => {
    const token = signToken("abc123");
    const tampered = token.slice(0, -2) + "xx";
    expect(() => verifyToken(tampered)).toThrow();
  });
});
