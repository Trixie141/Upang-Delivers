import mongoose from "mongoose";

const runnerLocationSchema = new mongoose.Schema(
  {
    errandId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Errand",
      required: true,
      unique: true,
    },
    runnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    lat: { type: Number, required: true, min: -90, max: 90 },
    lng: { type: Number, required: true, min: -180, max: 180 },
    updatedAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true, collection: "runner_locations", toJSON: { versionKey: false } },
);

runnerLocationSchema.index({ runnerId: 1, updatedAt: -1 });

export const RunnerLocation = mongoose.model("RunnerLocation", runnerLocationSchema);
