/**
 * Seed script (development only).
 *
 *   npm run seed                     create the admin account, or rotate its password
 *   npm run seed -- --demo           also create the demo student and two runners (no errands are seeded)
 *   npm run seed -- --demo --reset   wipe users and errands first (audit_logs is kept)
 *
 * Passwords come from backend/.env (ADMIN_PASSWORD, DEMO_PASSWORD) and are never
 * stored in source code. Only bcrypt hashes reach MongoDB.
 */
import "dotenv/config";
import mongoose from "mongoose";
import { connectDB, disconnectDB } from "./config/db.js";
import { User } from "./models/User.js";
import { Errand } from "./models/Errand.js";
import { PASSWORD } from "./middleware/validate.js";

const args = new Set(process.argv.slice(2));
const RESET = args.has("--reset");
const DEMO = args.has("--demo");

const abort = (msg) => {
  console.error(`\n  Seed aborted: ${msg}\n`);
  process.exit(1);
};

if (process.env.NODE_ENV === "production") {
  abort("refusing to run while NODE_ENV=production.");
}

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "admin@phinmaed.com").trim().toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const DEMO_PASSWORD = process.env.DEMO_PASSWORD;

// Same password policy as registration, so seeded accounts are held to it too.
const requireStrong = (name, value) => {
  const result = PASSWORD.safeParse(value ?? "");
  if (!result.success) {
    abort(`${name} is missing or too weak in backend/.env (${result.error.issues[0].message})`);
  }
};

requireStrong("ADMIN_PASSWORD", ADMIN_PASSWORD);
if (DEMO) requireStrong("DEMO_PASSWORD", DEMO_PASSWORD);

// First 7 characters of a bcrypt hash are "$2a$12$": algorithm and cost only.
const hashPrefix = async (id) => {
  const doc = await User.findById(id).select("+passwordHash");
  return doc.passwordHash.slice(0, 7);
};

const run = async () => {
  await connectDB();
  console.log(`\n  Target database: ${mongoose.connection.host} / ${mongoose.connection.name}`);

  if (RESET) {
    console.log("  --reset: clearing users and errands (audit_logs is kept) ...");
    await Promise.all([User.deleteMany({}), Errand.deleteMany({})]);
  }

  // Admin: created if missing; if it exists, its password is set to ADMIN_PASSWORD.
  let admin = await User.findOne({ email: ADMIN_EMAIL });
  const adminIsNew = !admin;
  if (!admin) {
    admin = new User({ fullName: "Campus Admin", studentId: null, email: ADMIN_EMAIL, role: "admin" });
  }
  admin.role = "admin";
  admin.status = "active";
  admin.password = ADMIN_PASSWORD; // virtual: bcrypt-hashed by the model hook
  await admin.save();
  console.log(
    `  ${adminIsNew ? "+ created" : "~ updated"} admin ${ADMIN_EMAIL}  hash ${await hashPrefix(admin._id)}...`,
  );

  if (DEMO) {
    const people = [
      { fullName: "John Dela Cruz", studentId: "04-2021-00456", email: "john.upang@phinmaed.com", role: "student" },
      { fullName: "Mark Tan", studentId: "04-2122-00902", email: "mark.tan@phinmaed.com", role: "delivery" },
      { fullName: "Ella Santos", studentId: "04-2223-01377", email: "ella.santos@phinmaed.com", role: "delivery" },
    ];

    for (const p of people) {
      const existing = await User.findOne({ email: p.email });
      if (existing) {
        console.log(`  = ${p.role.padEnd(9)} ${p.email} already exists (left unchanged)`);
        continue;
      }
      const user = new User(p);
      user.password = DEMO_PASSWORD;
      await user.save();
      console.log(`  + ${p.role.padEnd(9)} ${p.email}  hash ${await hashPrefix(user._id)}...`);
    }
  }

  await User.syncIndexes();
  await Errand.syncIndexes();

  console.log("\n  Done. Passwords exist only as bcrypt hashes.");
  console.log("  Verify: Atlas -> Browse Collections -> upang_delivers -> users -> passwordHash\n");
  await disconnectDB();
};

run().catch(async (e) => {
  console.error("  Seed failed:", e.message);
  await disconnectDB();
  process.exit(1);
});