import { Router } from "express";
import mongoose from "mongoose";
import { Errand } from "../models/Errand.js";
import { audit } from "../models/AuditLog.js";
import { errandSchema, validate, reviewSchema, locationSchema, pickupEvidenceSchema } from "../middleware/validate.js";
import { requireAuth, requireOwnership, validObjectId } from "../middleware/auth.js";
import { Transaction } from "../models/Transaction.js";
import { Review } from "../models/Review.js";
import { RunnerLocation } from "../models/RunnerLocation.js";
import { User } from "../models/User.js";
import { Notification } from "../models/Notification.js";
import { sweepExpiredErrands } from "../jobs/expiredErrandSweep.js";

const router = Router();
router.use(requireAuth);

/* GET /api/errands/reviews/me - ratings received by the signed-in runner. */
router.get("/reviews/me", async (req, res, next) => {
  try {
    const reviews = await Review.find({ revieweeId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("rating comment createdAt")
      .lean();
    const summary = await Review.aggregate([
      { $match: { revieweeId: new mongoose.Types.ObjectId(req.user.id) } },
      { $group: { _id: null, average: { $avg: "$rating" }, count: { $sum: 1 } } },
    ]);
    res.json({ average: summary[0]?.average ?? null, count: summary[0]?.count ?? 0, reviews });
  } catch (err) {
    next(err);
  }
});

const STATUSES = ["in_progress", "picked_up", "review", "done", "cancelled"];
const FINAL = ["done", "cancelled"]; // once here, an errand can no longer change status

async function saveNotifications(records) {
  if (!records.length) return;
  try {
    await Notification.insertMany(records, { ordered: false });
  } catch (err) {
    // Notification delivery must not turn a successfully saved errand action into an API failure.
    console.error("Notification save failed:", err.message);
  }
}

async function attachRunnerLocations(errands) {
  if (!errands.length) return [];
  const locations = await RunnerLocation.find({
    errandId: { $in: errands.map((errand) => errand._id) },
  }).lean();
  const byErrand = new Map(locations.map((location) => [String(location.errandId), location]));

  return errands.map((errand) => {
    const value = errand.toObject();
    return {
      ...value,
      runnerLocation: byErrand.get(String(errand._id)) || null,
    };
  });
}

/* GET /api/errands - public board (open errands only) */
router.get("/", async (req, res, next) => {
  try {
    await sweepExpiredErrands();
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
    await sweepExpiredErrands();
    const errands = await Errand.find({
      $or: [{ ownerId: req.user.id }, { runnerId: req.user.id }],
    })
      .sort({ createdAt: -1 })
      .populate("ownerId", "fullName role phone")
      .populate("runnerId", "fullName role");
    res.json({ errands: await attachRunnerLocations(errands) });
  } catch (err) {
    next(err);
  }
});

/* POST /api/errands - validated; ownerId comes from the JWT, not the body */
router.post("/", validate(errandSchema), async (req, res, next) => {
  try {
    const errand = await Errand.create({ ...req.valid, ownerId: req.user.id });
    const runners = await User.find({
      role: "delivery",
      status: "active",
      emailVerified: { $ne: false },
      available: { $ne: false },
      _id: { $ne: req.user.id },
    }).select("_id").lean();
    await saveNotifications(runners.map((runner) => ({
      recipientId: runner._id,
      errandId: errand._id,
      type: "new_errand",
      title: "New campus errand",
      message: `${errand.title} · ₱${errand.reward} runner reward. Review it and accept if available.`,
    })));
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
router.get("/:id", validObjectId(), requireOwnership(Errand), async (req, res) => {
  audit(req.user.id, "GET", req.originalUrl, 200, "Ownership verified", req.ip);
  const [errand] = await attachRunnerLocations([req.resource]);
  res.json({ errand });
});

/* DELETE /api/errands/:id - owner only (requireOwnership also admits the runner) */
router.delete("/:id", validObjectId(), requireOwnership(Errand), async (req, res, next) => {
  try {
    if (String(req.resource.ownerId) !== req.user.id) {
      audit(req.user.id, "DELETE", req.originalUrl, 403, "Non-owner delete blocked", req.ip);
      return res.status(403).json({ error: "Only the owner can delete." });
    }

    await Errand.deleteOne({ _id: req.params.id });
    await RunnerLocation.deleteOne({ errandId: req.resource._id });
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

    const runner = await User.findById(req.user.id).select("available fullName").lean();
    if (!runner || runner.available === false) {
      return res.status(403).json({ error: "You are marked unavailable. Turn on availability in your profile before accepting a gig." });
    }

    // One atomic operation: the filter and the update happen together, so only
    // one runner can win the race, and nobody can accept their own errand.
    const errand = await Errand.findOneAndUpdate(
      { _id: req.params.id, status: "open", deadline: { $gt: new Date() }, ownerId: { $ne: req.user.id } },
      { status: "in_progress", runnerId: req.user.id },
      { new: true },
    );

    if (!errand) {
      await sweepExpiredErrands();
      audit(req.user.id, "POST", req.originalUrl, 409, "Accept failed (taken, missing or own)", req.ip);
      return res.status(409).json({ error: "This errand is no longer available or its deadline has passed." });
    }

    await saveNotifications([{
      recipientId: errand.ownerId,
      errandId: errand._id,
      type: "accepted",
      title: "Your errand was accepted",
      message: `${runner.fullName} accepted “${errand.title}” and is starting the errand.`,
    }]);

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

    if (status === "picked_up") {
      return res.status(409).json({ error: "Submit the bill amount and receipt to confirm pickup." });
    }

    if (new Date(req.resource.deadline).getTime() <= Date.now()) {
      await sweepExpiredErrands();
      return res.status(409).json({ error: "This errand's deadline has passed and it was cancelled." });
    }

    req.resource.status = status;
    await req.resource.save();

    // A terminal errand no longer shares the runner's live position with the
    // requester. Remove the saved GPS point as soon as delivery is completed
    // (or cancelled), so later reads cannot expose a stale location.
    if (FINAL.includes(status)) {
      await RunnerLocation.deleteOne({ errandId: req.resource._id });
    }

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

/* POST /api/errands/:id/pickup - runner confirms pickup with bill and receipt */
router.post(
  "/:id/pickup",
  validObjectId(),
  requireOwnership(Errand),
  validate(pickupEvidenceSchema),
  async (req, res, next) => {
    try {
      if (String(req.resource.runnerId) !== req.user.id) {
        return res.status(403).json({ error: "Only the assigned runner can confirm pickup." });
      }
      if (new Date(req.resource.deadline).getTime() <= Date.now()) {
        await sweepExpiredErrands();
        return res.status(409).json({ error: "This errand's deadline has passed and it was cancelled." });
      }

      const errand = await Errand.findOneAndUpdate(
        {
          _id: req.resource._id,
          runnerId: req.user.id,
          status: "in_progress",
          deadline: { $gt: new Date() },
        },
        {
          $set: {
            status: "picked_up",
            billAmount: req.valid.billAmount,
            receiptImage: req.valid.receiptImage,
            pickedUpAt: new Date(),
            receiptExpiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          },
        },
        { new: true, runValidators: true },
      );

      if (!errand) {
        await sweepExpiredErrands();
        return res.status(409).json({ error: "This errand is no longer available for pickup." });
      }

      await saveNotifications([{
        recipientId: errand.ownerId,
        errandId: errand._id,
        type: "picked_up",
        title: "Your items were picked up",
        message: `The runner picked up “${errand.title}” and is on the way to you. Bill to reimburse: ₱${errand.billAmount}.`,
      }]);

      audit(req.user.id, "POST", req.originalUrl, 200, "Pickup confirmed with bill evidence", req.ip);
      res.json({ ok: true, errand: errand.toJSON() });
    } catch (err) {
      next(err);
    }
  },
);

/* GET /api/errands/:id/pickup-evidence - owner or assigned runner only */
router.get("/:id/pickup-evidence", validObjectId(), requireOwnership(Errand), async (req, res) => {
  const errand = await Errand.findById(req.params.id).select("+receiptImage billAmount pickedUpAt");
  if (!errand || errand.billAmount === null || errand.billAmount === undefined) {
    return res.status(404).json({ error: "Pickup evidence is not available for this errand." });
  }
  res.json({
    billAmount: errand.billAmount,
    receiptImage: errand.receiptImage || null,
    pickedUpAt: errand.pickedUpAt,
  });
});

/* PATCH /api/errands/:id/location - runner reports live GPS while active */
router.patch(
  "/:id/location",
  validObjectId(),
  requireOwnership(Errand),
  validate(locationSchema),
  async (req, res, next) => {
    try {
      if (String(req.resource.runnerId) !== req.user.id) {
        return res.status(403).json({ error: "Only the assigned runner can share location." });
      }
      if (!["in_progress", "picked_up"].includes(req.resource.status)) {
        return res.status(409).json({ error: "Location sharing is only active during delivery." });
      }
      // Keep GPS in its own collection. Recheck assignment and active status
      // immediately before writing so stale tabs cannot update completed gigs.
      const stillActive = await Errand.exists({
        _id: req.resource._id,
        runnerId: req.user.id,
        status: { $in: ["in_progress", "picked_up"] },
        deadline: { $gt: new Date() },
      });
      if (!stillActive) {
        await sweepExpiredErrands();
        return res.status(409).json({ error: "Location sharing is only active during delivery." });
      }

      const location = await RunnerLocation.findOneAndUpdate(
        { errandId: req.resource._id },
        {
          $set: {
            runnerId: req.user.id,
            ...req.valid,
            updatedAt: new Date(),
          },
          $setOnInsert: { errandId: req.resource._id },
        },
        { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
      );

      // Completion could race with the GPS write after the active check above.
      // Recheck after writing and remove the point if the errand ended meanwhile.
      const remainsActive = await Errand.exists({
        _id: req.resource._id,
        runnerId: req.user.id,
        status: { $in: ["in_progress", "picked_up"] },
        deadline: { $gt: new Date() },
      });
      if (!remainsActive) {
        await sweepExpiredErrands();
        await RunnerLocation.deleteOne({ errandId: req.resource._id });
        return res.status(409).json({ error: "Location sharing is only active during delivery." });
      }
      res.json({ ok: true, location });
    } catch (err) {
      next(err);
    }
  },
);

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
