import { useMemo, useState } from "react";
import { LineChart } from "../../components/Charts";

export interface AdminStats {
  totalUsers: number;
  activeErrands: number;
  openErrands: number;
  completedToday: number;
  revenue: number;
  overdueErrands: number;
  cancellations: number;
}

export interface ActivityItem {
  id: string;
  user: string;
  action: string;
  desc: string;
  amount: number;
  status: "Success" | "Active" | "Cancelled";
  time: string;
  timestamp: number;
}

export interface DashboardErrand {
  id: string;
  status: string;
  category: string;
  reward: number;
  timestamp: number;
}

const EMPTY_STATS: AdminStats = {
  totalUsers: 0,
  activeErrands: 0,
  openErrands: 0,
  completedToday: 0,
  revenue: 0,
  overdueErrands: 0,
  cancellations: 0,
};

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  in_progress: "In progress",
  picked_up: "Picked up",
  review: "In review",
  done: "Completed",
  cancelled: "Cancelled",
};

const STATUS_COLORS: Record<string, string> = {
  open: "#10b981",
  in_progress: "#0ea5e9",
  picked_up: "#6366f1",
  review: "#f59e0b",
  done: "#059669",
  cancelled: "#94a3b8",
};

const CATEGORY_COLORS: Record<string, string> = {
  "Food Run": "#f97316",
  Printing: "#0ea5e9",
  Queuing: "#8b5cf6",
  Deliveries: "#10b981",
  Others: "#64748b",
};

const formatPeso = (amount: number) =>
  `₱${amount.toLocaleString("en-PH", { maximumFractionDigits: 0 })}`;

