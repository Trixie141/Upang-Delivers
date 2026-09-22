import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    errandId: { type: mongoose.Schema.Types.ObjectId, ref: "Errand", required: true, unique: true },
    reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    revieweeId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    rating: { type: Number, required: true, min: 1, max: 5, validate: { validator: Number.isInteger, message: "Rating must be a whole number." } },
    comment: { type: String, trim: true, maxlength: 200, default: "" },
  },
  { timestamps: true, collection: "reviews", toJSON: { versionKey: false } },
);

export const Review = mongoose.model("Review", reviewSchema);