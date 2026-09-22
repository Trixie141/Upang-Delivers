/**
 * End-to-end security checks against a running server + MongoDB Atlas.
 *   1) npm run seed    2) npm start    3) npm run test:security
 */
const BASE = process.env.API_BASE || "http://localhost:4000/api";
const results = [];

const call = async (path, opts = {}) => {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  let json = {};
  try {
    json = await res.json();
  } catch {
    /* no body */
  }
  return { status: res.status, json };
};

const check = (name, expected, got, pass) => results.push({ name, expected, got, pass });

const run = async () => {
  /* 1 — bcrypt hashing in Atlas ------------------------------------------ */
  const admin = await call("/auth/admin/login", {
    method: "POST",
    body: { email: "admin@phinmaed.com", password: "Admin#2026" },
  });
  const adminToken = admin.json.token;
  const auth = { Authorization: `Bearer ${adminToken}` };

  const hashes = await call("/admin/users/hashes", { headers: auth });
  const firstHash = hashes.json.rows?.[0]?.passwordHash ?? "";
  check(
    "Passwords stored as bcrypt hashes",
    "$2a$/$2b$ prefix",
    firstHash.slice(0, 4) || "none",
    /^\$2[aby]\$/.test(firstHash),
  );

  const users = await call("/admin/users", { headers: auth });
  const leaked = JSON.stringify(users.json).includes("passwordHash");
  check("passwordHash never returned by /admin/users", "absent", leaked ? "present" : "absent", !leaked);

  /* 2 — input validation -------------------------------------------------- */
  const badReg = await call("/auth/register", {
    method: "POST",
    body: {
      fullName: "x",
      studentId: "123",
      email: "a@gmail.com",
      password: "pass",
      confirm: "word",
      role: "student",
      agree: false,
    },
  });
  check("Invalid sign-up payload rejected", "422", String(badReg.status), badReg.status === 422);

  const badLogin = await call("/auth/login", { method: "POST", body: { email: "nope", password: "1" } });
  check("Malformed login rejected", "422", String(badLogin.status), badLogin.status === 422);

  const dupe = await call("/auth/register", {
    method: "POST",
    body: {
      fullName: "Copy Cat",
      studentId: "04-2099-11111",
      email: "john.upang@phinmaed.com",
      password: "Str0ng#Pass1",
      confirm: "Str0ng#Pass1",
      role: "student",
      agree: true,
    },
  });
  check("Duplicate email blocked", "422", String(dupe.status), dupe.status === 422);

  /* 3 — NoSQL operator injection ------------------------------------------ */
  const nosql = await call("/auth/login", {
    method: "POST",
    body: { email: { $gt: "" }, password: { $gt: "" } },
  });
  check(
    "NoSQL operator injection blocked",
    "401/422 (never 200)",
    String(nosql.status),
    nosql.status !== 200,
  );

  /* 4 — BOLA / ownership --------------------------------------------------- */
  const student = await call("/auth/login", {
    method: "POST",
    body: { email: "john.upang@phinmaed.com", password: "Upang#2026" },
  });
  
  const sAuth = { Authorization: `Bearer ${student.json.token}` };
  const studentId = student.json.user?.id;

  const all = await call("/admin/errands", { headers: auth });
  const foreign = all.json.errands?.find((e) => String(e.ownerId?._id ?? e.ownerId) !== studentId);
  const own = all.json.errands?.find((e) => String(e.ownerId?._id ?? e.ownerId) === studentId);

  const bola = await call(`/errands/${foreign?._id}`, { headers: sAuth });
  check("BOLA: cross-account read blocked", "403 or 404", String(bola.status), bola.status === 403 || bola.status === 404);

  const mine = await call(`/errands/${own?._id}`, { headers: sAuth });
  check("Owner can read their own object", "200", String(mine.status), mine.status === 200);

    const spoof = await call("/errands", {
    method: "POST",
    headers: sAuth,
    body: {
      ownerId: "000000000000000000000000", // attempt to forge ownership
      title: "Spoofed ownership attempt",
      instructions: "This ownerId should be ignored by the server.",
      category: "Others",
      pickup: "Somewhere",
      dropoff: "Elsewhere",
      reward: 50,
      deadline: new Date(Date.now() + 86400000).toISOString(),
      contactPhone: "09171234567",
    },
  });
  const spoofOwner = String(spoof.json.errand?.ownerId ?? "");
  check(
    "ownerId taken from JWT, not the body",
    `= ${studentId?.slice(-6)}`,
    `= ${spoofOwner.slice(-6) || "n/a"}`,
    spoofOwner === studentId,
  );

  /* 5 — role escalation ---------------------------------------------------- */
  const esc = await call("/admin/users", { headers: sAuth });
  check("Role check: student → /admin/users", "403", String(esc.status), esc.status === 403);

  const forged = await call(`/errands/${own?._id}`, { headers: { Authorization: "Bearer forged.jwt" } });
  check("Forged token rejected", "401", String(forged.status), forged.status === 401);

  /* 6 — rate limiting ------------------------------------------------------ */
  let last = 0;
  for (let i = 0; i < 8; i++) {
    const r = await call("/auth/login", {
      method: "POST",
      body: { email: "bruteforce@phinmaed.com", password: "WrongPass#1" },
    });
    last = r.status;
  }
  check("Rate limit on auth routes", "429", String(last), last === 429);

  /* report ----------------------------------------------------------------- */
  console.log("\n  Upang Delivers — security checks (MongoDB Atlas)\n");
  for (const r of results)
    console.log(
      `  ${r.pass ? "PASS" : "FAIL"}  ${r.name.padEnd(44)} expected ${r.expected}, got ${r.got}`,
    );
  const passed = results.filter((r) => r.pass).length;
  console.log(`\n  ${passed}/${results.length} passed\n`);
  process.exit(passed === results.length ? 0 : 1);
};

run().catch((e) => {
  console.error("\n  Is the server running? (npm start)\n ", e.message, "\n");
  process.exit(1);
});
