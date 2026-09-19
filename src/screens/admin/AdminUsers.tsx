import { useMemo, useState } from "react";
import { Search, Download, Plus, Star } from "lucide-react";
import { useStore } from "../../store";

type U = {
  name: string;
  id: string;
  email: string;
  role: "Runner" | "Student" | "Faculty";
  status: "Active" | "Suspended";
  posted: number;
  completed: number;
  rating: number;
};

const users: U[] = [
  { name: "Maria Santos", id: "04-2122-092", email: "maria.santos@upang.edu.ph", role: "Runner", status: "Active", posted: 12, completed: 48, rating: 5 },
  { name: "Juan Dela Cruz", id: "04-2021-143", email: "juan.delacruz@upang.edu.ph", role: "Student", status: "Active", posted: 32, completed: 5, rating: 4 },
  { name: "Ana Reyes", id: "04-1920-881", email: "ana.reyes@upang.edu.ph", role: "Faculty", status: "Active", posted: 45, completed: 0, rating: 4 },
  { name: "Abe Pineda", id: "04-2223-014", email: "abe.pineda@upang.edu.ph", role: "Runner", status: "Suspended", posted: 4, completed: 15, rating: 2 },
  { name: "Mark Lopez", id: "04-2122-772", email: "mark.lopez@upang.edu.ph", role: "Student", status: "Active", posted: 18, completed: 12, rating: 4 },
  { name: "Princess Reyes", id: "04-2324-401", email: "princess.reyes@upang.edu.ph", role: "Runner", status: "Active", posted: 1, completed: 29, rating: 5 },
];

const roleTint: Record<U["role"], string> = {
  Runner: "bg-amber-50 text-amber-600",
  Student: "bg-sky-50 text-sky-600",
  Faculty: "bg-violet-50 text-violet-600",
};

export default function AdminUsers() {
  const { pushToast } = useStore();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("All Users");

  const list = useMemo(
    () =>
      users.filter(
        (u) =>
          (tab === "All Users" || u.role === tab.slice(0, -1)) &&
          (u.name + u.id + u.email).toLowerCase().includes(query.toLowerCase()),
      ),
    [query, tab],
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative sm:w-80">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search users or ID numbers..."
              className="w-full rounded-2xl bg-white py-4 pl-12 pr-5 text-slate-800 shadow-sm outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="flex flex-wrap gap-3">
            {["All Users", "Students", "Faculties", "Runners"].map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-2xl px-6 py-3 font-semibold transition ${
                  tab === t
                    ? "bg-emerald-500 text-white"
                    : "bg-white text-slate-600 shadow-sm hover:bg-slate-50"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => pushToast("Exporting users.csv ...")}
            className="flex items-center gap-2 rounded-2xl bg-white px-5 py-3.5 font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <Download className="h-5 w-5 text-slate-400" /> Export CSV
          </button>
          <button
            onClick={() => pushToast("New user invite sent.")}
            className="flex items-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3.5 font-bold text-white shadow-md shadow-emerald-500/25 transition hover:bg-emerald-600"
          >
            <Plus className="h-5 w-5" /> Add User
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-3xl bg-white shadow-sm">
        <table className="w-full min-w-[980px] text-left">
          <thead>
            <tr className="text-xs font-bold tracking-[0.12em] text-slate-400">
              <th className="px-7 py-5">FULL NAME</th>
              <th className="px-7 py-5">ID NUMBER</th>
              <th className="px-7 py-5">UNIVERSITY EMAIL</th>
              <th className="px-7 py-5">ROLE</th>
              <th className="px-7 py-5">STATUS</th>
              <th className="px-7 py-5">POSTED</th>
              <th className="px-7 py-5">COMPLETED</th>
              <th className="px-7 py-5">RATING</th>
              <th className="px-7 py-5" />
            </tr>
          </thead>
          <tbody>
            {list.map((u) => (
              <tr key={u.id} className="border-t border-slate-100">
                <td className="px-7 py-5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-50 font-bold text-orange-500">
                      {u.name[0]}
                    </span>
                    <span className="font-bold text-slate-900">{u.name}</span>
                  </div>
                </td>
                <td className="px-7 py-5 text-slate-500">{u.id}</td>
                <td className="px-7 py-5 text-slate-500">{u.email}</td>
                <td className="px-7 py-5">
                  <span className={`rounded-lg px-3 py-1 text-xs font-bold ${roleTint[u.role]}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-7 py-5">
                  <span
                    className={`rounded-lg px-3 py-1 text-xs font-bold ${
                      u.status === "Active"
                        ? "bg-emerald-50 text-emerald-600"
                        : "bg-rose-50 text-rose-500"
                    }`}
                  >
                    {u.status}
                  </span>
                </td>
                <td className="px-7 py-5 font-semibold text-slate-700">{u.posted}</td>
                <td className="px-7 py-5 font-semibold text-slate-700">{u.completed}</td>
                <td className="px-7 py-5">
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i < u.rating ? "fill-amber-400 text-amber-400" : "text-slate-200"
                        }`}
                      />
                    ))}
                  </div>
                </td>
                <td className="px-7 py-5 text-right">
                  <button
                    onClick={() => pushToast(`Opening profile for ${u.name}.`)}
                    className="rounded-xl border border-slate-200 px-5 py-2 font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    View
                  </button>
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
                  ? "bg-emerald-500 text-white"
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
