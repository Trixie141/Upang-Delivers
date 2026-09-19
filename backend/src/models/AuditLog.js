import mongoose from "mongoose";

const auditSchema = new mongoose.Schema(
  {
    actor: { type: String, default: "anon" },
    method: { type: String, required: true },
    route: { type: String, required: true },
    status: { type: Number, required: true, index: true },
    note: { type: String, default: "" },
    ip: { type: String, default: "" },
  },
  { timestamps: { createdAt: "at", updatedAt: false }, collection: "audit_logs" },
);

// Keep the collection tidy — entries expire after 30 days.
auditSchema.index({ at: -1 });
auditSchema.index({ at: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

export const AuditLog = mongoose.model("AuditLog", auditSchema);

/** Fire-and-forget writer — logging must never break a request. */
export function audit(actor, method, route, status, note = "", ip = "") {
  AuditLog.create({ actor: actor ?? "anon", method, route, status, note, ip }).catch(() => {});
}
