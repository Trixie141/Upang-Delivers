import "dotenv/config";
import express from "express";
import "express-async-errors"; // Express 4: rejected async handlers reach the error middleware below
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import mongoSanitize from "express-mongo-sanitize";
import mongoose from "mongoose";
import { startExpiredErrandSweep } from "./jobs/expiredErrandSweep.js";

import { connectDB } from "./config/db.js";
import { audit } from "./models/AuditLog.js";
import authRoutes from "./routes/auth.js";
import errandRoutes from "./routes/errands.js";
import adminRoutes from "./routes/admin.js";
import transactionRoutes from "./routes/transaction.js";
import { apiLimiter, limits } from "./middleware/rateLimit.js";

const app = express();
const PORT = Number(process.env.PORT || 5000);
const isProd = process.env.NODE_ENV === "production";

// Number of reverse proxies in front of the app (Render/Heroku = 1, local = 0).
// A wrong value lets clients spoof X-Forwarded-For and dodge the rate limiter.
app.set("trust proxy", Number(process.env.TRUST_PROXY ?? (isProd ? 1 : 0)));

app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    credentials: true,
    // Lets a frontend on another origin (Vercel/Netlify) read the rate-limit counters.
    exposedHeaders: ["RateLimit-Limit", "RateLimit-Remaining", "RateLimit-Reset", "Retry-After"],
  }),
);
app.use(express.json({ limit: "64kb" }));
// Strips $ and . from payloads: blocks NoSQL operator injection like {"$gt":""}
app.use(mongoSanitize({ replaceWith: "_" }));
app.use(morgan(isProd ? "combined" : "dev"));
app.use("/api", apiLimiter);

app.get("/api/health", (req, res) => {
  const connected = mongoose.connection.readyState === 1; // 1 = connected

  // Production: say nothing about the database host or the security setup.
  if (isProd) return res.status(connected ? 200 : 503).json({ ok: connected });

  res.status(connected ? 200 : 503).json({
    ok: connected,
    service: "upang-delivers-api",
    database: {
      driver: "mongoose",
      host: mongoose.connection.host ?? null,
      name: mongoose.connection.name ?? null,
      readyState: mongoose.connection.readyState,
    },
    security: {
      passwordHashing: `bcrypt (cost ${process.env.BCRYPT_ROUNDS || 12}), stored as passwordHash only`,
      inputValidation: "zod schemas + mongoose validators - 422 on invalid payloads",
      nosqlInjection: "express-mongo-sanitize + strict schemas",
      authorization: "JWT + requireRole + requireOwnership (BOLA)",
      rateLimiting: `${limits.max} req / ${limits.windowMs / 1000}s on /api/auth/* (stored in MongoDB)`,
    },
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/errands", errandRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/transactions", transactionRoutes);

app.use((req, res) => res.status(404).json({ error: "Route not found." }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  // Client errors: return the right status and do not log them as server failures.
  if (err?.type === "entity.parse.failed")
    return res.status(400).json({ error: "Malformed JSON." });
  if (err?.type === "entity.too.large")
    return res.status(413).json({ error: "Payload too large." });
  if (err?.name === "ValidationError") {
    const fields = Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v.message]));
    return res.status(422).json({ error: "Invalid payload.", fields });
  }
  if (err?.code === 11000) return res.status(422).json({ error: "Duplicate value." });

  // Anything left is a genuine server error: log it, never leak details to the client.
  console.error(err);
  audit(req.user?.id, req.method, req.originalUrl, 500, err?.message, req.ip);
  res.status(500).json({ error: "Internal server error." });
});
const start = async () => {
  await connectDB();
  startExpiredErrandSweep();
  app.listen(PORT, () => {
    console.log(`  Upang Delivers API  ->  http://localhost:${PORT}/api/health`);
    console.log(
      `  bcrypt cost ${process.env.BCRYPT_ROUNDS || 12} | rate limit ${limits.max}/${limits.windowMs / 1000}s on /api/auth/*\n`,
    );
  });
};

start();

process.on("SIGINT", async () => {
  await mongoose.connection.close();
  console.log("\n  Mongo connection closed. Bye.");
  process.exit(0);
});