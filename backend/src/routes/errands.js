import { Router } from "express";
import { Errand } from "../models/Errand.js";
import { audit } from "../models/AuditLog.js";
import { errandSchema, validate, reviewSchema } from "../middleware/validate.js";
import { requireAuth, requireOwnership, validObjectId } from "../middleware/auth.js";
import { Transaction } from "../models/Transaction.js";
import { Review } from "../models/Review.js";

const router = Router();
router.use(requireAuth);

const STATUSES = ["in_progress", "picked_up", "review", "done", "cancelled"];
const FINAL = ["done", "cancelled"]; // once here, an errand can no longer change status

/* GET /api/errands - public board (open errands only) */
router.get("/", async (req, res, next) => {
  try {
    const errands = await Errand.find({ status: "open" })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("ownerId", "fullName role");
    res.json({ errands });
  } catch (err) {
    next(err);
  }
});

/* GET /api/errands/mine - scoped to the caller only */
router.get("/mine", async (req, res, next) => {
  try {
    const errands = await Errand.find({
      $or: [{ ownerId: req.user.id }, { runnerId: req.user.id }],
    })
      .sort({ createdAt: -1 })
      .populate("ownerId", "fullName role")
      .populate("runnerId", "fullName role");
    res.json({ errands });
  } catch (err) {
    next(err);
  }
});

/* POST /api/errands - validated; ownerId comes from the JWT, not the body */
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

/* GET /api/errands/:id - BOLA guarded (owner or assigned runner) */
router.get("/:id", validObjectId(), requireOwnership(Errand), (req, res) => {
  audit(req.user.id, "GET", req.originalUrl, 200, "Ownership verified", req.ip);
  res.json({ errand: req.resource });
});

/* DELETE /api/errands/:id - owner only (requireOwnership also admits the runner) */
router.delete("/:id", validObjectId(), requireOwnership(Errand), async (req, res, next) => {
  try {
    if (String(req.resource.ownerId) !== req.user.id) {
      audit(req.user.id, "DELETE", req.originalUrl, 403, "Non-owner delete blocked", req.ip);
      return res.status(403).json({ error: "Only the owner can delete." });
    }

    await Errand.deleteOne({ _id: req.params.id });
    audit(req.user.id, "DELETE", req.originalUrl, 200, "Owner deleted errand", req.ip);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

/* POST /api/errands/:id/accept - delivery runners only */
router.post("/:id/accept", validObjectId(), async (req, res, next) => {
  try {
    if (req.user.role !== "delivery") {
      audit(req.user.id, "POST", req.originalUrl, 403, "Only runners may accept", req.ip);
      return res.status(403).json({ error: "Forbidden: only delivery runners can accept gigs." });
    }

    // One atomic operation: the filter and the update happen together, so only
    // one runner can win the race, and nobody can accept their own errand.
    const errand = await Errand.findOneAndUpdate(
      { _id: req.params.id, status: "open", ownerId: { $ne: req.user.id } },
      { status: "in_progress", runnerId: req.user.id },
      { new: true },
    );

    if (!errand) {
      audit(req.user.id, "POST", req.originalUrl, 409, "Accept failed (taken, missing or own)", req.ip);
      return res.status(409).json({ error: "This errand is no longer available." });
    }

    audit(req.user.id, "POST", req.originalUrl, 200, `Accepted ${errand._id}`, req.ip);
    res.json({ errand });
  } catch (err) {
    next(err);
  }
});

/* PATCH /api/errands/:id/status - owner or assigned runner only */
router.patch("/:id/status", validObjectId(), requireOwnership(Errand), async (req, res, next) => {
  try {
    const { status } = req.body || {};
    if (typeof status !== "string" || !STATUSES.includes(status)) {
      return res.status(422).json({
        error: "Invalid payload.",
        fields: { status: `Must be one of: ${STATUSES.join(", ")}.` },
      });
    }

    if (FINAL.includes(req.resource.status)) {
      audit(req.user.id, "PATCH", req.originalUrl, 409, `Blocked: already ${req.resource.status}`, req.ip);
      return res.status(409).json({ error: `This errand is already ${req.resource.status}.` });
    }

    req.resource.status = status;
    await req.resource.save();

    // Once an errand is marked done, record the cash-on-delivery handoff.
    // upsert avoids a duplicate-key error if this endpoint is ever called twice.
    if (status === "done") {
      await Transaction.findOneAndUpdate(
        { errandId: req.resource._id },
        {
          errandId: req.resource._id,
          ownerId: req.resource.ownerId,
          runnerId: req.resource.runnerId,
          amount: req.resource.reward,
        },
        { upsert: true, setDefaultsOnInsert: true },
      );
    }

    audit(req.user.id, "PATCH", req.originalUrl, 200, `Status -> ${status}`, req.ip);
    res.json({ errand: req.resource });
  } catch (err) {
    next(err);
  }
});

/* POST /api/errands/:id/review - owner only, and only after the errand is done */
router.post(
  "/:id/review",
  validObjectId(),
  requireOwnership(Errand),
  validate(reviewSchema),
  async (req, res, next) => {
    try {
      if (String(req.resource.ownerId) !== req.user.id) {
        return res.status(403).json({ error: "Only the owner can leave a review." });
      }
      if (req.resource.status !== "done") {
        return res.status(409).json({ error: "You can only review a completed errand." });
      }
      if (!req.resource.runnerId) {
        return res.status(409).json({ error: "This errand has no assigned runner." });
      }

      const review = await Review.create({
        errandId: req.resource._id,
        reviewerId: req.user.id,
        revieweeId: req.resource.runnerId,
        ...req.valid,
      });
      audit(req.user.id, "POST", req.originalUrl, 201, `Reviewed ${review.errandId}`, req.ip);
      res.status(201).json({ review });
    } catch (err) {
      if (err?.code === 11000) return res.status(409).json({ error: "This errand already has a review." });
      next(err);
    }
  },
);

/* GET /api/errands/:id/review - anyone signed in can check whether a review exists */
router.get("/:id/review", validObjectId(), async (req, res) => {
  const review = await Review.findOne({ errandId: req.params.id });
  if (!review) return res.status(404).json({ error: "No review yet." });
  res.json({ review });
});

export default router;