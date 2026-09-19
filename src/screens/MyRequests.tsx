import { useEffect, useState } from "react";
import { Trash2, Clock, MapPin, AlertCircle, RefreshCw, UserCheck } from "lucide-react";
import { api } from "../lib/api";

interface ErrandRequest {
  _id: string;
  title: string;
  instructions: string;
  category: string;
  pickup: string;
  dropoff: string;
  reward: number;
  deadline: string;
  status: "open" | "in_progress" | "picked_up" | "review" | "done" | "cancelled";
  ownerId?: string | { _id: string; fullName: string };
  runnerId?: { _id: string; fullName: string } | string | null;
}

export default function MyRequests({ token, userId }: { token: string; userId: string }) {
  const [requests, setRequests] = useState<ErrandRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [banner, setBanner] = useState("");

  const fetchMyRequests = async () => {
    setLoading(true);
    setBanner("");
    const apiClient = api as any;
    const res = await apiClient.getErrands(token);
    setLoading(false);

    if (!res.ok) {
      setBanner(`${res.status} — ${res.error || "Failed to load your posted requests."}`);
      return;
    }

    // Filter to show only errands created by the logged-in user
    const ownerRequests = (res.errands || []).filter((e: ErrandRequest) => {
      const owner = typeof e.ownerId === "object" ? e.ownerId?._id : e.ownerId;
      return String(owner) === userId;
    });

    setRequests(ownerRequests);
  };

  useEffect(() => {
    fetchMyRequests();
  }, [token, userId]);

  const handleCancel = async (id: string) => {
    if (!confirm("Are you sure you want to cancel and remove this errand request?")) return;

    setDeletingId(id);
    setBanner("");

    const deleteErrand = (api as any).deleteErrand;
    if (typeof deleteErrand !== "function") {
      setDeletingId(null);
      setBanner("Failed to cancel the request: deleteErrand is unavailable.");
      return;
    }

    const res = await deleteErrand(token, id);
    setDeletingId(null);

    if (!res.ok) {
      setBanner(`${res.status} — ${res.error || "Failed to cancel the request."}`);
      return;
    }

    // Remove deleted errand from state UI
    setRequests((prev) => prev.filter((r) => r._id !== id));
  };

  const statusBadges = {
    open: { label: "Open & Searching", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    in_progress: { label: "Runner Assigned", color: "bg-amber-50 text-amber-700 border-amber-200" },
    picked_up: { label: "In Transit", color: "bg-blue-50 text-blue-700 border-blue-200" },
    review: { label: "Awaiting Review", color: "bg-purple-50 text-purple-700 border-purple-200" },
    done: { label: "Completed", color: "bg-slate-50 text-slate-700 border-slate-200" },
    cancelled: { label: "Cancelled", color: "bg-rose-50 text-rose-700 border-rose-200" },
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between rounded-3xl bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900">My Posted Errand Requests</h2>
          <p className="text-sm text-slate-500">Monitor live updates and manage your created tasks.</p>
        </div>
        <button
          onClick={fetchMyRequests}
          className="flex items-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 font-bold text-slate-600 hover:bg-slate-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {banner && (
        <div className="flex items-center gap-3 rounded-2xl bg-rose-50 p-4 font-medium text-rose-600">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p>{banner}</p>
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-slate-500">Loading your requests...</div>
      ) : requests.length === 0 ? (
        <div className="rounded-3xl bg-white p-12 text-center text-slate-400 shadow-sm">
          You haven't created any errand requests yet.
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => {
            const badge = statusBadges[req.status] || statusBadges.open;
            const runnerName =
              typeof req.runnerId === "object" && req.runnerId
                ? req.runnerId.fullName
                : null;

            return (
              <div key={req._id} className="rounded-3xl bg-white p-6 shadow-sm sm:p-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <span className={`inline-block rounded-lg border px-3 py-1 text-xs font-bold ${badge.color}`}>
                      {badge.label}
                    </span>
                    <h3 className="mt-2 text-xl font-bold text-slate-900">{req.title}</h3>
                    <p className="text-sm text-slate-500">{req.instructions}</p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-xs font-bold tracking-wider text-slate-400">BOUNTY REWARD</p>
                    <p className="text-3xl font-extrabold text-slate-900">₱{req.reward}</p>
                  </div>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2 text-sm text-slate-600">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-emerald-500" />
                    <span><strong>Pickup:</strong> {req.pickup}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-rose-500" />
                    <span><strong>Drop-off:</strong> {req.dropoff}</span>
                  </div>
                  <div className="flex items-center gap-2 sm:col-span-2">
                    <Clock className="h-4 w-4 text-sky-500" />
                    <span><strong>Deadline:</strong> {req.deadline}</span>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-6">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <UserCheck className="h-4 w-4 text-slate-400" />
                    {runnerName ? (
                      <span>Runner: <strong className="text-slate-900">{runnerName}</strong></span>
                    ) : (
                      <span className="italic text-slate-400">Waiting for a runner to accept...</span>
                    )}
                  </div>

                  {req.status === "open" && (
                    <button
                      disabled={deletingId === req._id}
                      onClick={() => handleCancel(req._id)}
                      className="flex items-center gap-2 rounded-2xl bg-rose-50 px-5 py-2.5 font-bold text-rose-600 transition hover:bg-rose-100 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" /> Cancel Request
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}