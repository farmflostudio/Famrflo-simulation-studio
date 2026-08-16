import dns from "node:dns";
import mongoose from "mongoose";

// Some networks' DNS resolvers mishandle the SRV lookup that mongodb+srv://
// URIs rely on (querySrv EBADRESP). Forcing public resolvers avoids that.
dns.setServers(["8.8.8.8", "1.1.1.1"]);

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
