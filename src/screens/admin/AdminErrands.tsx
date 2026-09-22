import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Search } from "lucide-react";
import { api } from "@/lib/api";

const PAGE_SIZE = 10;

// Statuses the backend actually uses
const STATUS_META: Record<string, { label: string; tint: string }> = {
  open: { label: "Open", tint: "bg-sky-50 text-sky-600" },
  in_progress: { label: "In progress", tint: "bg-amber-50 text-amber-600" },
  picked_up: { label: "Picked up", tint: "bg-violet-50 text-violet-600" },
  review: { label: "In review", tint: "bg-orange-50 text-orange-600" },
  done: { label: "Done", tint: "bg-emerald-50 text-emerald-600" },
  cancelled: { label: "Cancelled", tint: "bg-slate-100 text-slate-500" },
};

const TABS = [{ key: "all", label: "All Errands" }].concat(
  Object.entries(STATUS_META).map(([key, m]) => ({ key, label: m.label }))
);

const formatDate = (value: string) => {
  const d = new Date(value);
  return isNaN(d.getTime())
    ? value || "—"
    : d.toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });
};

const shortId = (e: any) => `#ERR-${String(e._id ?? e.id ?? "").slice(-5).toUpperCase()}`;

const refId = (v: any) =>
  v && typeof v === "object" ? String(v._id ?? v.id ?? "") : v ? String(v) : "";

interface RowReview {
  rating: number;
  comment: string;
}

