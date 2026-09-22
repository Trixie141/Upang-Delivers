import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { api } from "@/lib/api";

const PAGE_SIZE = 10;

// Roles the backend actually has: student, delivery (runner), admin
const ROLE_META: Record<string, { label: string; tint: string }> = {
  student: { label: "Student", tint: "bg-sky-50 text-sky-600" },
  delivery: { label: "Runner", tint: "bg-amber-50 text-amber-600" },
  admin: { label: "Admin", tint: "bg-violet-50 text-violet-600" },
};

const TABS = [
  { key: "all", label: "All Users" },
  { key: "student", label: "Students" },
  { key: "delivery", label: "Runners" },
  { key: "admin", label: "Admins" },
];

const nameOf = (u: any) => u.fullName ?? u.name ?? "Unknown";
const idOf = (u: any) => String(u._id ?? u.id ?? "");
const refId = (v: any) =>
  v && typeof v === "object" ? String(v._id ?? v.id ?? "") : v ? String(v) : "";

export default function AdminUsers({ token }: { token: string }) {
  const [users, setUsers] = useState<any[]>([]);
  const [errands, setErrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("all");
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState("");

  async function load() {
    setLoading(true);
    setError("");

    const [userRes, errRes] = await Promise.all([
      api.getUsers(token),
      api.getAdminErrands(token), // only used for the Posted / Completed counts
    ]);
    setLoading(false);

    if (!userRes.ok) {
      setError(`${userRes.status} — ${userRes.error}`);
      return;
    }
    const ul = userRes.users ?? userRes.data ?? [];
    setUsers(Array.isArray(ul) ? ul : []);

    if (errRes.ok) {
      const el = errRes.errands ?? errRes.data ?? [];
      setErrands(Array.isArray(el) ? el : []);
    } else {
      setError(`Could not load errand counts (${errRes.status}). Posted and Completed may show 0.`);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Posted = errands the user created. Completed = errands they finished as a runner.
  const counts = useMemo(() => {
    const m = new Map<string, { posted: number; completed: number }>();
    const bump = (id: string, k: "posted" | "completed") => {
      if (!id) return;
      const c = m.get(id) ?? { posted: 0, completed: 0 };
      c[k] += 1;
      m.set(id, c);
    };
    errands.forEach((e) => {
      bump(refId(e.ownerId ?? e.owner_id), "posted");
      if (e.status === "done") bump(refId(e.runnerId ?? e.runner_id), "completed");
    });
    return m;
  }, [errands]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter(
      (u) =>
        (tab === "all" || u.role === tab) &&
        (nameOf(u) + (u.studentId ?? "") + (u.email ?? "")).toLowerCase().includes(q)
    );
  }, [users, tab, query]);

  const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const start = (current - 1) * PAGE_SIZE;
  const rows = list.slice(start, start + PAGE_SIZE);

  const first = Math.max(1, Math.min(current - 2, pages - 4));
  const pageNumbers = Array.from({ length: Math.min(5, pages) }, (_, i) => first + i);

  async function toggleStatus(u: any) {
    const suspended = u.status === "suspended";
    const next = suspended ? "active" : "suspended";

    if (!suspended && !window.confirm(`Suspend ${nameOf(u)}? They will not be able to log in.`)) {
      return;
    }

    setBusyId(idOf(u));
    setError("");
    const res = await api.setUserStatus(token, idOf(u), next);
    setBusyId("");

    if (!res.ok) {
      setError(`${res.status} — ${res.error}`);
      return;
    }
    setUsers((all) => all.map((x) => (idOf(x) === idOf(u) ? { ...x, status: next } : x)));
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative sm:w-80">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search users or ID numbers..."
            className="w-full rounded-2xl bg-white py-4 pl-12 pr-5 text-slate-800 shadow-sm outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div className="flex flex-wrap gap-3">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => {
                setTab(t.key);
                setPage(1);
              }}
              className={`rounded-2xl px-6 py-3 font-semibold transition ${
                tab === t.key
                  ? "bg-emerald-500 text-white"
                  : "bg-white text-slate-600 shadow-sm hover:bg-slate-50"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-4 font-medium text-rose-600">
          {error}
        </p>
      )}

      <div className="overflow-x-auto rounded-3xl bg-white shadow-sm">
        <table className="w-full min-w-[820px] text-left">
          <thead>
            <tr className="text-xs font-bold tracking-[0.12em] text-slate-400">
              <th className="px-6 py-5">NAME</th>
              <th className="px-6 py-5">EMAIL</th>
              <th className="px-6 py-5">ROLE</th>
              <th className="px-6 py-5">STATUS</th>
              <th className="px-6 py-5">ERRANDS</th>
              <th className="px-6 py-5" />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="px-6 py-14 text-center text-slate-400">
                  Loading users...
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-14 text-center text-slate-400">
                  {users.length === 0 ? "No users yet." : "No users match your filters."}
                </td>
              </tr>
            )}
            {!loading &&
              rows.map((u, i) => {
                const role = ROLE_META[u.role];
                const suspended = u.status === "suspended";
                const c = counts.get(idOf(u)) ?? { posted: 0, completed: 0 };
                return (
                  <tr key={idOf(u) || i} className="border-t border-slate-100 align-top">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-50 font-bold text-orange-500">
                          {nameOf(u)[0]}
                        </span>
                        <div>
                          <p className="font-bold text-slate-900">{nameOf(u)}</p>
                          <p className="text-xs text-slate-400">{u.studentId || "—"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-sm text-slate-500">{u.email}</td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <span
                        className={`rounded-lg px-3 py-1 text-xs font-bold ${
                          role?.tint ?? "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {role?.label ?? u.role}
                      </span>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <span
                        className={`rounded-lg px-3 py-1 text-xs font-bold ${
                          suspended ? "bg-rose-50 text-rose-500" : "bg-emerald-50 text-emerald-600"
                        }`}
                      >
                        {suspended ? "Suspended" : "Active"}
                      </span>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm text-slate-600">
                      <p>
                        <span className="font-semibold text-slate-800">{c.posted}</span>{" "}
                        <span className="text-xs text-slate-400">posted</span>
                      </p>
                      <p className="mt-1">
                        <span className="font-semibold text-slate-800">{c.completed}</span>{" "}
                        <span className="text-xs text-slate-400">completed</span>
                      </p>
                    </td>
                    <td className="px-6 py-5 text-right">
                      {u.role === "admin" ? (
                        <span className="text-slate-300">—</span>
                      ) : (
                        <button
                          onClick={() => toggleStatus(u)}
                          disabled={busyId === idOf(u)}
                          className={`rounded-xl border px-5 py-2 font-semibold transition disabled:opacity-50 ${
                            suspended
                              ? "border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                              : "border-slate-200 text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          {busyId === idOf(u) ? "Saving..." : suspended ? "Activate" : "Suspend"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-slate-500">
          {list.length === 0
            ? "Showing 0 entries"
            : `Showing ${start + 1} to ${start + rows.length} of ${list.length} entries`}
        </p>
        <div className="flex gap-2">
          <button
            disabled={current === 1}
            onClick={() => setPage(current - 1)}
            className="rounded-xl bg-white px-4 py-2.5 font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-40"
          >
            Previous
          </button>
          {pageNumbers.map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`rounded-xl px-4 py-2.5 font-semibold transition ${
                p === current
                  ? "bg-emerald-500 text-white"
                  : "bg-white text-slate-600 shadow-sm hover:bg-slate-50"
              }`}
            >
              {p}
            </button>
          ))}
          <button
            disabled={current === pages}
            onClick={() => setPage(current + 1)}
            className="rounded-xl bg-white px-4 py-2.5 font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}