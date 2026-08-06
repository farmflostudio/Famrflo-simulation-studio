import mongoose from "mongoose";

export async function connectDatabase() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB_NAME;

  if (!uri || !dbName) {
    throw new Error("MONGODB_URI and MONGODB_DB_NAME must be set in the environment");
  }

  mongoose.set("strictQuery", true);

  await mongoose.connect(uri, { dbName });

  return mongoose.connection;
}
