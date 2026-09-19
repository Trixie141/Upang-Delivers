import { useState } from "react";
import { Star, Download } from "lucide-react";
import { LineChart, DonutChart } from "../../components/Charts";
import { useStore } from "../../store";

const kpis = [
  { label: "TOTAL REVENUE (MONTH)", value: "₱42,850.00", note: "↑ 12.5% from last month", tone: "text-emerald-600" },
  { label: "COMPLETED ERRANDS", value: "1,248", note: "↑ 8.2% from last month", tone: "text-emerald-600" },
  { label: "ACTIVE RUNNERS", value: "156", note: "Currently online", tone: "text-slate-400" },
  { label: "DISPUTE RATE", value: "2.4%", note: "↑ 0.3% increase", tone: "text-rose-500", valueTone: "text-rose-500" },
];

const slices = [
  { label: "Food Run", value: 40, color: "#F97316" },
  { label: "Printing", value: 25, color: "#0B1524" },
  { label: "Shopping", value: 15, color: "#FB923C" },
  { label: "Queueing", value: 10, color: "#334155" },
  { label: "Academic", value: 10, color: "#FED7AA" },
];

const top = [
  { name: "Juan Dela Cruz", errands: 84, rating: 4.98, revenue: "₱4,250", success: "98.5%" },
  { name: "Maria Santos", errands: 76, rating: 4.92, revenue: "₱3,980", success: "97.1%" },
  { name: "Princess Reyes", errands: 71, rating: 4.9, revenue: "₱3,640", success: "96.4%" },
  { name: "Luz Villanueva", errands: 65, rating: 4.87, revenue: "₱3,120", success: "95.8%" },
];

const ranges = ["Last 7 Days", "Last 30 Days", "This Semester"];

const series: Record<string, number[]> = {
  "Last 7 Days": [45, 62, 58, 76, 89, 110, 86],
  "Last 30 Days": [60, 72, 68, 95, 88, 104, 120],
  "This Semester": [30, 55, 70, 65, 98, 112, 130],
};

export default function AdminReports() {
  const { pushToast } = useStore();
  const [range, setRange] = useState(ranges[0]);

  return (
    <div className="mx-auto max-w-6xl space-y-7">
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-3xl bg-white p-7 shadow-sm">
            <p className="text-xs font-bold tracking-[0.14em] text-slate-400">{k.label}</p>
            <p className={`mt-3 text-3xl font-extrabold ${k.valueTone ?? "text-slate-900"}`}>
              {k.value}
            </p>
            <p className={`mt-3 text-sm font-semibold ${k.tone}`}>{k.note}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-7 lg:grid-cols-2">
        <div className="rounded-3xl bg-white p-7 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h3 className="text-2xl font-bold text-slate-900">Errand Volume Trends</h3>
            <select
              value={range}
              onChange={(e) => setRange(e.target.value)}
              className="rounded-xl border border-slate-200 px-4 py-2.5 font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {ranges.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </div>
          <div className="mt-6">
            <LineChart
              data={series[range]}
              labels={["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]}
            />
          </div>
        </div>

        <div className="rounded-3xl bg-white p-7 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h3 className="text-2xl font-bold text-slate-900">Category Distribution</h3>
            <button
              onClick={() => pushToast("Opening full category breakdown.")}
              className="font-bold text-orange-500 hover:underline"
            >
              Full Details
            </button>
          </div>
          <div className="mt-6">
            <DonutChart slices={slices} />
          </div>
        </div>
      </div>

      <div className="rounded-3xl bg-white p-7 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h3 className="text-2xl font-bold text-slate-900">Top Performing Runners</h3>
          <button
            onClick={() => pushToast("Exporting top-runners.csv ...")}
            className="flex items-center gap-2 rounded-xl bg-slate-100 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-200"
          >
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead>
              <tr className="text-xs font-bold tracking-[0.12em] text-slate-400">
                <th className="py-4 pr-4">RUNNER NAME</th>
                <th className="py-4 pr-4">TOTAL ERRANDS</th>
                <th className="py-4 pr-4">RATING</th>
                <th className="py-4 pr-4">REVENUE GEN.</th>
                <th className="py-4">SUCCESS RATE</th>
              </tr>
            </thead>
            <tbody>
              {top.map((t) => (
                <tr key={t.name} className="border-t border-slate-100">
                  <td className="py-5 pr-4 font-bold text-slate-900">{t.name}</td>
                  <td className="py-5 pr-4 text-slate-600">{t.errands}</td>
                  <td className="py-5 pr-4">
                    <span className="flex items-center gap-2 font-bold text-orange-500">
                      <Star className="h-4 w-4 fill-orange-500 text-orange-500" /> {t.rating}
                    </span>
                  </td>
                  <td className="py-5 pr-4 font-semibold text-slate-700">{t.revenue}</td>
                  <td className="py-5">
                    <span className="rounded-lg bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-600">
                      {t.success}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
