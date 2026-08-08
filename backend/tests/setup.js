import { afterAll, beforeAll } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret-key-for-vitest-only";
process.env.NODE_ENV = "test";

let mongod;

// Each test file gets its own isolated in-memory MongoDB instance (Vitest's default
// per-file module isolation), so state only needs resetting between files, not between
// individual tests within a file - several suites rely on a user registered once in
// beforeAll and reused across their it() blocks.
beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
}, 120000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});
