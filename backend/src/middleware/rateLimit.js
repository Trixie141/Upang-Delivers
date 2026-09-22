import rateLimit from "express-rate-limit";
import MongoStore from "rate-limit-mongo";
import "dotenv/config";
import { audit } from "../models/AuditLog.js";

const windowMs = Number(process.env.AUTH_RATE_WINDOW_MS || 60_000);
const max = Number(process.env.AUTH_RATE_MAX || 5);

/**
 * rate-limit-mongo connects with its own MongoClient and ignores mongoose's
 * dbName option — if the URI has no database in its path, MongoClient
 * defaults to "test", where our Atlas user has no permissions.
 * This forces the same database (upang_delivers) into the URI's path.
 */
function withDbName(uri, dbName) {
  try {
    const url = new URL(uri);
    if (!url.pathname || url.pathname === "/") {
      url.pathname = `/${dbName}`;
    }
    return url.toString();
  } catch {
    console.warn("  rate-limit: could not parse MONGODB_URI, using as-is");
    return uri;
  }
}

function mongoStore(collectionName) {
  if (!process.env.MONGODB_URI) {
    console.warn(`  rate-limit: MONGODB_URI not set, "${collectionName}" is using memory`);
    return undefined;
  }

  const uri = withDbName(process.env.MONGODB_URI, process.env.MONGODB_DB || "upang_delivers");

  return new MongoStore({
    uri,
    collectionName,
    expireTimeMs: windowMs,
    errorHandler: (e) => console.error("  rate-limit store:", e.message),
  });
}

// Safe email key: never throws on objects/arrays, lowercased, length-capped.
const emailKey = (req) =>
  (typeof req.body?.email === "string" ? req.body.email : "anon")
    .trim()
    .toLowerCase()
    .slice(0, 80);

/** 5 attempts / 60s per (IP + email) on every /api/auth/* route. */
export const authLimiter = rateLimit({
  windowMs,
  max,
  standardHeaders: true,
  legacyHeaders: false,
  store: mongoStore("rate_limits_auth"),
  keyGenerator: (req) => {
  const key = `${req.ip}:${emailKey(req)}`;
  console.log("RATE LIMIT KEY:", key, "| X-Forwarded-For:", req.headers["x-forwarded-for"]);
  return key;
},
  handler: (req, res) => {
    const retryIn = Math.ceil(windowMs / 1000);
    audit(emailKey(req), req.method, req.originalUrl, 429, `Rate limit hit (${max}/${retryIn}s)`, req.ip);
    res.status(429).json({
      error: `Too many attempts. Try again in ${retryIn}s.`,
      retryAfterSeconds: retryIn,
    });
  },
});

/** Softer global ceiling for the rest of the API. */
export const apiLimiter = rateLimit({
  windowMs: 60_000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  store: mongoStore("rate_limits_api"),
});

export const limits = { windowMs, max };