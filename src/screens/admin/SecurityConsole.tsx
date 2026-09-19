import { useEffect, useRef, useState } from "react";
import {
  Database,
  Terminal,
  KeyRound,
  ShieldX,
  Gauge,
  CheckCircle2,
  XCircle,
  Play,
} from "lucide-react";
import { api } from "../../lib/api";

type TestResult = { name: string; expected: string; got: string; pass: boolean };

export default function SecurityConsole({ token }: { token: string }) {
  const [, force] = useState(0);
  const [tab, setTab] = useState<"gui" | "cli">("gui");
  const [cmd, setCmd] = useState("");
  const [out, setOut] = useState<string[]>([
    "upang-db v1.4 — connected to upang_delivers@localhost:5432",
    'Type "help" for commands. Passwords are never stored in plaintext.',
  ]);
  const [results, setResults] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);
  const outRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = api.subscribe(() => force((n) => n + 1));
    return () => {
      unsub();
    };
  }, []);
  useEffect(() => {
    outRef.current?.scrollTo({ top: outRef.current.scrollHeight });
  }, [out]);

  function print(...lines: string[]) {
    setOut((o) => [...o, ...lines]);
  }

  function runCmd(raw: string) {
    const c = raw.trim();
    if (!c) return;
    print(`upang_delivers=# ${c}`);
    const lower = c.toLowerCase();

    if (lower === "help") {
      print(
        "  \\dt                         list tables",
        "  select * from users;        dump users (password_hash shown as stored)",
        "  select * from errands;      dump errands",
        "  select * from audit_log;    recent request log",
        "  show ratelimit;             auth bucket state",
        "  reset ratelimit;            clear auth buckets",
        "  clear                       clear screen",
      );
    } else if (lower === "\\dt") {
      print("  public | users     | table | upang_admin", "  public | errands   | table | upang_admin");
    } else if (lower.startsWith("select") && lower.includes("users")) {
      print(
        " id         | email                      | student_id    | role     | password_hash",
        "------------+----------------------------+---------------+----------+------------------------------",
        ...api.users.map(
          (u) =>
            ` ${u.id.padEnd(10)} | ${u.email.padEnd(26)} | ${(u.student_id ?? "NULL").padEnd(13)} | ${u.role.padEnd(8)} | ${u.password_hash.slice(0, 30)}…`,
        ),
        `(${api.users.length} rows) — algorithm: PBKDF2-style salted SHA-256, unique salt per row`,
      );
    } else if (lower.startsWith("select") && lower.includes("errands")) {
      print(
        " id       | owner_id   | title                                  | reward | status",
        "----------+------------+----------------------------------------+--------+---------",
        ...api.errands.map(
          (e) =>
            ` ${e.id.padEnd(8)} | ${e.owner_id.padEnd(10)} | ${e.title.slice(0, 38).padEnd(38)} | ${String(
              e.reward,
            ).padEnd(6)} | ${e.status}`,
        ),
        `(${api.errands.length} rows)`,
      );
    } else if (lower.includes("audit_log")) {
      print(
        ...api.logs
          .slice(0, 12)
          .map((l) => ` ${l.at} | ${l.method.padEnd(4)} ${l.route.padEnd(22)} | ${l.status} | ${l.note}`),
      );
    } else if (lower === "show ratelimit;" || lower === "show ratelimit") {
      const s = api.rateState("/auth/login:john.upang@phinmaed.com");
      print(
        ` window=${api.WINDOW_MS / 1000}s  limit=${api.LIMIT} req/identifier`,
        ` /auth/login:john.upang@phinmaed.com → used ${s.used}/${api.LIMIT}${
          s.retryIn ? `, locked ${s.retryIn}s` : ""
        }`,
      );
    } else if (lower.startsWith("reset ratelimit")) {
      api.resetLimits();
      print(" RESET — all auth buckets cleared");
    } else if (lower === "clear") {
      setOut([]);
      return;
    } else if (lower.includes("password") && lower.includes("plain")) {
      print(" ERROR: column \"password\" does not exist — only password_hash is persisted.");
    } else {
      print(` ERROR: unrecognised command "${c}". Try "help".`);
    }
  }

  async function runSecurityTests() {
    setRunning(true);
    const rows: TestResult[] = [];

    // 1. Hashing
    const sample = api.users[0];
    rows.push({
      name: "Passwords stored hashed (never plaintext)",
      expected: "pbkdf2-sha256$…",
      got: sample ? sample.password_hash.split("$")[0] + "$…" : "no rows",
      pass: !!sample && sample.password_hash.startsWith("pbkdf2-sha256$"),
    });

    // 2. Validation blocks invalid payload
    const bad = api.createErrand(token, {
      title: "<script>x</script>",
      instructions: "hi",
      pickup: "",
      dropoff: "",
      reward: -5,
      category: "",
      cod: false,
      deadline: "",
    });
    rows.push({
      name: "Invalid errand payload rejected",
      expected: "422 Unprocessable",
      got: `${bad.status} ${bad.ok ? "created" : bad.error}`,
      pass: !bad.ok && bad.status === 422,
    });

    // 3. Login validation
    const badLogin = await api.login({ email: "not-an-email", password: "123" });
    rows.push({
      name: "Malformed login payload rejected",
      expected: "400 Bad Request",
      got: `${badLogin.status} ${badLogin.ok ? "ok" : badLogin.error}`,
      pass: !badLogin.ok && badLogin.status === 400,
    });

    // 3b. Signup validation — weak password / gmail / bad student id
    const badSignup = await api.signup({
      fullName: "x",
      studentId: "12345",
      email: "hacker@gmail.com",
      password: "pass",
      confirm: "word",
      role: "student",
      agree: false,
    });
    rows.push({
      name: "Weak/invalid sign-up payload rejected",
      expected: "422 Unprocessable",
      got: `${badSignup.status} (${Object.keys(badSignup.ok ? {} : (badSignup.fields ?? {})).length} field errors)`,
      pass: !badSignup.ok && badSignup.status === 422,
    });

    // 3c. Duplicate email blocked
    const dupe = await api.signup({
      fullName: "Copy Cat",
      studentId: "04-2099-11111",
      email: "john.upang@phinmaed.com",
      password: "Str0ng#Pass1",
      confirm: "Str0ng#Pass1",
      role: "student",
      agree: true,
    });
    rows.push({
      name: "Duplicate email registration blocked",
      expected: "422 Unprocessable",
      got: `${dupe.status} ${dupe.ok ? "created" : (dupe.fields?.email ?? dupe.error)}`,
      pass: !dupe.ok && dupe.status === 422,
    });

    // 4. BOLA — admin reading another user's errand is allowed, but a student token is not
    const student = await api.login(
      { email: "john.upang@phinmaed.com", password: "Upang#2026" },
      { expectRole: "student" },
    );
    if (student.ok) {
      const cross = api.getErrand(student.data.token, "err_1002"); // owned by usr_0003
      rows.push({
        name: "BOLA: cross-account object read blocked",
        expected: "403 Forbidden",
        got: `${cross.status} ${cross.ok ? "leaked data" : cross.error}`,
        pass: !cross.ok && cross.status === 403,
      });
      const own = api.getErrand(student.data.token, "err_1001");
      rows.push({
        name: "Owner can read their own object",
        expected: "200 OK",
        got: `${own.status}`,
        pass: own.ok,
      });
      const escalate = api.adminOnly(student.data.token, "/admin/reports");
      rows.push({
        name: "Role check: student hitting /admin/reports",
        expected: "403 Forbidden",
        got: `${escalate.status} ${escalate.ok ? "granted" : escalate.error}`,
        pass: !escalate.ok && escalate.status === 403,
      });
    }

    // 5. Unauthenticated access
    const anon = api.getErrand("sess_forged_token", "err_1001");
    rows.push({
      name: "Forged session token rejected",
      expected: "401 Unauthenticated",
      got: `${anon.status}`,
      pass: !anon.ok && anon.status === 401,
    });

    // 6. Rate limiting
    let last = 0;
    for (let i = 0; i < api.LIMIT + 2; i++) {
      const r = await api.login({ email: "bruteforce@phinmaed.com", password: "WrongPass123" });
      last = r.status;
    }
    rows.push({
      name: `Rate limit after ${api.LIMIT} failed attempts`,
      expected: "429 Too Many Requests",
      got: `${last}`,
      pass: last === 429,
    });

    setResults(rows);
    setRunning(false);
  }

  const passed = results.filter((r) => r.pass).length;

  return (
    <div className="mx-auto max-w-6xl space-y-7 pb-4">
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { icon: KeyRound, label: "PASSWORD STORAGE", value: "PBKDF2 · SHA-256", note: "unique salt per user", tint: "bg-emerald-50 text-emerald-600" },
          { icon: ShieldX, label: "OBJECT AUTHZ", value: "Owner + Role", note: "BOLA blocked with 403", tint: "bg-rose-50 text-rose-500" },
          { icon: Gauge, label: "AUTH RATE LIMIT", value: `${api.LIMIT} / ${api.WINDOW_MS / 1000}s`, note: "per email + route", tint: "bg-amber-50 text-amber-600" },
          { icon: CheckCircle2, label: "INPUT VALIDATION", value: "Schema enforced", note: "400 / 422 on bad payloads", tint: "bg-sky-50 text-sky-600" },
        ].map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="rounded-3xl bg-white p-7 shadow-sm">
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${c.tint}`}>
                <Icon className="h-6 w-6" />
              </div>
              <p className="mt-5 text-xs font-bold tracking-[0.14em] text-slate-400">{c.label}</p>
              <p className="mt-1 text-xl font-extrabold text-slate-900">{c.value}</p>
              <p className="mt-1 text-sm text-slate-400">{c.note}</p>
            </div>
          );
        })}
      </div>

      <div className="rounded-3xl bg-white p-7 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h3 className="text-2xl font-bold text-slate-900">Security Test Suite</h3>
          <button
            onClick={runSecurityTests}
            disabled={running}
            className="flex items-center gap-2 rounded-2xl bg-emerald-500 px-7 py-4 font-bold text-white shadow-md shadow-emerald-500/25 transition hover:bg-emerald-600 disabled:opacity-60"
          >
            <Play className="h-5 w-5" /> {running ? "Running..." : "Run All Checks"}
          </button>
        </div>

        {results.length > 0 && (
          <>
            <p className="mt-5 text-slate-500">
              <span className="font-bold text-emerald-600">{passed}</span> / {results.length} checks
              passed
            </p>
            <div className="mt-4 space-y-3">
              {results.map((r) => (
                <div
                  key={r.name}
                  className={`flex flex-col gap-2 rounded-2xl border px-6 py-4 sm:flex-row sm:items-center sm:justify-between ${
                    r.pass ? "border-emerald-100 bg-emerald-50/50" : "border-rose-200 bg-rose-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {r.pass ? (
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                    ) : (
                      <XCircle className="h-5 w-5 shrink-0 text-rose-500" />
                    )}
                    <p className="font-bold text-slate-800">{r.name}</p>
                  </div>
                  <p className="text-sm text-slate-500">
                    expected <span className="font-semibold text-slate-700">{r.expected}</span> · got{" "}
                    <span className="font-semibold text-slate-700">{r.got}</span>
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
        <div className="flex gap-2 border-b border-slate-100 px-6 pt-5">
          {[
            { k: "gui" as const, label: "Database GUI", icon: Database },
            { k: "cli" as const, label: "psql CLI", icon: Terminal },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.k}
                onClick={() => setTab(t.k)}
                className={`flex items-center gap-2 rounded-t-xl px-5 py-3 font-semibold transition ${
                  tab === t.k
                    ? "bg-slate-900 text-white"
                    : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                <Icon className="h-4 w-4" /> {t.label}
              </button>
            );
          })}
        </div>

        {tab === "gui" ? (
          <div className="overflow-x-auto p-6">
            <p className="mb-4 text-sm text-slate-500">
              Table <span className="font-mono font-bold text-slate-800">public.users</span> — the{" "}
              <span className="font-mono">password_hash</span> column is what is actually persisted;
              there is no plaintext password column.
            </p>
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs font-bold tracking-[0.1em] text-slate-500">
                  <th className="px-4 py-4">id</th>
                  <th className="px-4 py-4">email</th>
                  <th className="px-4 py-4">student_id</th>
                  <th className="px-4 py-4">role</th>
                  <th className="px-4 py-4">status</th>
                  <th className="px-4 py-4">failed_logins</th>
                  <th className="px-4 py-4">password_hash</th>
                </tr>
              </thead>
              <tbody>
                {api.users.map((u) => (
                  <tr key={u.id} className="border-t border-slate-100 align-top">
                    <td className="px-4 py-4 font-mono text-slate-600">{u.id}</td>
                    <td className="px-4 py-4 text-slate-700">{u.email}</td>
                    <td className="px-4 py-4 font-mono text-slate-600">
                      {u.student_id ?? <span className="text-slate-300">NULL</span>}
                    </td>
                    <td className="px-4 py-4">
                      <span className="rounded-md bg-slate-100 px-2 py-1 font-semibold text-slate-600">
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`rounded-md px-2 py-1 font-semibold ${
                          u.status === "active"
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-rose-50 text-rose-500"
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-slate-600">{u.failed_logins}</td>
                    <td className="max-w-[380px] break-all px-4 py-4 font-mono text-[11px] text-emerald-700">
                      {u.password_hash}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6">
            <div
              ref={outRef}
              className="h-80 overflow-y-auto rounded-2xl bg-[#0B1524] p-5 font-mono text-[13px] leading-relaxed text-emerald-300"
            >
              {out.map((l, i) => (
                <pre key={i} className="whitespace-pre-wrap">
                  {l}
                </pre>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                runCmd(cmd);
                setCmd("");
              }}
              className="mt-4 flex gap-3"
            >
              <span className="flex items-center font-mono text-slate-400">upang_delivers=#</span>
              <input
                value={cmd}
                onChange={(e) => setCmd(e.target.value)}
                placeholder="select * from users;"
                className="flex-1 rounded-xl border border-slate-200 px-4 py-3 font-mono text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button className="rounded-xl bg-slate-900 px-6 py-3 font-bold text-white transition hover:bg-slate-800">
                Run
              </button>
            </form>
            <div className="mt-3 flex flex-wrap gap-2">
              {["\\dt", "select * from users;", "select * from errands;", "select * from audit_log;", "show ratelimit;", "reset ratelimit;"].map(
                (q) => (
                  <button
                    key={q}
                    onClick={() => runCmd(q)}
                    className="rounded-lg bg-slate-100 px-3 py-1.5 font-mono text-xs text-slate-600 transition hover:bg-slate-200"
                  >
                    {q}
                  </button>
                ),
              )}
            </div>
          </div>
        )}
      </div>

      <div className="rounded-3xl bg-white p-7 shadow-sm">
        <h3 className="text-2xl font-bold text-slate-900">Live Request Log</h3>
        <p className="mt-1 text-slate-500">
          Every auth, validation and authorization decision made by the API layer.
        </p>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="text-xs font-bold tracking-[0.1em] text-slate-400">
                <th className="py-3 pr-4">TIME</th>
                <th className="py-3 pr-4">METHOD</th>
                <th className="py-3 pr-4">ROUTE</th>
                <th className="py-3 pr-4">STATUS</th>
                <th className="py-3">NOTE</th>
              </tr>
            </thead>
            <tbody>
              {api.logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-slate-400">
                    No requests yet — run the test suite above.
                  </td>
                </tr>
              )}
              {api.logs.map((l) => (
                <tr key={l.id} className="border-t border-slate-100">
                  <td className="py-3 pr-4 font-mono text-slate-500">{l.at}</td>
                  <td className="py-3 pr-4 font-mono font-bold text-slate-700">{l.method}</td>
                  <td className="py-3 pr-4 font-mono text-slate-600">{l.route}</td>
                  <td className="py-3 pr-4">
                    <span
                      className={`rounded-md px-2 py-1 text-xs font-bold ${
                        l.status < 300
                          ? "bg-emerald-50 text-emerald-600"
                          : l.status === 429
                            ? "bg-amber-50 text-amber-600"
                            : "bg-rose-50 text-rose-500"
                      }`}
                    >
                      {l.status}
                    </span>
                  </td>
                  <td className="py-3 text-slate-600">{l.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
