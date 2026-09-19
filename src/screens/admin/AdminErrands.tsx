import { useMemo, useState } from "react";
import { AlertTriangle, Filter } from "lucide-react";
import { useStore } from "../../store";

type Row = {
  id: string;
  title: string;
  by: string;
  runner: string;
  category: string;
  amount: number;
  status: "Completed" | "Flagged" | "Disputed" | "Active" | "Cancelled";
  date: string;
};

const rows: Row[] = [
  { id: "#ERR-892", title: "Canteen Pork Silog Delivery", by: "Ana Reyes", runner: "Juan Dela Cruz", category: "Food Run", amount: 80, status: "Completed", date: "Oct 24, 2024" },
  { id: "#ERR-891", title: "Print 15-page syllabus (CMA)", by: "Dr. Torres", runner: "Maria Santos", category: "Printing", amount: 60, status: "Flagged", date: "Oct 24, 2024" },
  { id: "#ERR-890", title: "CMA Hall Enrollment queue proxy", by: "Princess Reyes", runner: "Abe Pineda", category: "Queueing", amount: 150, status: "Disputed", date: "Oct 23, 2024" },
  { id: "#ERR-889", title: "Buy Blue Book & yellow pad", by: "Mark Lopez", runner: "Maria Santos", category: "Shopping", amount: 45, status: "Active", date: "Oct 23, 2024" },
  { id: "#ERR-888", title: "Return Library Books (Main)", by: "Juan Dela Cruz", runner: "Princess Reyes", category: "Academic", amount: 50, status: "Completed", date: "Oct 22, 2024" },
  { id: "#ERR-887", title: "Urgent medicine run from Plaza", by: "Nurse Garcia", runner: "Mark Lopez", category: "Medical", amount: 120, status: "Cancelled", date: "Oct 22, 2024" },
];

const statusTint: Record<Row["status"], string> = {
  Completed: "bg-emerald-50 text-emerald-600",
  Flagged: "bg-rose-50 text-rose-500",
  Disputed: "bg-amber-50 text-amber-600",
  Active: "bg-sky-50 text-sky-600",
  Cancelled: "bg-slate-100 text-slate-500",
};

const tabs = [
  { key: "All Errands", count: 184 },
  { key: "Active", count: 12 },
  { key: "Completed", count: 145 },
  { key: "Cancelled", count: 21 },
  { key: "Disputed", count: 6 },
];

export default function AdminErrands() {
  const { pushToast } = useStore();
  const [tab, setTab] = useState("All Errands");
  const [banner, setBanner] = useState(true);

  const list = useMemo(
    () => rows.filter((r) => tab === "All Errands" || r.status === tab),
    [tab],
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {banner && (
        <div className="flex flex-col gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-4">
            <AlertTriangle className="h-6 w-6 shrink-0 text-amber-500" />
            <p className="text-slate-700">
              <span className="font-bold text-amber-700">⚠ 2 Flagged Errands require review.</span>{" "}
              Suspicious pricing patterns or prohibited items reported near basic ed building block.
            </p>
          </div>
          <button
            onClick={() => {
              setTab("Disputed");
              setBanner(false);
              pushToast("Showing flagged & disputed errands.");
            }}
            className="shrink-0 rounded-xl bg-emerald-500 px-6 py-3 font-bold text-white transition hover:bg-emerald-600"
          >
            Review Now
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-3">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 rounded-2xl px-5 py-3 font-semibold transition ${
                tab === t.key
                  ? "bg-emerald-500 text-white"
                  : "bg-white text-slate-600 shadow-sm hover:bg-slate-50"
              }`}
            >
              {t.key}
              <span
                className={`rounded-md px-2 py-0.5 text-xs font-bold ${
                  tab === t.key ? "bg-white/20" : "bg-slate-100 text-slate-500"
                }`}
              >
                {t.count}
              </span>
            </button>
          ))}
        </div>
        <button
          onClick={() => pushToast("More filters coming soon.")}
          className="flex items-center gap-2 rounded-2xl bg-white px-5 py-3 font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <Filter className="h-5 w-5 text-slate-400" /> More Filters
        </button>
      </div>

      <div className="overflow-x-auto rounded-3xl bg-white shadow-sm">
        <table className="w-full min-w-[1040px] text-left">
          <thead>
            <tr className="text-xs font-bold tracking-[0.12em] text-slate-400">
              <th className="px-7 py-5">ERRAND ID</th>
              <th className="px-7 py-5">TITLE / TASK DETAILS</th>
              <th className="px-7 py-5">POSTED BY</th>
              <th className="px-7 py-5">ASSIGNED RUNNER</th>
              <th className="px-7 py-5">CATEGORY</th>
              <th className="px-7 py-5">AMOUNT</th>
              <th className="px-7 py-5">STATUS</th>
              <th className="px-7 py-5">DATE POSTED</th>
              <th className="px-7 py-5 text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="px-7 py-5 font-bold text-orange-500">{r.id}</td>
                <td className="px-7 py-5 font-bold text-slate-900">{r.title}</td>
                <td className="px-7 py-5 text-slate-600">{r.by}</td>
                <td className="px-7 py-5 text-slate-600">{r.runner}</td>
                <td className="px-7 py-5">
                  <span className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    {r.category}
                  </span>
                </td>
                <td className="px-7 py-5 font-bold text-orange-500">₱{r.amount}</td>
                <td className="px-7 py-5">
                  <span className={`rounded-lg px-3 py-1 text-xs font-bold ${statusTint[r.status]}`}>
                    {r.status}
                  </span>
                </td>
                <td className="px-7 py-5 text-slate-500">{r.date}</td>
                <td className="px-7 py-5">
                  <div className="flex justify-end gap-2">
                    {(r.status === "Flagged" || r.status === "Disputed") && (
                      <button
                        onClick={() => pushToast(`Audit started for ${r.id}.`)}
                        className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-200"
                      >
                        Audit
                      </button>
                    )}
                    <button
                      onClick={() => pushToast(`Resolved ${r.id}.`)}
                      className="rounded-xl bg-rose-50 px-4 py-2 text-sm font-bold text-rose-500 transition hover:bg-rose-100"
                    >
                      Resolve
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-slate-500">Showing 1 to {list.length} of 42 entries</p>
        <div className="flex gap-2">
          {["Previous", "1", "2", "3", "Next"].map((p) => (
            <button
              key={p}
              onClick={() => pushToast(`Page ${p}`)}
              className={`rounded-xl px-4 py-2.5 font-semibold transition ${
                p === "1"
                  ? "bg-orange-500 text-white"
                  : "bg-white text-slate-600 shadow-sm hover:bg-slate-50"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
