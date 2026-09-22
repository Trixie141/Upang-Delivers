import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import AdminDashboard, { AdminStats, ActivityItem } from "./AdminDashboard";

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

// Monday = 0 ... Sunday = 6 (matches the chart labels)
const dayIndex = (d: Date) => (d.getDay() + 6) % 7;

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
  const names = new Map<string, string>();
  users.forEach((u) =>
    names.set(String(u._id ?? u.id), u.fullName ?? u.name ?? u.email ?? "Unknown")
  );
  const nameOf = (id: string) => names.get(id) ?? (id ? `…${id.slice(-6)}` : "Unknown");

  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - dayIndex(weekStart));

  const done = errands.filter((e) => e.status === "done");

  const weekly = [0, 0, 0, 0, 0, 0, 0];
  done.forEach((e) => {
    const d = whenOf(e);
    if (!isNaN(d.getTime()) && d >= weekStart) weekly[dayIndex(d)] += 1;
  });

  const stats: AdminStats = {
    totalUsers: users.length,
    activeErrands: errands.filter((e) => ACTIVE_STATUSES.includes(e.status)).length,
    completedToday: done.filter((e) => whenOf(e).toDateString() === today.toDateString()).length,
    revenue: Math.round(done.reduce((sum, e) => sum + (Number(e.reward) || 0), 0) * REVENUE_RATE),
  };

  const activity: ActivityItem[] = [...errands]
    .sort((a, b) => (whenOf(b).getTime() || 0) - (whenOf(a).getTime() || 0))
    .slice(0, 8)
    .map((e, i) => {
      const owner = refId(e.ownerId ?? e.owner_id);
      const runner = refId(e.runnerId ?? e.runner_id);
      // Runner-side steps are credited to the runner, everything else to the poster
      const who = e.status !== "open" && runner ? runner : owner;
      return {
        id: String(e._id ?? e.id ?? i),
        user: nameOf(who),
        action: ACTION[e.status] ?? e.status,
        desc: e.title,
        amount: Number(e.reward) || 0,
        status: e.status === "done" ? "Success" : e.status === "cancelled" ? "Cancelled" : "Active",
        time: timeAgo(whenOf(e)),
      };
    });

  return { stats, weekly, activity };
}

export default function AdminDashboardContainer({ token }: { token: string }) {
  const [data, setData] = useState<ReturnType<typeof build> | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;

    Promise.all([api.getUsers(token), api.getAdminErrands(token)]).then(([userRes, errRes]) => {
      if (!alive) return;

      if (!errRes.ok) {
        setError(`Could not load errands: ${errRes.status} — ${errRes.error}`);
        return;
      }
      if (!userRes.ok) {
        setError(`Could not load users: ${userRes.status} — ${userRes.error}`);
      }

      const ul = userRes.ok ? (userRes.users ?? userRes.data ?? []) : [];
      const el = errRes.errands ?? errRes.data ?? [];
      setData(build(Array.isArray(ul) ? ul : [], Array.isArray(el) ? el : []));
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
      <AdminDashboard stats={data?.stats} weekly={data?.weekly} activity={data?.activity} />
    </div>
  );
}