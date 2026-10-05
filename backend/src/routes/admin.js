import { Router } from "express";
import mongoose from "mongoose";
import { User } from "../models/User.js";
import { Errand } from "../models/Errand.js";
import { audit } from "../models/AuditLog.js";
import { RunnerLocation } from "../models/RunnerLocation.js";
import { requireAuth, requireRole, validObjectId } from "../middleware/auth.js";
import { limits } from "../middleware/rateLimit.js";

const router = Router();

// Everything below requires a valid session AND the admin role.
router.use(requireAuth, requireRole("admin"));

/* GET /api/admin/users — passwordHash is select:false, so never returned */
router.get("/users", async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 }).limit(200);
  res.json({ users });
});

/* GET /api/admin/users/hashes — proof of hashing (digests truncated) */
router.get("/users/hashes", async (req, res) => {
  const rows = await User.find().select("+passwordHash").lean();
  res.json({
    algorithm: "bcrypt",
    rounds: Number(process.env.BCRYPT_ROUNDS || 12),
    note: "Plaintext passwords are never written to MongoDB Atlas.",
    rows: rows.map((u) => ({
      _id: u._id,
      email: u.email,
      role: u.role,
      passwordHash: `${u.passwordHash.slice(0, 32)}…`,
    })),
  });
});

/* GET /api/admin/errands */
router.get("/errands", async (req, res) => {
  const errands = await Errand.find()
    .sort({ createdAt: -1 })
    .limit(200)
    .populate("ownerId", "fullName email")
    .populate("runnerId", "fullName email");
  res.json({ errands });
});

/* PATCH /api/admin/errands/:id/cancel — cancel an active errand with an audited reason */
router.patch("/errands/:id/cancel", validObjectId(), async (req, res) => {
  const reason = typeof req.body?.reason === "string" ? req.body.reason.trim() : "";
  if (reason.length < 8 || reason.length > 300) {
    return res.status(422).json({ error: "Enter a cancellation reason (8–300 characters)." });
  }
  const errand = await Errand.findOneAndUpdate(
    { _id: req.params.id, status: { $in: ["open", "in_progress", "picked_up", "review"] } },
    { $set: { status: "cancelled", cancelReason: reason } },
    { new: true, runValidators: true },
  );
  if (!errand) return res.status(409).json({ error: "This errand is already finished or unavailable." });
  await RunnerLocation.deleteOne({ errandId: errand._id });
  audit(req.user.id, "PATCH", `/api/admin/errands/${req.params.id}/cancel`, 200, `Cancelled: ${reason}`, req.ip);
  res.json({ errand });
});

/* GET /api/admin/stats — aggregation pipeline */
router.get("/stats", async (req, res) => {
  const now = new Date();
  const phNow = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const todayStart = new Date(Date.UTC(phNow.getUTCFullYear(), phNow.getUTCMonth(), phNow.getUTCDate()) - 8 * 60 * 60 * 1000);
  const [totalUsers, openErrands, activeErrands, overdueErrands, completedToday, byStatus, revenue, byCategory] = await Promise.all([
    User.countDocuments(),
    Errand.countDocuments({ status: "open", deadline: { $gt: now } }),
    Errand.countDocuments({ status: { $in: ["open", "in_progress", "picked_up", "review"] } }),
    Errand.countDocuments({ status: { $in: ["open", "in_progress", "picked_up"] }, deadline: { $lte: now } }),
    Errand.countDocuments({ status: "done", updatedAt: { $gte: todayStart } }),
    Errand.aggregate([{ $group: { _id: "$status", n: { $sum: 1 } } }]),
    Errand.aggregate([
      { $match: { status: "done" } },
      { $group: { _id: null, total: { $sum: "$reward" } } },
    ]),
    Errand.aggregate([{ $group: { _id: "$category", n: { $sum: 1 } } }, { $sort: { n: -1 } }]),
  ]);

  res.json({
    totalUsers,
    openErrands,
    activeErrands,
    overdueErrands,
    completedToday,
    cancellations: byStatus.find((s) => s._id === "cancelled")?.n ?? 0,
    byStatus: Object.fromEntries(byStatus.map((s) => [s._id, s.n])),
    revenue: revenue[0]?.total ?? 0,
    byCategory: Object.fromEntries(byCategory.map((c) => [c._id, c.n])),
    rateLimit: `${limits.max} requests / ${limits.windowMs / 1000}s on /api/auth/*`,
    database: mongoose.connection.name,
  });
});

/* PATCH /api/admin/users/:id/status — suspend or reactivate */
router.patch("/users/:id/status", validObjectId(), async (req, res) => {
  const { status } = req.body || {};
  if (!["active", "suspended"].includes(status))
    return res
      .status(422)
      .json({ error: "Invalid payload.", fields: { status: "Must be active or suspended." } });
  const reason = typeof req.body?.reason === "string" ? req.body.reason.trim() : "";
  if (status === "suspended" && (reason.length < 8 || reason.length > 300))
    return res.status(422).json({ error: "Enter a reason (8–300 characters) before rejecting or suspending this account." });
    const existing = await User.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: "Resource not found." });
    if (existing.role === "admin")
      return res.status(403).json({ error: "Administrator accounts cannot be approved, rejected, suspended, or reactivated here." });
    if (status === "active" && existing.emailVerified === false)
      return res.status(409).json({ error: "This user must verify their email before activation." });
    const wasPending = existing.status === "pending";
    existing.status = status;
    const user = await existing.save();
    audit(req.user.id, "PATCH", `/api/admin/users/${req.params.id}/status`, 200,
      `${wasPending && status === "active" ? "Approved account" : wasPending && status === "suspended" ? "Rejected account" : `Set account status to ${status}`}${reason ? `: ${reason}` : ""}`, req.ip);
  res.json({ user: user.toSafeJSON() });
});

export default router;
