import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipientId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    errandId: { type: mongoose.Schema.Types.ObjectId, ref: "Errand", required: true },
    type: { type: String, required: true, enum: ["new_errand", "accepted", "picked_up"] },
    title: { type: String, required: true, maxlength: 100 },
    message: { type: String, required: true, maxlength: 240 },
    readAt: { type: Date, default: null },
    expiresAt: { type: Date, default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
  },
  { timestamps: true, collection: "notifications", toJSON: { versionKey: false } },
);

notificationSchema.index({ recipientId: 1, createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Notification = mongoose.model("Notification", notificationSchema);
