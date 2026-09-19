import { Router } from "express";
import mongoose from "mongoose";
import { User } from "../models/User.js";
import { Errand } from "../models/Errand.js";
import { AuditLog } from "../models/AuditLog.js";
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

/* GET /api/admin/audit-log */
router.get("/audit-log", async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const logs = await AuditLog.find().sort({ at: -1 }).limit(limit);
  res.json({ logs });
});

/* GET /api/admin/stats — aggregation pipeline */
router.get("/stats", async (req, res) => {
  const [totalUsers, activeErrands, byStatus, revenue, byCategory] = await Promise.all([
    User.countDocuments(),
    Errand.countDocuments({ status: { $in: ["open", "in_progress", "picked_up"] } }),
    Errand.aggregate([{ $group: { _id: "$status", n: { $sum: 1 } } }]),
    Errand.aggregate([
      { $match: { status: "done" } },
      { $group: { _id: null, total: { $sum: "$reward" } } },
    ]),
    Errand.aggregate([{ $group: { _id: "$category", n: { $sum: 1 } } }, { $sort: { n: -1 } }]),
  ]);

  res.json({
    totalUsers,
    activeErrands,
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
  const user = await User.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!user) return res.status(404).json({ error: "Resource not found." });
  res.json({ user: user.toSafeJSON() });
});

export default router;
