import { LineChart } from "../../components/Charts";
import { useStore } from "../../store";

const stats = [
  { label: "TOTAL USERS", value: "1,247", badge: "+8.2%", tone: "bg-emerald-50 text-emerald-600" },
  { label: "ACTIVE ERRANDS", value: "38", badge: "High Traffic", tone: "bg-emerald-50 text-emerald-600" },
  { label: "COMPLETED TODAY", value: "92", badge: "+14.5%", tone: "bg-emerald-50 text-emerald-600" },
  { label: "REVENUE", value: "₱14,580", badge: "+24.1%", tone: "bg-emerald-50 text-emerald-600" },
];

const activity = [
  { user: "Juan Dela Cruz", initial: "J", action: "Completed Food Run", desc: "2 Pork Silog from Student Plaza", amount: 80, status: "Success", time: "5 mins ago" },
  { user: "Maria Santos", initial: "M", action: "Posted New Errand", desc: "Print 10 Pages Case Study", amount: 50, status: "Active", time: "12 mins ago" },
  { user: "Abe Pineda", initial: "A", action: "Accepted Errand", desc: "Queue at Cashier Window 3", amount: 110, status: "Active", time: "18 mins ago" },
  { user: "Princess Reyes", initial: "P", action: "Completed Delivery", desc: "Return Library Books (Main)", amount: 50, status: "Success", time: "26 mins ago" },
  { user: "Mark Lopez", initial: "M", action: "Cancelled Errand", desc: "Urgent medicine run from Plaza", amount: 120, status: "Cancelled", time: "41 mins ago" },
];

export default function AdminDashboard() {
  const { pushToast } = useStore();
  return (
    <div className="mx-auto max-w-6xl space-y-7">
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-3xl bg-white p-7 shadow-sm">
            <p className="text-xs font-bold tracking-[0.14em] text-slate-400">{s.label}</p>
            <div className="mt-4 flex items-end justify-between gap-3">
              <p className="text-4xl font-extrabold text-slate-900">{s.value}</p>
              <span className={`rounded-lg px-3 py-1 text-xs font-bold ${s.tone}`}>{s.badge}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-3xl bg-white p-7 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-2xl font-bold text-slate-900">Errands This Week</h3>
            <p className="mt-1 text-slate-500">
              Daily volume of completed deliveries and tasks on campus
            </p>
          </div>
          <span className="rounded-xl bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-600">
            +18% Peak Activity
          </span>
        </div>
        <div className="mt-6">
          <LineChart
            data={[42, 62, 58, 78, 88, 112, 86]}
            labels={["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]}
            showAxis={false}
          />
        </div>
      </div>

      <div className="rounded-3xl bg-white p-7 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h3 className="text-2xl font-bold text-slate-900">Recent Campus Activity</h3>
          <button
            onClick={() => pushToast("Loading full activity log...")}
            className="font-bold text-orange-500 hover:underline"
          >
            View All Activity
          </button>
        </div>
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
              {activity.map((a) => (
                <tr key={a.desc} className="border-t border-slate-100">
                  <td className="py-5 pr-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 font-bold text-emerald-600">
                        {a.initial}
                      </span>
                      <span className="font-bold text-slate-900">{a.user}</span>
                    </div>
                  </td>
                  <td className="py-5 pr-4 font-semibold text-emerald-600">{a.action}</td>
                  <td className="py-5 pr-4 text-slate-600">{a.desc}</td>
                  <td className="py-5 pr-4 font-bold text-orange-500">₱{a.amount}</td>
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
