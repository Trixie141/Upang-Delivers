import mongoose from "mongoose";
import "dotenv/config";

const URI = process.env.MONGODB_URI;

export async function connectDB() {
  if (!URI) {
    console.error(
      "\n  MONGODB_URI is missing.\n" +
        "  Copy .env.example to .env and paste your MongoDB Atlas connection string.\n",
    );
    process.exit(1);
  }

  mongoose.set("strictQuery", true);
  // Reject any field that is not declared in a schema — stops payload pollution.
  mongoose.set("strict", "throw");

  try {
    await mongoose.connect(URI, {
      dbName: process.env.MONGODB_DB || "upang_delivers",
      serverSelectionTimeoutMS: 10_000,
      maxPoolSize: 10,
    });
  } catch (err) {
    console.error("\n  Could not reach MongoDB Atlas:", err.message);
    console.error(
      "  Checklist: IP added under Atlas → Network Access, correct user/password," +
        " and special characters URL-encoded.\n",
    );
    process.exit(1);
  }

  const { host, name } = mongoose.connection;
  console.log(`  MongoDB Atlas connected → ${host}/${name}`);

  mongoose.connection.on("error", (e) => console.error("  Mongo error:", e.message));
  mongoose.connection.on("disconnected", () => console.warn("  Mongo disconnected"));
  return mongoose.connection;
}

export async function disconnectDB() {
  await mongoose.connection.close();
}

export { mongoose };
