import { Router } from "express";
import bcrypt from "bcryptjs";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import "dotenv/config";
import { User } from "../models/User.js";
import { audit } from "../models/AuditLog.js";
import {
  forgotPasswordSchema,
  completeRegistrationSchema,
  changePasswordSchema,
  emailCodeSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  validate,
  profileSchema,
} from "../middleware/validate.js";
import { authLimiter } from "../middleware/rateLimit.js";
import { requireAuth, signToken } from "../middleware/auth.js";
import { EmailCode } from "../models/EmailCode.js";
import { sendEmailCode } from "../services/email.js";

const router = Router();

// Dummy hash so a missing account costs the same time as a wrong password
// (prevents user-enumeration through response timing).
const DUMMY_HASH = "$2a$12$CwTycUXWue0Thq9StjUM0uJ8.aB1u2w1oRz1nJ2yQnQmYYQmB7yDa";

const hashCode = (code) => createHmac("sha256", process.env.JWT_SECRET).update(code).digest("hex");

async function issueEmailCode(email, purpose) {
  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  await EmailCode.deleteMany({ email, purpose });
  await EmailCode.create({
    email,
    purpose,
    codeHash: hashCode(code),
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  });
  try {
    await sendEmailCode({ to: email, code, purpose });
    return true;
  } catch (err) {
    await EmailCode.deleteMany({ email, purpose });
    console.error("  email delivery failed:", err.message);
    return false;
  }
}

async function validEmailCode(email, purpose, code) {
  const record = await EmailCode.findOne({ email, purpose, expiresAt: { $gt: new Date() }, attempts: { $lt: 5 } })
    .select("+codeHash");
  if (!record) return null;
  const provided = Buffer.from(hashCode(code), "hex");
  const expected = Buffer.from(record.codeHash, "hex");
  if (!timingSafeEqual(provided, expected)) {
    await EmailCode.updateOne(
      { _id: record._id, codeHash: record.codeHash, attempts: { $lt: 5 } },
      { $inc: { attempts: 1 } },
    );
    return null;
  }
  // Consume the code atomically: only one concurrent request can claim it.
  return EmailCode.findOneAndDelete({
    _id: record._id,
    codeHash: record.codeHash,
    expiresAt: { $gt: new Date() },
    attempts: { $lt: 5 },
  });
}

