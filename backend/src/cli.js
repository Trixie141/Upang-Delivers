#!/usr/bin/env node
/**
 * MongoDB Atlas console for this project.
 *
 *   npm run db                  interactive
 *   npm run db -- hashes        one-shot command
 *   npm run db:shell            drop into the real `mongosh` (needs mongosh installed)
 */
import readline from "node:readline";
import mongoose from "mongoose";
import { connectDB, disconnectDB } from "./config/db.js";
import { User } from "./models/User.js";
import { Errand } from "./models/Errand.js";
import { AuditLog } from "./models/AuditLog.js";

const HELP = `
Commands
  collections            list collections in the database
  users                  all users (passwordHash hidden, as the API returns them)
  hashes                 users WITH passwordHash — proof that nothing is plaintext
  plaintext              scan every document for a plaintext password field
  errands                all errands with owner ids
  log [n]                recent audit_logs entries
  indexes                show indexes (unique email / sparse studentId)
  stats                  document counts
  find <col> <json>      raw query, e.g.  find users {"role":"admin"}
  exit                   quit
`;

function table(rows) {
  if (!rows?.length) return console.log("(0 documents)");
  const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const w = {};
  for (const c of cols)
    w[c] = Math.min(42, Math.max(c.length, ...rows.map((r) => String(r[c] ?? "—").length)));
  console.log(" " + cols.map((c) => c.padEnd(w[c])).join(" | "));
  console.log(cols.map((c) => "-".repeat(w[c] + 2)).join("+"));
  for (const r of rows)
    console.log(
      " " + cols.map((c) => String(r[c] ?? "—").slice(0, w[c]).padEnd(w[c])).join(" | "),
    );
  console.log(`(${rows.length} document${rows.length === 1 ? "" : "s"})`);
}

async function run(raw) {
  const [cmd, ...rest] = raw.trim().split(/\s+/);
  const arg = rest.join(" ");
  try {
    switch (cmd) {
      case "":
        return;
      case "help":
        return console.log(HELP);

      case "collections": {
        const cols = await mongoose.connection.db.listCollections().toArray();
        return table(cols.map((c) => ({ name: c.name, type: c.type })));
      }

      case "users": {
        const rows = await User.find().lean();
        return table(
          rows.map((u) => ({
            _id: String(u._id),
            email: u.email,
            studentId: u.studentId ?? "null",
            role: u.role,
            status: u.status,
            passwordHash: u.passwordHash ? "(hidden by select:false)" : "(not returned)",
          })),
        );
      }

      case "hashes": {
        const rows = await User.find().select("+passwordHash").lean();
        console.log("\n  Algorithm: bcrypt — format $2a$<cost>$<22-char salt><31-char digest>\n");
        return table(
          rows.map((u) => ({
            email: u.email,
            role: u.role,
            passwordHash: u.passwordHash,
          })),
        );
      }

      case "plaintext": {
        const suspicious = await mongoose.connection.db
          .collection("users")
          .find({
            $or: [
              { password: { $exists: true } },
              { plainPassword: { $exists: true } },
              { pwd: { $exists: true } },
            ],
          })
          .toArray();
        return console.log(
          suspicious.length === 0
            ? "  PASS — no plaintext password field exists in any user document."
            : `  FAIL — ${suspicious.length} document(s) contain a plaintext field!`,
        );
      }

      case "errands": {
        const rows = await Errand.find().lean();
        return table(
          rows.map((e) => ({
            _id: String(e._id),
            ownerId: String(e.ownerId),
            title: e.title,
            reward: e.reward,
            status: e.status,
          })),
        );
      }

      case "log": {
        const rows = await AuditLog.find()
          .sort({ at: -1 })
          .limit(Number(arg) || 20)
          .lean();
        return table(
          rows.map((l) => ({
            at: new Date(l.at).toLocaleTimeString(),
            method: l.method,
            route: l.route,
            status: l.status,
            note: l.note,
          })),
        );
      }

      case "indexes": {
        const u = await User.collection.indexes();
        const e = await Errand.collection.indexes();
        return table(
          [...u.map((i) => ({ collection: "users", ...i })), ...e.map((i) => ({ collection: "errands", ...i }))].map(
            (i) => ({
              collection: i.collection,
              name: i.name,
              key: JSON.stringify(i.key),
              unique: Boolean(i.unique),
              sparse: Boolean(i.sparse),
            }),
          ),
        );
      }

      case "stats":
        return table([
          {
            users: await User.countDocuments(),
            errands: await Errand.countDocuments(),
            audit_logs: await AuditLog.countDocuments(),
            database: mongoose.connection.name,
          },
        ]);

      case "find": {
        const [col, ...jsonParts] = rest;
        const filter = JSON.parse(jsonParts.join(" ") || "{}");
        const rows = await mongoose.connection.db.collection(col).find(filter).limit(25).toArray();
        return table(rows.map((r) => ({ ...r, _id: String(r._id) })));
      }

      default:
        console.log(`  Unknown command "${cmd}". Type help.`);
    }
  } catch (e) {
    console.error("  ERROR:", e.message);
  }
}

await connectDB();

const oneShot = process.argv.slice(2).join(" ");
if (oneShot) {
  await run(oneShot);
  await disconnectDB();
  process.exit(0);
}

console.log("\n  upang-db — MongoDB Atlas console. Type help for commands.\n");
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "upang_delivers> ",
});
rl.prompt();
rl.on("line", async (line) => {
  if (["exit", "quit"].includes(line.trim())) return rl.close();
  await run(line);
  rl.prompt();
}).on("close", async () => {
  await disconnectDB();
  process.exit(0);
});
