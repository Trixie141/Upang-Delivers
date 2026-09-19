import { useMemo, useState } from "react";
import { Bike, CheckCircle2, Clock, Star, Search, Eye, MapPin, Ban } from "lucide-react";
import { useStore } from "../../store";

const runners = [
  { name: "Maria Santos", id: "RUN-902", status: "ON DELIVERY", order: "#ERR-2041", lifetime: 142, rating: 5 },
  { name: "Abe Pineda", id: "RUN-014", status: "IDLE", order: "–", lifetime: 89, rating: 4.8 },
  { name: "Princess Reyes", id: "RUN-401", status: "ON DELIVERY", order: "#ERR-2045", lifetime: 212, rating: 4.9 },
  { name: "Miguel Cruz", id: "RUN-330", status: "OFFLINE", order: "–", lifetime: 56, rating: 4.7 },
  { name: "Luz Villanueva", id: "RUN-502", status: "ON DELIVERY", order: "#ERR-2049", lifetime: 178, rating: 5 },
  { name: "Ricardo Dalisay", id: "RUN-112", status: "IDLE", order: "–", lifetime: 324, rating: 4.9 },
];

const stats = [
  { label: "TOTAL RUNNERS", value: "142", icon: Bike, tint: "bg-orange-50 text-orange-500" },
  { label: "COMPLETED TASKS", value: "1,204", icon: CheckCircle2, tint: "bg-emerald-50 text-emerald-500" },
  { label: "AVG. TIME", value: "12m", icon: Clock, tint: "bg-sky-50 text-sky-500" },
  { label: "RATING", value: "4.9", icon: Star, tint: "bg-amber-50 text-amber-500" },
];

export default function AdminRunners() {
  const { pushToast } = useStore();
  const [query, setQuery] = useState("");
  const list = useMemo(
    () => runners.filter((r) => (r.name + r.id).toLowerCase().includes(query.toLowerCase())),
    [query],
  );

  return (
    <div className="mx-auto max-w-6xl space-y-7">
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-3xl bg-white p-7 shadow-sm">
              <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${s.tint}`}>
                <Icon className="h-7 w-7" />
              </div>
              <p className="mt-5 text-xs font-bold tracking-[0.14em] text-slate-400">{s.label}</p>
              <p className="mt-1 text-4xl font-extrabold text-slate-900">{s.value}</p>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-slate-900">Active Delivery Personnel</h2>
        <div className="relative sm:w-72">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by name or ID..."
            className="w-full rounded-2xl bg-white py-3.5 pl-12 pr-5 text-slate-800 shadow-sm outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-3xl bg-white shadow-sm">
        <table className="w-full min-w-[900px] text-left">
          <thead>
            <tr className="text-xs font-bold tracking-[0.12em] text-slate-400">
              <th className="px-7 py-5">RUNNER</th>
              <th className="px-7 py-5">VEHICLE TYPE</th>
              <th className="px-7 py-5">STATUS</th>
              <th className="px-7 py-5">ACTIVE ORDER</th>
              <th className="px-7 py-5">LIFETIME ERRANDS</th>
              <th className="px-7 py-5">RATING</th>
              <th className="px-7 py-5 text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="px-7 py-5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-orange-50 font-bold text-orange-500">
                      {r.name.split(" ").map((n) => n[0]).join("")}
                    </span>
                    <div>
                      <p className="font-bold text-slate-900">{r.name}</p>
                      <p className="text-sm text-slate-400">{r.id}</p>
                    </div>
                  </div>
                </td>
                <td className="px-7 py-5 text-slate-600">Walking</td>
                <td className="px-7 py-5">
                  <span
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                      r.status === "ON DELIVERY"
                        ? "bg-sky-50 text-sky-600"
                        : r.status === "IDLE"
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {r.status}
                  </span>
                </td>
                <td className="px-7 py-5">
                  {r.order === "–" ? (
                    <span className="text-slate-400">–</span>
                  ) : (
                    <button
                      onClick={() => pushToast(`Opening ${r.order}`)}
                      className="font-bold text-sky-600 underline"
                    >
                      {r.order}
                    </button>
                  )}
                </td>
                <td className="px-7 py-5 font-semibold text-slate-700">{r.lifetime}</td>
                <td className="px-7 py-5">
                  <span className="flex items-center gap-1 font-bold text-slate-800">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" /> {r.rating}
                  </span>
                </td>
                <td className="px-7 py-5">
                  <div className="flex justify-end gap-2">
                    {[
                      { icon: Eye, msg: `Viewing ${r.name}` },
                      { icon: MapPin, msg: `Locating ${r.name} on campus map` },
                      { icon: Ban, msg: `${r.name} suspended` },
                    ].map((a, i) => {
                      const Icon = a.icon;
                      return (
                        <button
                          key={i}
                          onClick={() => pushToast(a.msg)}
                          className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
                        >
                          <Icon className="h-4 w-4" />
                        </button>
                      );
                    })}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
