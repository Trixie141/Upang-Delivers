import jwt from "jsonwebtoken";
import "dotenv/config";
import { User } from "../models/User.js";
import { audit } from "../models/AuditLog.js";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32 || /change_?me|replace_?me/i.test(JWT_SECRET)) {  throw new Error("JWT_SECRET is missing or shorter than 32 characters. Set it in backend/.env");
}
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "8h";
const OBJECT_ID = /^[a-f\d]{24}$/i;

/** Issue a token. Only the user id and role go inside; never put secrets in a JWT. */
export function signToken(user) {
  return jwt.sign({ role: user.role }, JWT_SECRET, {
    algorithm: "HS256",
    subject: String(user._id),
    expiresIn: JWT_EXPIRES_IN,
  });
}

/**
 * Verifies the Bearer token, then re-reads the user from the database on every
 * request. A suspended user or a changed role takes effect immediately, instead
 * of waiting for the token to expire.
 */
export async function requireAuth(req, res, next) {
  try {
    const [scheme, token] = (req.headers.authorization || "").split(" ");
    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({ error: "Authentication required." });
    }

    let payload;
    try {
      payload = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] });
    } catch {
      return res.status(401).json({ error: "Invalid or expired token." });
    }

    if (!OBJECT_ID.test(String(payload.sub))) {
      return res.status(401).json({ error: "Invalid or expired token." });
    }

    const user = await User.findById(payload.sub).select("role status").lean();
    if (!user) return res.status(401).json({ error: "Invalid or expired token." });
    if (user.status !== "active") {
      return res.status(403).json({ error: "This account is suspended." });
    }

    // Role comes from the database, not from the token.
    req.user = { id: String(user._id), role: user.role };
    next();
  } catch (err) {
    next(err);
  }
}

/** Use after requireAuth: requireRole("admin") or requireRole("delivery", "admin"). */
export const requireRole =
  (...roles) =>
  (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      audit(req.user?.id, req.method, req.originalUrl, 403, `Role "${req.user?.role}" blocked`, req.ip);
      return res.status(403).json({ error: "Forbidden." });
    }
    next();
  };

/** Rejects malformed ids (like "abc" or objects) before they reach MongoDB. */
export const validObjectId =
  (param = "id") =>
  (req, res, next) => {
    if (typeof req.params[param] !== "string" || !OBJECT_ID.test(req.params[param])) {
      return res.status(404).json({ error: "Resource not found." });
    }
    next();
  };

/**
 * BOLA guard: loads the record and lets the request through only if the
 * logged-in user is its owner or its assigned runner. Everyone else gets the
 * same 404 as a missing record, so ids can't be probed to see what exists.
 * On success the record is available as req.resource.
 */
export const requireOwnership = (Model) => async (req, res, next) => {
  try {
    const doc = await Model.findById(req.params.id);
    const uid = req.user.id;
    const isOwner = doc && String(doc.ownerId) === uid;
    const isRunner = doc && doc.runnerId && String(doc.runnerId) === uid;

    if (!doc || (!isOwner && !isRunner)) {
      if (doc) {
        audit(uid, req.method, req.originalUrl, 403, "BOLA blocked: not owner/runner", req.ip);
      }
      return res.status(404).json({ error: "Resource not found." });
    }

    req.resource = doc;
    next();
  } catch (err) {
    next(err);
  }
};