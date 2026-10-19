import mongoose from "mongoose";

const chatMessageSchema = new mongoose.Schema(
  {
    errandId: { type: mongoose.Schema.Types.ObjectId, ref: "Errand", required: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    message: { type: String, required: true, trim: true, minlength: 1, maxlength: 500 },
  },
  { timestamps: true, collection: "chat_messages", toJSON: { versionKey: false } },
);

chatMessageSchema.index({ errandId: 1, createdAt: -1 });

export const ChatMessage = mongoose.model("ChatMessage", chatMessageSchema);
