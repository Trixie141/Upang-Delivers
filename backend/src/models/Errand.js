import mongoose from "mongoose";

const errandSchema = new mongoose.Schema(
  {
    /** Ownership is always taken from the JWT, never from the request body. */
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    runnerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },

    title: { type: String, required: true, trim: true, minlength: 6, maxlength: 90 },
    instructions: { type: String, required: true, trim: true, minlength: 10, maxlength: 600 },
    category: {
      type: String,
      required: true,
      enum: ["Food Run", "Printing", "Queuing", "Deliveries", "Others"],
    },
    pickup: { type: String, required: true, trim: true, maxlength: 80 },
    dropoff: { type: String, required: true, trim: true, maxlength: 80 },
    reward: { type: Number, required: true, min: 20, max: 1000 },
    cod: { type: Boolean, default: false },
    deadline: { type: String, required: true, trim: true, maxlength: 60 },
    status: {
      type: String,
      enum: ["open", "in_progress", "picked_up", "review", "done", "cancelled"],
      default: "open",
      index: true,
    },
  },
  { timestamps: true, collection: "errands", toJSON: { versionKey: false } },
);

errandSchema.index({ status: 1, createdAt: -1 });

export const Errand = mongoose.model("Errand", errandSchema);