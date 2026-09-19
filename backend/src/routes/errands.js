import { Router } from "express";
import { Errand } from "../models/Errand.js";
import { audit } from "../models/AuditLog.js";
import { errandSchema, validate } from "../middleware/validate.js";
import { requireAuth, requireOwnership, validObjectId } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

/* GET /api/errands — public board (open errands only) */
router.get("/", async (req, res) => {
  const errands = await Errand.find({ status: "open" })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate("ownerId", "fullName role");
  res.json({ errands });
});

/* GET /api/errands/mine — scoped to the caller only */
router.get("/mine", async (req, res) => {
  const errands = await Errand.find({
    $or: [{ ownerId: req.user.id }, { runnerId: req.user.id }],
  }).sort({ createdAt: -1 });
  res.json({ errands });
});

/* POST /api/errands — validated; ownerId comes from the JWT, not the body */
router.post("/", validate(errandSchema), async (req, res, next) => {
  try {
    const errand = await Errand.create({ ...req.valid, ownerId: req.user.id });
    audit(req.user.id, "POST", "/api/errands", 201, `Created ${errand._id}`, req.ip);
    res.status(201).json({ errand });
  } catch (err) {
    if (err?.name === "ValidationError") {
      const fields = Object.fromEntries(
        Object.entries(err.errors).map(([k, v]) => [k, v.message]),
      );
      return res.status(422).json({ error: "Invalid payload.", fields });
    }
    next(err);
  }
});

/* GET /api/errands/:id — BOLA guarded */
router.get("/:id", validObjectId(), requireOwnership(Errand), (req, res) => {
  audit(req.user.id, "GET", req.originalUrl, 200, "Ownership verified", req.ip);
  res.json({ errand: req.resource });
});

/* DELETE /api/errands/:id — BOLA guarded */
router.delete("/:id", validObjectId(), requireOwnership(Errand), async (req, res) => {
  if (String(req.resource.ownerId) !== req.user.id) {
    audit(req.user.id, "DELETE", req.originalUrl, 403, "Non-owner delete blocked", req.ip);
    return res.status(403).json({ error: "Only the owner can delete." });
  }

  await Errand.deleteOne({ _id: req.params.id });
  audit(req.user.id, "DELETE", req.originalUrl, 200, "Owner cancelled errand", req.ip);
  res.json({ ok: true });
});

/* POST /api/errands/:id/accept — delivery runners only */
router.post("/:id/accept", validObjectId(), async (req, res, next) => {
  try {
    if (req.user.role !== "delivery") {
      audit(req.user.id, "POST", req.originalUrl, 403, "Only runners may accept", req.ip);
      return res.status(403).json({ error: "Forbidden: only delivery runners can accept gigs." });
    }

    // Single atomic operation: only one runner can win the race.
    const errand = await Errand.findOneAndUpdate(
      { _id: req.params.id, status: "open", ownerId: { $ne: req.user.id } },
      { status: "in_progress", runnerId: req.user.id },
      { new: true }
    );

    if (!errand) {
      audit(req.user.id, "POST", req.originalUrl, 409, "Accept failed (taken/missing/own)", req.ip);
      return res.status(409).json({ error: "This errand is no longer available." });
    }

    audit(req.user.id, "POST", req.originalUrl, 200, `Accepted ${errand._id}`, req.ip);
    res.json({ errand });
  } catch (err) {
    next(err);
  }
});

/* PATCH /api/errands/:id/status — owner or assigned runner only */
router.patch("/:id/status", validObjectId(), requireOwnership(Errand), async (req, res) => {
  const allowed = ["in_progress", "picked_up", "review", "done", "cancelled"];
  const { status } = req.body || {};
  if (!allowed.includes(status))
    return res
      .status(422)
      .json({ error: "Invalid payload.", fields: { status: `Must be one of: ${allowed.join(", ")}.` } });

  req.resource.status = status;
  await req.resource.save();
  audit(req.user.id, "PATCH", req.originalUrl, 200, `Status → ${status}`, req.ip);
  res.json({ errand: req.resource });
});

export default router;