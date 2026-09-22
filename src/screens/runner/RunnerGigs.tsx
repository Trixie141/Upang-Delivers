import { useEffect, useState, useCallback } from "react";
import { MapPin, Clock, MessageSquare, CheckCircle2, RefreshCw } from "lucide-react";
import { api } from "../../lib/api";
import { useStore } from "../../store";

const tabs = ["Active", "Completed", "Pending Review"] as const;

type ErrandStatus = "open" | "in_progress" | "picked_up" | "review" | "done" | "cancelled";

interface Gig {
  _id: string;
  title: string;
  reward: number;
  dropoff: string;
  deadline: string;
  status: ErrandStatus;
  ownerId?: string | { _id: string; fullName: string };
}

interface Transaction {
  _id: string;
  errandId: string;
  amount: number;
  createdAt: string;
}

// Progression a runner drives with the "Complete Delivery" button.
// The final step (review -> done) is left for the requester to confirm.
const NEXT_STATUS: Partial<Record<ErrandStatus, ErrandStatus>> = {
  in_progress: "picked_up",
  picked_up: "review",
};

export default function RunnerGigs({ token, userId }: { token: string; userId: string }) {
  const { pushToast } = useStore();
  const [tab, setTab] = useState<(typeof tabs)[number]>("Active");
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [advancingId, setAdvancingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const apiClient = api as any;

    const gigsRes = await apiClient.getMyErrands(token);
    if (gigsRes.ok) {
      const mine = (gigsRes.errands || []).filter((e: Gig) => {
        // /mine returns errands where I'm the owner OR the runner — keep only
        // the ones where I'm the assigned runner, since this is the runner view.
        const owner = typeof e.ownerId === "object" ? e.ownerId?._id : e.ownerId;
        return String(owner) !== userId;
      });
      setGigs(mine);
    } else {
      pushToast(`${gigsRes.status} — ${gigsRes.error || "Failed to load your gigs."}`);
    }

    const txRes = await apiClient.getMyTransactions(token);
    if (txRes.ok) setTransactions(txRes.transactions || []);

    setLoading(false);
  }, [token, userId, pushToast]);

  useEffect(() => {
    load();
  }, [load]);

  const active = gigs.filter((g) => g.status === "in_progress" || g.status === "picked_up");
  const completed = gigs.filter((g) => g.status === "done");
  const review = gigs.filter((g) => g.status === "review");
  const shown = tab === "Active" ? active : tab === "Completed" ? completed : review;
  const count = { Active: active.length, Completed: completed.length, "Pending Review": review.length };

  const statusLabel: Record<string, string> = {
    in_progress: "IN PROGRESS",
    picked_up: "PICKED UP",
    review: "PENDING REVIEW",
    done: "COMPLETED",
  };

  const advance = async (gig: Gig) => {
    const next = NEXT_STATUS[gig.status];
    if (!next) return;

    setAdvancingId(gig._id);
    const apiClient = api as any;
    const res = await apiClient.updateErrandStatus(token, gig._id, next);
    setAdvancingId(null);

    if (!res.ok) {
      pushToast(`${res.status} — ${res.error || "Could not update the errand."}`);
      return;
    }

    setGigs((prev) => prev.map((g) => (g._id === gig._id ? { ...g, status: next } : g)));
    pushToast(next === "picked_up" ? "Marked as picked up!" : "Delivery submitted for review.");
  };

  // Errand titles for the earnings table, since a transaction only stores errandId.
  const titleFor = (errandId: string) => gigs.find((g) => g._id === errandId)?.title ?? "Errand";
  

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex items-center justify-between border-b border-slate-200">
        <div className="flex gap-8">
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
        <button
          onClick={load}
          className="mb-4 flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-500">Loading your gigs...</div>
      ) : shown.length === 0 ? (
        <div className="rounded-3xl bg-white p-14 text-center text-slate-400 shadow-sm">
          Nothing here yet — browse errands to pick up a gig.
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {shown.map((g) => {
            const requesterName =
              typeof g.ownerId === "object" && g.ownerId ? g.ownerId.fullName : "Requester";
            const next = NEXT_STATUS[g.status];

            return (
              <div key={g._id} className="flex flex-col rounded-3xl bg-white p-7 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <span
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold tracking-wide ${
                      g.status === "in_progress"
                        ? "bg-sky-50 text-sky-600"
                        : g.status === "picked_up"
                          ? "bg-orange-50 text-orange-500"
                          : g.status === "review"
                            ? "bg-violet-50 text-violet-600"
                            : "bg-emerald-50 text-emerald-600"
                    }`}
                  >
                    {statusLabel[g.status]}
                  </span>
                  <div className="text-right">
                    <p className="text-[11px] font-bold tracking-[0.15em] text-slate-400">REWARD</p>
                    <p className="text-3xl font-extrabold text-emerald-600">₱{g.reward}</p>
                  </div>
                </div>

                <h3 className="mt-5 text-2xl font-bold leading-snug text-slate-900">{g.title}</h3>
                <p className="mt-1 text-slate-500">
                  Requested by <span className="font-bold text-slate-800">{requesterName}</span>
                </p>

                <div className="mt-5 space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50">
                      <MapPin className="h-5 w-5 text-emerald-500" />
                    </span>
                    <p className="text-slate-500">
                      Deliver to: <span className="font-bold text-slate-900">{g.dropoff}</span>
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
                    onClick={() => pushToast(`Chat opened with ${requesterName}.`)}
                    className="flex items-center justify-center gap-2 rounded-2xl bg-[#0B1524] py-4 text-lg font-bold text-white transition hover:bg-slate-800"
                  >
                    <MessageSquare className="h-5 w-5" /> Chat {requesterName.split(" ")[0]}
                  </button>
                  <button
                    disabled={!next || advancingId === g._id}
                    onClick={() => advance(g)}
                    className="rounded-2xl bg-emerald-500 py-4 text-lg font-bold text-white shadow-md shadow-emerald-500/25 transition hover:bg-emerald-600 disabled:bg-emerald-100 disabled:text-emerald-600 disabled:shadow-none"
                  >
                    {advancingId === g._id ? "Updating..." : next ? "Complete Delivery" : "Awaiting Review"}
                  </button>
                </div>
              </div>
            );
          })}
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
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-7 py-8 text-center text-slate-400">
                    No completed gigs yet.
                  </td>
                </tr>
              ) : (
                transactions.map((t) => (
                  <tr key={t._id} className="border-t border-slate-100">
                    <td className="px-7 py-5">
                      <p className="font-bold text-slate-900">{titleFor(t.errandId)}</p>
                      <p className="text-sm text-slate-400">#{t._id.slice(-6).toUpperCase()}</p>
                    </td>
                    <td className="px-7 py-5 text-slate-500">
                      {new Date(t.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-7 py-5 font-bold text-slate-900">₱{t.amount.toFixed(2)}</td>
                    <td className="px-7 py-5">
                      <span className="flex items-center gap-2 font-semibold text-emerald-600">
                        <CheckCircle2 className="h-4 w-4" /> Paid
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}