/* POST /api/auth/register ------------------------------------------------- */
router.post("/register", authLimiter, validate(registerSchema), async (req, res, next) => {
  try {
    const { fullName, studentId, email, password, role } = req.valid;

    const existingEmail = await User.findOne({ email });
    const legacyUnverified = existingEmail?.status === "pending" && existingEmail.emailVerified === false;
    if (existingEmail && !legacyUnverified) {
      audit(email, "POST", "/api/auth/register", 422, "Duplicate email", req.ip);
      return res.status(422).json({
        error: "Invalid payload.",
        fields: { email: "An account with this email already exists." },
      });
    }
    if (studentId && (await User.exists({ studentId, ...(legacyUnverified ? { _id: { $ne: existingEmail._id } } : {}) }))) {
      audit(email, "POST", "/api/auth/register", 422, "Duplicate student ID", req.ip);
      return res.status(422).json({
        error: "Invalid payload.",
        fields: { studentId: "This Student ID is already registered." },
      });
    }

    // A prior version saved unverified signups in users. Remove that legacy
    // placeholder when the owner retries signup; new attempts store only a
    // short-lived hashed email code until the user proves mailbox ownership.
    if (legacyUnverified) await User.deleteOne({ _id: existingEmail._id, emailVerified: false, status: "pending" });
    const emailSent = await issueEmailCode(email, "signup");
    audit(email, "POST", "/api/auth/register", emailSent ? 202 : 503, "Signup verification requested", req.ip);
    res.status(202).json({ verificationRequired: true, emailSent, email });
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

/* POST /api/auth/complete-registration ------------------------------------ */
router.post("/complete-registration", authLimiter, validate(completeRegistrationSchema), async (req, res, next) => {
  try {
    const { fullName, studentId, email, password, role, code } = req.valid;
    if (await User.exists({ email })) {
      return res.status(422).json({ error: "An account with this email already exists.", fields: { email: "An account with this email already exists." } });
    }
    if (studentId && await User.exists({ studentId })) {
      return res.status(422).json({ error: "This Student ID is already registered.", fields: { studentId: "This Student ID is already registered." } });
    }
    const record = await validEmailCode(email, "signup", code);
    if (!record) {
      return res.status(400).json({ error: "That code is invalid or expired. Request a new one.", code: "INVALID_EMAIL_CODE" });
    }
    // Successful SMTP-code verification is the account approval step.
    const user = new User({ fullName, studentId, email, role, status: "active", emailVerified: true });
    user.password = password;
    await user.save();
    await EmailCode.deleteMany({ email, purpose: "signup" });
    audit(email, "POST", "/api/auth/verify-email", 200, "Email verified; account activated", req.ip);
    res.json({ token: signToken(user), user: user.toSafeJSON() });
  } catch (err) {
    next(err);
  }
});

/* POST /api/auth/verify-email — verify and activate legacy unverified accounts */
router.post("/verify-email", authLimiter, validate(emailCodeSchema), async (req, res, next) => {
  try {
    const { email, code } = req.valid;
    const user = await User.findOne({ email, status: "pending", emailVerified: false });
    const record = await validEmailCode(email, "signup", code);
    if (!user || !record) return res.status(400).json({ error: "That code is invalid or expired. Request a new one.", code: "INVALID_EMAIL_CODE" });
    user.emailVerified = true;
    user.status = "active";
    await user.save();
    await EmailCode.deleteMany({ email, purpose: "signup" });
    audit(email, "POST", "/api/auth/verify-email", 200, "Legacy account email verified; account activated", req.ip);
    res.json({ token: signToken(user), user: user.toSafeJSON() });
  } catch (err) {
    next(err);
  }
});

/* POST /api/auth/resend-verification -------------------------------------- */
router.post("/resend-verification", authLimiter, validate(forgotPasswordSchema), async (req, res, next) => {
  try {
    const { email } = req.valid;
    const emailSent = await issueEmailCode(email, "signup");
    if (!emailSent) return res.status(503).json({ error: "Email delivery is not configured yet. Please try again later." });
    audit(email, "POST", "/api/auth/resend-verification", 200, "Signup verification code sent", req.ip);
    res.json({ message: "A new verification code was sent." });
  } catch (err) {
    next(err);
  }
});

/* POST /api/auth/forgot-password ------------------------------------------ */
router.post("/forgot-password", authLimiter, validate(forgotPasswordSchema), async (req, res, next) => {
  try {
    const { email } = req.valid;
    const user = await User.findOne({ email, emailVerified: { $ne: false }, status: "active" });
    if (user) {
      const sent = await issueEmailCode(email, "password_reset");
      if (!sent) return res.status(503).json({ error: "Email delivery is not configured yet. Please try again later." });
    }
    res.json({ message: "If an active account uses that email, a reset code was sent." });
  } catch (err) {
    next(err);
  }
});

/* POST /api/auth/reset-password ------------------------------------------- */
router.post("/reset-password", authLimiter, validate(resetPasswordSchema), async (req, res, next) => {
  try {
    const { email, code, password } = req.valid;
    const user = await User.findOne({ email, emailVerified: { $ne: false }, status: "active" }).select("+passwordHash");
    const record = await validEmailCode(email, "password_reset", code);
    if (!user || !record)
      return res.status(400).json({ error: "That code is invalid or expired. Request a new one." });

    user.password = password;
    await user.save();
    await EmailCode.deleteMany({ email, purpose: "password_reset" });
    audit(email, "POST", "/api/auth/reset-password", 200, "Password reset", req.ip);
    res.json({ message: "Password reset. You can now log in." });
  } catch (err) {
    next(err);
  }
});

/* POST /api/auth/login ---------------------------------------------------- */
router.post("/login", authLimiter, validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password, requestedRole } = req.valid;
    if (!requestedRole) {
      return res.status(400).json({ error: "Choose Student or Runner login to continue." });
    }
    const user = await User.findOne({ email }).select("+passwordHash");

    const ok = user
      ? await user.verifyPassword(password)
      : await bcrypt.compare(password, DUMMY_HASH);

    if (!user || !ok) {
      if (user) await User.updateOne({ _id: user._id }, { $inc: { failedLogins: 1 } });
      audit(email, "POST", "/api/auth/login", 401, "Invalid credentials", req.ip);
      return res.status(401).json({ error: "Invalid email or password." });
    }
    if (user.emailVerified === false) {
      audit(email, "POST", "/api/auth/login", 403, "Email verification required", req.ip);
      return res.status(403).json({
        error: "Verify your email before logging in.",
        code: "EMAIL_NOT_VERIFIED",
      });
    }
    // Migrate older verified accounts that were left pending by the former
    // administrator-approval flow. SMTP email verification is sufficient.
    if (user.status === "pending" && user.emailVerified !== false) {
      user.status = "active";
      await user.save();
    }
    if (user.status !== "active") {
      audit(email, "POST", "/api/auth/login", 403, "Suspended account", req.ip);
      return res.status(403).json({ error: "This account is suspended." });
    }
      if (user.role === "admin") {
        audit(email, "POST", "/api/auth/login", 403, "Admin must use the admin portal", req.ip);
        return res.status(403).json({ error: "Admins must sign in through the Admin Portal." });
      }
      if (requestedRole && user.role !== requestedRole) {
        const accountLabel = user.role === "delivery" ? "runner" : "student";
        audit(email, "POST", "/api/auth/login", 403, `Role mismatch (${user.role} at ${requestedRole} login)`, req.ip);
        return res.status(403).json({
          error: `This is a ${accountLabel} account. Please use ${accountLabel === "runner" ? "Runner" : "Student"} login.`,
          code: "ROLE_MISMATCH",
        });
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
    const { fullName, studentId, email, phone, spot, currentPassword, available } = req.valid;

    const user = await User.findById(req.user.id).select("+passwordHash");
    if (!user) return res.status(404).json({ error: "User not found." });

    if (user.role !== "admin" && !studentId) {
      return res.status(422).json({ error: "Student ID is required for student and runner accounts.", fields: { studentId: "Student ID is required." } });
    }

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
    user.studentId = studentId || null;
    user.email = email;
    user.phone = phone;
    user.spot = spot;
    if (user.role === "delivery" && typeof available === "boolean") user.available = available;
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

/* POST /api/auth/change-password ------------------------------------------ */
router.post("/change-password", authLimiter, requireAuth, validate(changePasswordSchema), async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.valid;
    const user = await User.findById(req.user.id).select("+passwordHash");
    if (!user) return res.status(404).json({ error: "User not found." });
    if (!(await user.verifyPassword(currentPassword)))
      return res.status(403).json({ error: "Current password is incorrect.", fields: { currentPassword: "Current password is incorrect." } });
    user.password = newPassword;
    await user.save();
    audit(user.email, "POST", "/api/auth/change-password", 200, "Password changed", req.ip);
    res.json({ message: "Password changed successfully." });
  } catch (err) {
    next(err);
  }
});

export default router;
