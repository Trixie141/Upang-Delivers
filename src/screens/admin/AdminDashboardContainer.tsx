import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import AdminDashboard, { AdminStats, ActivityItem, DashboardErrand } from "./AdminDashboard";

const ACTIVE_STATUSES = ["open", "in_progress", "picked_up", "review"];

// Revenue = total reward value of completed errands x this rate.
// Leave at 1 to show the gross value; set it to your platform fee (e.g. 0.1 for 10%).
const REVENUE_RATE = 1;

// What each errand status means as a line in the activity feed
const ACTION: Record<string, string> = {
  open: "Posted",
  in_progress: "Accepted",
  picked_up: "Picked up",
  review: "Submitted",
  done: "Completed",
  cancelled: "Cancelled",
};

const refId = (v: any) =>
  v && typeof v === "object" ? String(v._id ?? v.id ?? "") : v ? String(v) : "";

const whenOf = (e: any) => new Date(e.updatedAt ?? e.updated_at ?? e.createdAt ?? 0);

function timeAgo(d: Date) {
  if (isNaN(d.getTime())) return "—";
  const s = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  if (s < 60) return "Just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`;
  return d.toLocaleDateString("en-PH", { dateStyle: "medium" });
}

function build(users: any[], errands: any[]) {
  const today = new Date();
  const names = new Map<string, string>();
  users.forEach((u) =>
    names.set(String(u._id ?? u.id), u.fullName ?? u.name ?? u.email ?? "Unknown")
  );
  const nameOf = (id: string) => names.get(id) ?? (id ? `…${id.slice(-6)}` : "Unknown");

  const done = errands.filter((e) => e.status === "done");

  const stats: AdminStats = {
    totalUsers: users.length,
    activeErrands: errands.filter((e) => ACTIVE_STATUSES.includes(e.status)).length,
    openErrands: errands.filter((e) => e.status === "open" && new Date(e.deadline).getTime() > Date.now()).length,
    completedToday: done.filter((e) => whenOf(e).toDateString() === today.toDateString()).length,
    revenue: Math.round(done.reduce((sum, e) => sum + (Number(e.reward) || 0), 0) * REVENUE_RATE),
    overdueErrands: errands.filter((e) => ["open", "in_progress", "picked_up"].includes(e.status) && new Date(e.deadline).getTime() <= Date.now()).length,
    cancellations: errands.filter((e) => e.status === "cancelled").length,
  };

  const sorted = [...errands]
    .sort((a, b) => (whenOf(b).getTime() || 0) - (whenOf(a).getTime() || 0))
    .map((e, i) => {
      const owner = refId(e.ownerId ?? e.owner_id);
      const runner = refId(e.runnerId ?? e.runner_id);
      // Runner-side steps are credited to the runner, everything else to the poster
      const who = e.status !== "open" && runner ? runner : owner;
      const timestamp = whenOf(e).getTime();
      return { e, i, who, timestamp };
    });

  const activity: ActivityItem[] = sorted.slice(0, 8).map(({ e, i, who, timestamp }) => ({
    id: String(e._id ?? e.id ?? i),
    user: nameOf(who),
    action: ACTION[e.status] ?? e.status,
    desc: e.title,
    amount: Number(e.reward) || 0,
    status: e.status === "done" ? "Success" : e.status === "cancelled" ? "Cancelled" : "Active",
    time: timeAgo(new Date(timestamp)),
    timestamp,
  }));

  const dashboardErrands: DashboardErrand[] = sorted.map(({ e, i, timestamp }) => ({
    id: String(e._id ?? e.id ?? i),
    status: e.status,
    category: e.category ?? "Others",
    reward: Number(e.reward) || 0,
    timestamp,
  }));

  return { stats, activity, errands: dashboardErrands };
}

export default function AdminDashboardContainer({ token }: { token: string }) {
  const [data, setData] = useState<ReturnType<typeof build> | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");

    Promise.all([api.getUsers(token), api.getAdminErrands(token), api.getStats(token)])
      .then(([userRes, errRes, statsRes]) => {
        if (!alive) return;

        if (!userRes.ok || !errRes.ok) {
          const failed = !userRes.ok ? ["users", userRes] : ["errands", errRes];
          const response = failed[1] as typeof userRes;
          setError(`Could not load ${failed[0]}: ${response.status} — ${response.error ?? "Request failed"}`);
          return;
        }

        const listFrom = (value: any, key: string): any[] => {
          const body = value?.[key] ?? value?.data?.[key] ?? value?.data;
          return Array.isArray(body) ? body : [];
        };
        const ul = listFrom(userRes, "users");
        const el = listFrom(errRes, "errands");
        const built = build(ul, el);
        if (statsRes.ok) {
          built.stats.totalUsers = Number(statsRes.totalUsers ?? built.stats.totalUsers);
          built.stats.activeErrands = Number(statsRes.activeErrands ?? built.stats.activeErrands);
          built.stats.openErrands = Number(statsRes.openErrands ?? built.stats.openErrands);
          built.stats.completedToday = Number(statsRes.completedToday ?? built.stats.completedToday);
          built.stats.overdueErrands = Number(statsRes.overdueErrands ?? built.stats.overdueErrands);
          built.stats.cancellations = Number(statsRes.cancellations ?? built.stats.cancellations);
          built.stats.revenue = Math.round(Number(statsRes.revenue ?? built.stats.revenue) * REVENUE_RATE);
        }
        setData(built);
        if (!statsRes.ok) setError(`Dashboard totals could not load (${statsRes.status}): ${statsRes.error ?? "Using user and errand records instead."}`);
        else if (ul.length === 0 && el.length === 0 && Number(statsRes.totalUsers ?? 0) === 0) {
          setError("The connected database returned no user or errand records. Check that this app is using the database where your accounts and errands are stored.");
        }
      })
      .catch(() => {
        if (alive) setError("Could not connect to the dashboard API. Check the backend URL and connection, then refresh.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [token]);

  return (
    <div className="space-y-6">
      {error && (
        <p className="mx-auto max-w-6xl rounded-2xl border border-rose-200 bg-rose-50 px-6 py-4 font-medium text-rose-600">
          {error}
        </p>
      )}
      {loading && <p className="mx-auto max-w-6xl rounded-2xl bg-white px-6 py-4 text-sm text-slate-500">Loading dashboard data…</p>}
      <AdminDashboard stats={data?.stats} activity={data?.activity} errands={data?.errands} />
    </div>
  );
}
