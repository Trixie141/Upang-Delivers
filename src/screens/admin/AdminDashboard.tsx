import { LineChart } from "../../components/Charts";

export interface AdminStats {
  totalUsers: number;
  activeErrands: number;
  completedToday: number;
  revenue: number;
}

export interface ActivityItem {
  id: string;
  user: string;
  action: string;
  desc: string;
  amount: number;
  status: "Success" | "Active" | "Cancelled";
  time: string;
}

const EMPTY_STATS: AdminStats = {
  totalUsers: 0,
  activeErrands: 0,
  completedToday: 0,
  revenue: 0,
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface AdminDashboardProps {
  stats?: AdminStats;
  /** Completed errands per day, Mon to Sun (7 numbers) */
  weekly?: number[];
  activity?: ActivityItem[];
}

export default function AdminDashboard({
  stats = EMPTY_STATS,
  weekly = [],
  activity = [],
}: AdminDashboardProps) {
  const cards = [
    { label: "TOTAL USERS", value: stats.totalUsers.toLocaleString() },
    { label: "ACTIVE ERRANDS", value: stats.activeErrands.toLocaleString() },
    { label: "COMPLETED TODAY", value: stats.completedToday.toLocaleString() },
    { label: "REVENUE", value: `₱${stats.revenue.toLocaleString()}` },
  ];

  const hasWeekly = weekly.length === 7 && weekly.some((v) => v > 0);

  return (
    <div className="mx-auto max-w-6xl space-y-7">
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-3xl bg-white p-7 shadow-sm">
            <p className="text-xs font-bold tracking-[0.14em] text-slate-400">
              {c.label}
            </p>
            <p className="mt-4 text-4xl font-extrabold text-slate-900">
              {c.value}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-3xl bg-white p-7 shadow-sm">
        <h3 className="text-2xl font-bold text-slate-900">Errands This Week</h3>
        <p className="mt-1 text-slate-500">
          Daily volume of completed deliveries and tasks on campus
        </p>
        <div className="mt-6">
          {hasWeekly ? (
            <LineChart data={weekly} labels={DAYS} showAxis={false} />
          ) : (
            <p className="rounded-2xl bg-slate-50 py-16 text-center text-slate-400">
              No completed errands this week yet.
            </p>
          )}
        </div>
      </div>

      <div className="rounded-3xl bg-white p-7 shadow-sm">
        <h3 className="text-2xl font-bold text-slate-900">
          Recent Campus Activity
        </h3>
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
              {activity.length === 0 && (
                <tr className="border-t border-slate-100">
                  <td colSpan={6} className="py-14 text-center text-slate-400">
                    No activity yet. Errands posted and completed by students
                    and runners will show up here.
                  </td>
                </tr>
              )}
              {activity.map((a) => (
                <tr key={a.id} className="border-t border-slate-100">
                  <td className="py-5 pr-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 font-bold text-emerald-600">
                        {a.user.charAt(0).toUpperCase()}
                      </span>
                      <span className="font-bold text-slate-900">{a.user}</span>
                    </div>
                  </td>
                  <td className="py-5 pr-4 font-semibold text-emerald-600">
                    {a.action}
                  </td>
                  <td className="py-5 pr-4 text-slate-600">{a.desc}</td>
                  <td className="py-5 pr-4 font-bold text-orange-500">
                    ₱{a.amount}
                  </td>
                  <td className="py-5 pr-4">
                    <span
                      className={`rounded-lg px-3 py-1 text-xs font-bold ${
                        a.status === "Success"
                          ? "bg-emerald-50 text-emerald-600"
                          : a.status === "Active"
                            ? "bg-rose-50 text-rose-500"
                            : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {a.status}
                    </span>
                  </td>
                  <td className="py-5 text-right text-slate-400">{a.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}