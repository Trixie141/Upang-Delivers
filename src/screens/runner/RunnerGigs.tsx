import { useState } from "react";
import { MapPin, Clock, MessageSquare, CheckCircle2 } from "lucide-react";
import { useStore } from "../../store";

const tabs = ["Active", "Completed", "Pending Review"] as const;

export default function RunnerGigs() {
  const { runnerGigs, advanceGig, earnings, pushToast } = useStore();
  const [tab, setTab] = useState<(typeof tabs)[number]>("Active");

  const active = runnerGigs.filter(
    (g) => g.state === "IN PROGRESS" || g.state === "PICKED UP",
  );
  const completed = runnerGigs.filter((g) => g.state === "COMPLETED");
  const review = runnerGigs.filter((g) => g.state === "PENDING REVIEW");
  const shown = tab === "Active" ? active : tab === "Completed" ? completed : review;

  const count = { Active: active.length, Completed: completed.length, "Pending Review": review.length };

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex gap-8 border-b border-slate-200">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-[3px] px-1 pb-4 text-lg font-semibold transition ${
              tab === t
                ? "border-emerald-500 text-emerald-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t} {t === "Active" ? `(${count.Active})` : ""}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="rounded-3xl bg-white p-14 text-center text-slate-400 shadow-sm">
          Nothing here yet — browse errands to pick up a gig.
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {shown.map((g) => (
            <div key={g.id} className="flex flex-col rounded-3xl bg-white p-7 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <span
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold tracking-wide ${
                    g.state === "IN PROGRESS"
                      ? "bg-sky-50 text-sky-600"
                      : g.state === "PICKED UP"
                        ? "bg-orange-50 text-orange-500"
                        : g.state === "PENDING REVIEW"
                          ? "bg-violet-50 text-violet-600"
                          : "bg-emerald-50 text-emerald-600"
                  }`}
                >
                  {g.state}
                </span>
                <div className="text-right">
                  <p className="text-[11px] font-bold tracking-[0.15em] text-slate-400">REWARD</p>
                  <p className="text-3xl font-extrabold text-emerald-600">₱{g.reward}</p>
                </div>
              </div>

              <h3 className="mt-5 text-2xl font-bold leading-snug text-slate-900">{g.title}</h3>
              <p className="mt-1 text-slate-500">
                Requested by <span className="font-bold text-slate-800">{g.requester}</span>
              </p>

              <div className="mt-5 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50">
                    <MapPin className="h-5 w-5 text-emerald-500" />
                  </span>
                  <p className="text-slate-500">
                    Deliver to: <span className="font-bold text-slate-900">{g.to}</span>
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50">
                    <Clock className="h-5 w-5 text-sky-500" />
                  </span>
                  <p className="text-slate-500">
                    Deadline: <span className="font-bold text-slate-900">{g.deadline}</span>
                  </p>
                </div>
              </div>

              <div className="mt-7 grid grid-cols-2 gap-4">
                <button
                  onClick={() => pushToast(`Chat opened with ${g.requester}.`)}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-[#0B1524] py-4 text-lg font-bold text-white transition hover:bg-slate-800"
                >
                  <MessageSquare className="h-5 w-5" /> Chat {g.requester.split(" ")[0]}
                </button>
                <button
                  disabled={g.state === "PENDING REVIEW" || g.state === "COMPLETED"}
                  onClick={() => {
                    advanceGig(g.id);
                    pushToast(
                      g.state === "IN PROGRESS"
                        ? "Marked as picked up!"
                        : "Delivery submitted for review.",
                    );
                  }}
                  className="rounded-2xl bg-emerald-500 py-4 text-lg font-bold text-white shadow-md shadow-emerald-500/25 transition hover:bg-emerald-600 disabled:bg-emerald-100 disabled:text-emerald-600 disabled:shadow-none"
                >
                  {g.state === "IN PROGRESS"
                    ? "Complete Delivery"
                    : g.state === "PICKED UP"
                      ? "Complete Delivery"
                      : "Awaiting Review"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div>
        <h2 className="mb-4 text-2xl font-bold text-slate-900">Recent Earnings</h2>
        <div className="overflow-x-auto rounded-3xl bg-white shadow-sm">
          <table className="w-full min-w-[640px] text-left">
            <thead>
              <tr className="bg-slate-50/70 text-xs font-bold tracking-[0.12em] text-slate-400">
                <th className="px-7 py-5">ERRAND</th>
                <th className="px-7 py-5">DATE</th>
                <th className="px-7 py-5">REWARD</th>
                <th className="px-7 py-5">STATUS</th>
              </tr>
            </thead>
            <tbody>
              {earnings.map((e) => (
                <tr key={e.order} className="border-t border-slate-100">
                  <td className="px-7 py-5">
                    <p className="font-bold text-slate-900">{e.errand}</p>
                    <p className="text-sm text-slate-400">{e.order}</p>
                  </td>
                  <td className="px-7 py-5 text-slate-500">{e.date}</td>
                  <td className="px-7 py-5 font-bold text-slate-900">
                    ₱{e.reward.toFixed(2)}
                  </td>
                  <td className="px-7 py-5">
                    {e.status === "Paid" ? (
                      <span className="flex items-center gap-2 font-semibold text-emerald-600">
                        <CheckCircle2 className="h-4 w-4" /> Paid
                      </span>
                    ) : (
                      <span className="font-semibold text-orange-500">Pending</span>
                    )}
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
