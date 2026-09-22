import { Router } from "express";
import bcrypt from "bcryptjs";
import "dotenv/config";
import { User } from "../models/User.js";
import { audit } from "../models/AuditLog.js";
import { loginSchema, registerSchema, validate, profileSchema } from "../middleware/validate.js";
import { authLimiter } from "../middleware/rateLimit.js";
import { requireAuth, signToken } from "../middleware/auth.js";

const router = Router();

// Dummy hash so a missing account costs the same time as a wrong password
// (prevents user-enumeration through response timing).
const DUMMY_HASH = "$2a$12$CwTycUXWue0Thq9StjUM0uJ8.aB1u2w1oRz1nJ2yQnQmYYQmB7yDa";

/* POST /api/auth/register ------------------------------------------------- */
router.post("/register", authLimiter, validate(registerSchema), async (req, res, next) => {
  try {
    const { fullName, studentId, email, password, role } = req.valid;

    if (await User.exists({ email })) {
      audit(email, "POST", "/api/auth/register", 422, "Duplicate email", req.ip);
      return res.status(422).json({
        error: "Invalid payload.",
        fields: { email: "An account with this email already exists." },
      });
    }
    if (studentId && (await User.exists({ studentId }))) {
      audit(email, "POST", "/api/auth/register", 422, "Duplicate student ID", req.ip);
      return res.status(422).json({
        error: "Invalid payload.",
        fields: { studentId: "This Student ID is already registered." },
      });
    }

    // `password` is a virtual — the pre-save hook bcrypt-hashes it, so the
    // plaintext value never reaches MongoDB Atlas.
    const user = new User({ fullName, studentId, email, role });
    user.password = password;
    await user.save();

    audit(user.email, "POST", "/api/auth/register", 201, `Created ${user._id}`, req.ip);
    res.status(201).json({ token: signToken(user), user: user.toSafeJSON() });
  } catch (err) {
    if (err?.code === 11000) {
      const field = Object.keys(err.keyPattern || { email: 1 })[0];
      return res
        .status(422)
        .json({ error: "Invalid payload.", fields: { [field]: "Already registered." } });
    }
    next(err);
  }
});

/* POST /api/auth/login ---------------------------------------------------- */
router.post("/login", authLimiter, validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.valid;
    const user = await User.findOne({ email }).select("+passwordHash");

    const ok = user
      ? await user.verifyPassword(password)
      : await bcrypt.compare(password, DUMMY_HASH);

    if (!user || !ok) {
      if (user) await User.updateOne({ _id: user._id }, { $inc: { failedLogins: 1 } });
      audit(email, "POST", "/api/auth/login", 401, "Invalid credentials", req.ip);
      return res.status(401).json({ error: "Invalid email or password." });
    }
    if (user.status !== "active") {
      audit(email, "POST", "/api/auth/login", 403, "Suspended account", req.ip);
      return res.status(403).json({ error: "This account is suspended." });
    }
    if (user.role === "admin") {
      audit(email, "POST", "/api/auth/login", 403, "Admin must use the admin portal", req.ip);
      return res.status(403).json({ error: "Admins must sign in through the Admin Portal." });
    }

    await User.updateOne({ _id: user._id }, { failedLogins: 0, lastLoginAt: new Date() });
    audit(email, "POST", "/api/auth/login", 200, `Session issued (${user.role})`, req.ip);
    res.json({ token: signToken(user), user: user.toSafeJSON() });
  } catch (err) {
    next(err);
  }
});

/* POST /api/auth/admin/login ---------------------------------------------- */
router.post("/admin/login", authLimiter, validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.valid;
    const user = await User.findOne({ email }).select("+passwordHash");
    const ok = user
      ? await user.verifyPassword(password)
      : await bcrypt.compare(password, DUMMY_HASH);

    if (!user || !ok) {
      if (user) await User.updateOne({ _id: user._id }, { $inc: { failedLogins: 1 } });
      audit(email, "POST", "/api/auth/admin/login", 401, "Invalid credentials", req.ip);
      return res.status(401).json({ error: "Invalid email or password." });
    }
    if (user.role !== "admin") {
      audit(email, "POST", "/api/auth/admin/login", 403, "Non-admin at admin portal", req.ip);
      return res.status(403).json({ error: "This portal is restricted to administrators." });
    }

    await User.updateOne({ _id: user._id }, { failedLogins: 0, lastLoginAt: new Date() });
    audit(email, "POST", "/api/auth/admin/login", 200, "Admin session issued", req.ip);
    res.json({ token: signToken(user), user: user.toSafeJSON() });
  } catch (err) {
    next(err);
  }
});

/* GET /api/auth/me ---------------------------------------------------------
 * Returns the logged-in user's own profile. Always reads req.user.id from the
 * verified JWT (set by requireAuth) — never from a query param or the body —
 * so one user can never fetch another user's data by guessing an id.
 */
router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found." });
    res.json({ user: user.toSafeJSON() });
  } catch (err) {
    next(err);
  }
});

/* PATCH /api/auth/me --------------------------------------------------------
 * Updates the caller's own editable profile fields. Changing the login email
 * requires the current password, so a hijacked/left-open session can't be
 * used to silently take over the account by swapping the email address.
 */
router.patch("/me", requireAuth, validate(profileSchema), async (req, res, next) => {
  try {
    const { fullName, studentId, email, phone, spot, currentPassword } = req.valid;

    const user = await User.findById(req.user.id).select("+passwordHash");
    if (!user) return res.status(404).json({ error: "User not found." });

    if (email !== user.email) {
      const ok = await user.verifyPassword(currentPassword);
      if (!ok) {
        return res.status(403).json({
          error: "Current password is incorrect.",
          fields: { currentPassword: "Current password is incorrect." },
        });
      }
    }

    user.fullName = fullName;
    user.studentId = studentId;
    user.email = email;
    user.phone = phone;
    user.spot = spot;
    await user.save();

    audit(user.email, "PATCH", "/api/auth/me", 200, "Profile updated", req.ip);
    res.json({ user: user.toSafeJSON() });
  } catch (err) {
    if (err?.code === 11000) {
      const isId = "studentId" in (err.keyPattern ?? {});
      const msg = isId
        ? "That student ID is already registered."
        : "That email is already registered.";
      return res.status(409).json({ error: msg, fields: { [isId ? "studentId" : "email"]: msg } });
    }
    next(err);
  }
});

export default router;