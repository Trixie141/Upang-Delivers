import "dotenv/config";
import { connectDB, disconnectDB } from "./config/db.js";
import { User } from "./models/User.js";
import { Errand } from "./models/Errand.js";
import { AuditLog } from "./models/AuditLog.js";

const accounts = [
  { fullName: "John Dela Cruz", studentId: "04-2021-00456", email: "john.upang@phinmaed.com", role: "student", password: "Upang#2026" },
  { fullName: "Mark Tan", studentId: "04-2122-00902", email: "mark.tan@phinmaed.com", role: "delivery", password: "Runner#2026" },
  { fullName: "Ana Reyes", studentId: null, email: "ana.reyes@phinmaed.com", role: "employee", password: "Faculty#2026" },
  { fullName: "Campus Admin", studentId: null, email: "admin@phinmaed.com", role: "admin", password: "Admin#2026" },
];

const run = async () => {
  await connectDB();

  console.log("\n  Clearing collections ...");
  await Promise.all([User.deleteMany({}), Errand.deleteMany({}), AuditLog.deleteMany({})]);

  const created = {};
  for (const a of accounts) {
    const user = new User({
      fullName: a.fullName,
      studentId: a.studentId,
      email: a.email,
      role: a.role,
    });
    user.password = a.password; // virtual → bcrypt hashed by the pre-save hook
    await user.save();
    created[a.role] = user;

    const withHash = await User.findById(user._id).select("+passwordHash");
    console.log(
      `  + ${a.email.padEnd(28)} ${a.role.padEnd(9)} ${withHash.passwordHash.slice(0, 34)}…`,
    );
  }

  await Errand.create([
    {
      ownerId: created.student._id,
      title: "Buy 2 Siomai Rice from Student Plaza",
      instructions: "Two orders of siomai rice, extra chili sauce on the side please.",
      category: "Food Run",
      pickup: "Student Plaza (SP)",
      dropoff: "PTC Building - Maclab Room",
      reward: 45,
      cod: true,
      deadline: "ASAP (Within 30 mins)",
    },
    {
      ownerId: created.employee._id,
      title: "Print 15-page syllabus (CMA)",
      instructions: "Print double sided, staple top-left, deliver to the faculty room.",
      category: "Printing",
      pickup: "CSDL Copy Center",
      dropoff: "CMA Faculty Room",
      reward: 60,
      cod: false,
      deadline: "By 1:30 PM Today",
    },
  ]);

  await User.syncIndexes();
  await Errand.syncIndexes();

  console.log("\n  Seed complete. Passwords exist ONLY as bcrypt hashes.");
  console.log("  Verify in Atlas: Browse Collections → upang_delivers → users → passwordHash");
  console.log('  Or CLI:  npm run db -- hashes\n');
  await disconnectDB();
};

run().catch(async (e) => {
  console.error("  Seed failed:", e.message);
  await disconnectDB();
  process.exit(1);
});
