import { describe, it, expect } from "vitest";
import { hashPassword, comparePassword } from "../../src/utils/password.js";

describe("password utils", () => {
  it("hashes a password and verifies it back correctly", async () => {
    const hash = await hashPassword("GoodPass123");
    expect(hash).not.toBe("GoodPass123");
    expect(await comparePassword("GoodPass123", hash)).toBe(true);
  });

  it("rejects the wrong password against a hash", async () => {
    const hash = await hashPassword("GoodPass123");
    expect(await comparePassword("WrongPass123", hash)).toBe(false);
  });
});
