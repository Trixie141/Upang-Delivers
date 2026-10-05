import mongoose from "mongoose";

const emailCodeSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    purpose: { type: String, required: true, enum: ["signup", "password_reset"] },
    codeHash: { type: String, required: true, select: false },
    expiresAt: { type: Date, required: true, expires: 0 },
    attempts: { type: Number, default: 0 },
  },
  { timestamps: true, collection: "email_codes" },
);

emailCodeSchema.index({ email: 1, purpose: 1 });
export const EmailCode = mongoose.model("EmailCode", emailCodeSchema);
