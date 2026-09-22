import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    errandId: { type: mongoose.Schema.Types.ObjectId, ref: "Errand", required: true, unique: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    runnerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true, min: 0 },
    method: { type: String, enum: ["cash_on_delivery"], default: "cash_on_delivery" },
  },
  { timestamps: true, collection: "transactions", toJSON: { versionKey: false } },
);

export const Transaction = mongoose.model("Transaction", transactionSchema);