export default function AdminErrands({ token }: { token: string }) {
  const [errands, setErrands] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [reviews, setReviews] = useState<Record<string, RowReview | null>>({});

  async function load() {
    setLoading(true);
    setError("");

    const [errRes, userRes] = await Promise.all([
      api.getAdminErrands(token),
      api.getUsers(token), // only used to turn ids into names
    ]);
    setLoading(false);

    if (!errRes.ok) {
      setError(`${errRes.status} — ${errRes.error}`);
      return;
    }
    const list = errRes.errands ?? errRes.data ?? [];
    setErrands(Array.isArray(list) ? list : []);

    if (userRes.ok) {
      const ul = userRes.users ?? userRes.data ?? [];
      setUsers(Array.isArray(ul) ? ul : []);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // id -> name lookup
  const names = useMemo(() => {
    const m = new Map<string, string>();
    users.forEach((u) => m.set(String(u._id ?? u.id), u.fullName ?? u.name ?? u.email ?? ""));
    return m;
  }, [users]);

  const nameOf = (v: any) => {
    if (typeof v === "object" && v && (v.fullName || v.name)) return v.fullName ?? v.name;
    const id = refId(v);
    return names.get(id) || (id ? `…${id.slice(-6)}` : "—");
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: errands.length };
    errands.forEach((e) => {
      c[e.status] = (c[e.status] ?? 0) + 1;
    });
    return c;
  }, [errands]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return errands.filter((e) => {
      if (tab !== "all" && e.status !== tab) return false;
      if (!q) return true;
      return [e.title, e.category, e.pickup, e.dropoff, shortId(e), nameOf(e.ownerId ?? e.owner_id)]
        .filter(Boolean)
        .some((f) => String(f).toLowerCase().includes(q));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errands, tab, query, names]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const start = (current - 1) * PAGE_SIZE;
  const list = filtered.slice(start, start + PAGE_SIZE);

  // Fetch reviews only for "done" errands actually visible on this page —
  // avoids one request per errand across the whole (possibly large) dataset.
  useEffect(() => {
    const ids = list
      .filter((e) => e.status === "done" && !((e._id ?? e.id) in reviews))
      .map((e) => e._id ?? e.id);

    ids.forEach(async (id) => {
      const res = await api.getReview(token, id);
      setReviews((prev) => ({ ...prev, [id]: res.ok ? (res as any).review : null }));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, token]);

  // Up to 5 page buttons around the current page
  const first = Math.max(1, Math.min(current - 2, pages - 4));
  const pageNumbers = Array.from({ length: Math.min(5, pages) }, (_, i) => first + i);

  const pickTab = (key: string) => {
    setTab(key);
    setPage(1);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-3">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => pickTab(t.key)}
              className={`flex items-center gap-2 rounded-2xl px-5 py-3 font-semibold transition ${
                tab === t.key
                  ? "bg-emerald-500 text-white"
                  : "bg-white text-slate-600 shadow-sm hover:bg-slate-50"
              }`}
            >
              {t.label}
              <span
                className={`rounded-md px-2 py-0.5 text-xs font-bold ${
                  tab === t.key ? "bg-white/20" : "bg-slate-100 text-slate-500"
                }`}
              >
                {counts[t.key] ?? 0}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search errands..."
              className="w-64 rounded-2xl bg-white py-3 pl-12 pr-4 font-medium text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <button
            onClick={load}
            title="Refresh"
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm transition hover:bg-slate-50"
          >
            <RefreshCw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {error && (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-4 font-medium text-rose-600">
          {error}
        </p>
      )}

      <div className="overflow-x-auto rounded-3xl bg-white shadow-sm">
        <table className="w-full min-w-[900px] text-left">
          <thead>
            <tr className="text-xs font-bold tracking-[0.12em] text-slate-400">
              <th className="px-6 py-5">ERRAND</th>
              <th className="px-6 py-5">PEOPLE</th>
              <th className="px-6 py-5">CATEGORY</th>
              <th className="px-6 py-5">AMOUNT</th>
              <th className="px-6 py-5">STATUS</th>
              <th className="px-6 py-5">REVIEW</th>
              <th className="px-6 py-5">DEADLINE</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="px-6 py-14 text-center text-slate-400">
                  Loading errands...
                </td>
              </tr>
            )}
            {!loading && list.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-14 text-center text-slate-400">
                  {errands.length === 0 ? "No errands yet." : "No errands match your filters."}
                </td>
              </tr>
            )}
            {!loading &&
              list.map((e, i) => {
                const meta = STATUS_META[e.status];
                const runner = refId(e.runnerId ?? e.runner_id);
                const id = e._id ?? e.id;
                const review = reviews[id];

                return (
                  <tr key={id ?? i} className="border-t border-slate-100 align-top">
                    <td className="px-6 py-5">
                      <p className="font-mono text-xs font-bold text-green-500">{shortId(e)}</p>
                      <p className="mt-1 font-bold text-slate-900">{e.title}</p>
                      <p className="text-xs text-slate-400">
                        {e.pickup} → {e.dropoff}
                      </p>
                    </td>
                    <td className="px-6 py-5 text-sm text-slate-600">
                      <p>
                        <span className="text-xs text-slate-400">Posted by</span>{" "}
                        {nameOf(e.ownerId ?? e.owner_id)}
                      </p>
                      <p className="mt-1">
                        <span className="text-xs text-slate-400">Runner</span>{" "}
                        {runner ? nameOf(e.runnerId ?? e.runner_id) : <span className="text-slate-300">Unassigned</span>}
                      </p>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <span className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                        {e.category}
                      </span>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap font-bold text-green-500">₱{e.reward}</td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <span
                        className={`rounded-lg px-3 py-1 text-xs font-bold ${
                          meta?.tint ?? "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {meta?.label ?? e.status}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-xs max-w-[160px]">
                      {e.status !== "done" ? (
                        <span className="text-slate-300">—</span>
                      ) : review === undefined ? (
                        <span className="text-slate-400">Checking...</span>
                      ) : review ? (
                        <div>
                          <span className="font-bold text-amber-500">
                            {"★".repeat(review.rating)}
                            {"☆".repeat(5 - review.rating)}
                          </span>
                          {review.comment && (
                            <p className="mt-1 truncate text-slate-500" title={review.comment}>
                              "{review.comment}"
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="italic text-slate-400">No review</span>
                      )}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm text-slate-500">
                      {formatDate(e.deadline)}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-slate-500">
          {filtered.length === 0
            ? "Showing 0 entries"
            : `Showing ${start + 1} to ${start + list.length} of ${filtered.length} entries`}
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
                  ? "bg-orange-500 text-white"
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