function HorizontalBars({
  rows,
}: {
  rows: { label: string; value: number; color: string }[];
}) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  return (
    <div className="mt-6 space-y-5">
      {rows.map((row) => (
        <div key={row.label}>
          <div className="mb-2 flex items-center justify-between gap-4 text-sm">
            <span className="font-medium text-slate-600">{row.label}</span>
            <span className="font-bold text-slate-900">{row.value}</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full transition-[width] duration-300"
              style={{ width: `${(row.value / max) * 100}%`, backgroundColor: row.color }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

interface AdminDashboardProps {
  stats?: AdminStats;
  activity?: ActivityItem[];
  errands?: DashboardErrand[];
}

export default function AdminDashboard({
  stats = EMPTY_STATS,
  activity = [],
  errands = [],
}: AdminDashboardProps) {
  const [range, setRange] = useState<"7d" | "30d">("7d");
  const days = range === "7d" ? 7 : 30;
  const now = Date.now();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  const startTime = start.getTime();
  const bucketCount = range === "7d" ? 7 : 5;

  const periodErrands = useMemo(
    () => errands.filter((errand) => errand.timestamp >= startTime && errand.timestamp <= now),
    [errands, startTime, now],
  );
  const periodActivity = useMemo(
    () => activity.filter((item) => item.timestamp >= startTime && item.timestamp <= now).slice(0, 8),
    [activity, startTime, now],
  );

  const completed = periodErrands.filter((errand) => errand.status === "done");
  const completedReward = completed.reduce((sum, errand) => sum + errand.reward, 0);

  const byStatus = periodErrands.reduce<Record<string, number>>((counts, errand) => {
    counts[errand.status] = (counts[errand.status] ?? 0) + 1;
    return counts;
  }, {});
  const statusRows = Object.entries(STATUS_LABELS).map(([status, label]) => ({
    label,
    value: byStatus[status] ?? 0,
    color: STATUS_COLORS[status],
  }));

  const byCategory = periodErrands.reduce<Record<string, number>>((counts, errand) => {
    counts[errand.category] = (counts[errand.category] ?? 0) + 1;
    return counts;
  }, {});
  const categoryRows = Object.entries(CATEGORY_COLORS).map(([label, color]) => ({
    label,
    value: byCategory[label] ?? 0,
    color,
  }));

  const lineData = Array.from({ length: bucketCount }, () => 0);
  const lineLabels = range === "7d"
    ? Array.from({ length: 7 }, (_, index) => {
        const date = new Date(startTime + index * 24 * 60 * 60 * 1000);
        return date.toLocaleDateString("en-PH", { weekday: "short" });
      })
    : ["Days 30–25", "24–19", "18–13", "12–7", "6–today"];

  completed.forEach((errand) => {
    const bucket = Math.min(
      bucketCount - 1,
      Math.floor(((errand.timestamp - startTime) / (days * 24 * 60 * 60 * 1000)) * bucketCount),
    );
    if (bucket >= 0) lineData[bucket] += 1;
  });

  const cards = [
    { label: "TOTAL USERS", value: stats.totalUsers.toLocaleString(), note: "All registered accounts" },
    { label: "ERRANDS IN PERIOD", value: periodErrands.length.toLocaleString(), note: `Last ${days} days · latest 200 records` },
    { label: "COMPLETED IN PERIOD", value: completed.length.toLocaleString(), note: `Last ${days} days · latest 200 records` },
    { label: "COMPLETED REWARD VALUE", value: formatPeso(completedReward), note: `Last ${days} days · completed errands` },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-7">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white px-5 py-4 shadow-sm">
        <div>
          <h2 className="font-bold text-slate-900">Dashboard overview</h2>
        </div>
        <label className="flex items-center gap-3 text-sm font-semibold text-slate-600">
          Activity period
          <select
            value={range}
            onChange={(event) => setRange(event.target.value as "7d" | "30d")}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 font-semibold text-slate-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
          </select>
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-xs font-bold tracking-[0.12em] text-slate-400">{card.label}</p>
            <p className="mt-3 text-3xl font-extrabold text-slate-900">{card.value}</p>
            <p className="mt-2 text-xs text-slate-500">{card.note}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-7 lg:grid-cols-2">
        <section className="rounded-3xl bg-white p-7 shadow-sm lg:col-span-2">
          <h3 className="text-xl font-bold text-slate-900">Completed Errands Over Time</h3>
          <div className="mt-5">
            {completed.length ? (
              <LineChart data={lineData} labels={lineLabels} showAxis />
            ) : (
              <p className="rounded-2xl bg-slate-50 py-12 text-center text-slate-400">
                No completed errands in this period.
              </p>
            )}
          </div>
        </section>

        <section className="rounded-3xl bg-white p-7 shadow-sm">
          <h3 className="text-xl font-bold text-slate-900">Errands by Status</h3>
          {periodErrands.length ? (
            <HorizontalBars rows={statusRows} />
          ) : (
            <p className="mt-6 rounded-2xl bg-slate-50 py-12 text-center text-slate-400">No errands in this period.</p>
          )}
        </section>

        <section className="rounded-3xl bg-white p-7 shadow-sm">
          <h3 className="text-xl font-bold text-slate-900">Errands by Category</h3>
          {periodErrands.length ? (
            <HorizontalBars rows={categoryRows} />
          ) : (
            <p className="mt-6 rounded-2xl bg-slate-50 py-12 text-center text-slate-400">No errands in this period.</p>
          )}
        </section>
      </div>

      <section className="rounded-3xl bg-white p-7 shadow-sm">
        <h3 className="text-2xl font-bold text-slate-900">Recent Campus Activity</h3>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead>
              <tr className="text-xs font-bold tracking-[0.12em] text-slate-400">
                <th className="py-4 pr-4">USER</th>
                <th className="py-4 pr-4">ACTION</th>
                <th className="py-4 pr-4">ERRAND DESCRIPTION</th>
                <th className="py-4 pr-4">AMOUNT</th>
                <th className="py-4 pr-4">STATUS</th>
                <th className="py-4 text-right">TIME</th>
              </tr>
            </thead>
            <tbody>
              {periodActivity.length === 0 && (
                <tr className="border-t border-slate-100">
                  <td colSpan={6} className="py-14 text-center text-slate-400">No activity in this period.</td>
                </tr>
              )}
              {periodActivity.map((item) => (
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="py-5 pr-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 font-bold text-emerald-600">
                        {item.user.charAt(0).toUpperCase()}
                      </span>
                      <span className="font-bold text-slate-900">{item.user}</span>
                    </div>
                  </td>
                  <td className="py-5 pr-4 font-semibold text-emerald-600">{item.action}</td>
                  <td className="py-5 pr-4 text-slate-600">{item.desc}</td>
                  <td className="py-5 pr-4 font-bold text-orange-500">₱{item.amount}</td>
                  <td className="py-5 pr-4">
                    <span className={`rounded-lg px-3 py-1 text-xs font-bold ${item.status === "Success" ? "bg-emerald-50 text-emerald-600" : item.status === "Active" ? "bg-sky-50 text-sky-600" : "bg-slate-100 text-slate-500"}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="py-5 text-right text-slate-400">{item.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
