import { User } from "../models/User.js";

/** Reactivate temporary suspensions when their chosen period expires. */
export function startSuspensionSweep() {
  const reactivateExpired = async () => {
    try {
      const result = await User.updateMany(
        { status: "suspended", suspendedUntil: { $ne: null, $lte: new Date() } },
        { $set: { status: "active", suspensionReason: "", suspendedUntil: null } },
      );
      if (result.modifiedCount) console.log(`Reactivated ${result.modifiedCount} account(s) after suspension expiry.`);
    } catch (error) {
      console.error("Could not reactivate expired suspensions:", error.message);
    }
  };
  void reactivateExpired();
  return setInterval(reactivateExpired, 60_000);
}
