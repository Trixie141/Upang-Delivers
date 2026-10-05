import "dotenv/config";
import mongoose from "mongoose";

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("MONGODB_URI is required.");

const dbName = process.env.MONGODB_DB || "upang_delivers";
await mongoose.connect(uri, { dbName });

try {
  const db = mongoose.connection.db;
  const errands = db.collection("errands");
  const locations = db.collection("runner_locations");
  await locations.createIndex({ errandId: 1 }, { unique: true });
  await locations.createIndex({ runnerId: 1, updatedAt: -1 });

  let migrated = 0;
  let skipped = 0;
  const cursor = errands.find({
    "runnerLocation.lat": { $exists: true },
    "runnerLocation.lng": { $exists: true },
  });

  for await (const errand of cursor) {
    const legacy = errand.runnerLocation;
    const validCoordinates =
      Number.isFinite(legacy?.lat) && legacy.lat >= -90 && legacy.lat <= 90 &&
      Number.isFinite(legacy?.lng) && legacy.lng >= -180 && legacy.lng <= 180;

    if (!errand.runnerId || !validCoordinates) {
      skipped += 1;
      continue;
    }

    await locations.updateOne(
      { errandId: errand._id },
      {
        $setOnInsert: {
          errandId: errand._id,
          runnerId: errand.runnerId,
          lat: legacy.lat,
          lng: legacy.lng,
          updatedAt: legacy.updatedAt || errand.updatedAt || new Date(),
          createdAt: new Date(),
        },
      },
      { upsert: true },
    );

    // Remove the embedded value only after confirming its separate record exists.
    const copied = await locations.findOne({ errandId: errand._id }, { projection: { _id: 1 } });
    if (copied) {
      await errands.updateOne({ _id: errand._id }, { $unset: { runnerLocation: "" } });
      migrated += 1;
    } else {
      skipped += 1;
    }
  }

  console.log(`Runner location migration complete. Moved: ${migrated}; skipped: ${skipped}.`);
} finally {
  await mongoose.disconnect();
}
