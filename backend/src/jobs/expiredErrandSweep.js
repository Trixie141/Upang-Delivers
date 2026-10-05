import { Errand } from "../models/Errand.js";
import { audit } from "../models/AuditLog.js";
import { RunnerLocation } from "../models/RunnerLocation.js";

const SWEEP_INTERVAL_MS = 60 * 1000; // check every minute

/**
 * Auto-cancel errands that pass their deadline before completion.
 *
 * Each cancellation is its own atomic findOneAndUpdate, using the same
 * filter-and-update-together pattern as POST /:id/accept. That matters here:
 * if a runner accepts the errand in the same instant the sweep runs, the
 * atomic filter (status: "open") ensures only one of the two operations can
 * win — an accept can never be silently overwritten by a cancel that started
 * a moment earlier.
 */
export async function sweepExpiredErrands() {
  const now = new Date();

  // Keep receipt images for three days after pickup, then free the stored BSON
  // space while leaving the bill amount on the errand for the payment record.
  const receiptCleanup = await Errand.updateMany(
    { receiptImage: { $type: "string" }, receiptExpiresAt: { $lte: now } },
    { $unset: { receiptImage: "", receiptExpiresAt: "" } },
  );

  // Read-only pass to find candidates; the actual state change happens
  // per-document below, atomically, so this list is just a work queue.
  const candidates = await Errand.find(
    { status: { $in: ["open", "in_progress", "picked_up"] }, deadline: { $lte: now } },
    { _id: 1 },
  );

  let cancelledCount = 0;

  for (const { _id } of candidates) {
    const errand = await Errand.findOneAndUpdate(
      { _id, status: { $in: ["open", "in_progress", "picked_up"] }, deadline: { $lte: now } },
      { status: "cancelled", cancelReason: "Deadline passed before completion." },
      { new: true },
    );

    if (errand) {
      cancelledCount += 1;
      await RunnerLocation.deleteOne({ errandId: errand._id });
      audit(
        "system",
        "AUTO",
        `/api/errands/${errand._id}/status`,
        200,
        "Auto-cancelled: deadline passed before completion",
        "",
      );
    }
  }

  if (cancelledCount > 0) {
    console.log(`[expiredErrandSweep] auto-cancelled ${cancelledCount} expired errand(s)`);
  }

  return { cancelledCount, deletedReceiptCount: receiptCleanup.modifiedCount };
}

/** Starts the recurring sweep. Call once, after the DB connection is established. */
export function startExpiredErrandSweep(intervalMs = SWEEP_INTERVAL_MS) {
  sweepExpiredErrands().catch((err) => {
    console.error("[expiredErrandSweep] initial sweep failed:", err);
  });

  const timer = setInterval(() => {
    sweepExpiredErrands().catch((err) => {
      console.error("[expiredErrandSweep] sweep failed:", err);
    });
  }, intervalMs);

  // Don't let this timer alone keep the process alive (e.g. during tests).
  timer.unref?.();

  return timer;
}
