import { Router } from "express";
import mongoose from "mongoose";
import { Notification } from "../models/Notification.js";
import { requireAuth, validObjectId } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const notifications = await Notification.find({ recipientId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();
    const unreadCount = await Notification.countDocuments({ recipientId: req.user.id, readAt: null });
    res.json({ notifications, unreadCount });
  } catch (err) {
    next(err);
  }
});

router.patch("/:id/read", validObjectId(), async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipientId: new mongoose.Types.ObjectId(req.user.id) },
      { $set: { readAt: new Date() } },
      { new: true },
    ).lean();
    if (!notification) return res.status(404).json({ error: "Notification not found." });
    res.json({ notification });
  } catch (err) {
    next(err);
  }
});

router.patch("/read-all", async (req, res, next) => {
  try {
    await Notification.updateMany(
      { recipientId: req.user.id, readAt: null },
      { $set: { readAt: new Date() } },
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
