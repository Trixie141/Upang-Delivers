import { useEffect, useState } from "react";
import { CheckCircle2, Clock, MapPin, AlertCircle, RefreshCw, ChevronRight } from "lucide-react";
import { api } from "../lib/api";

interface GigItem {
  _id: string;
  title: string;
  instructions: string;
  category: string;
  pickup: string;
  dropoff: string;
  reward: number;
  deadline: string;
  status: "in_progress" | "picked_up" | "review" | "done" | "cancelled";
  ownerId?: { _id: string; fullName: string };
  runnerId?: string;
}

export default function MyGigs({ token, userId }: { token: string; userId: string }) {
  const [gigs, setGigs] = useState<GigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [banner, setBanner] = useState("");

  const fetchMyGigs = async () => {
    setLoading(true);
    setBanner("");
    const res = await (api as any).getMyErrands?.(token) ?? (api as any).getErrands?.(token);
    setLoading(false);

    if (!res.ok) {
      setBanner(`${res.status} — ${res.error || "Failed to load your active gigs."}`);
      return;
    }

    // Filter to show only gigs assigned to current runner that are not cancelled/done
    const runnerGigs = (res.errands || []).filter(
      (e: GigItem) => String(e.runnerId) === userId && e.status !== "cancelled",
    );
    setGigs(runnerGigs);
  };

  useEffect(() => {
    fetchMyGigs();
  }, [token, userId]);

  const updateStatus = async (id: string, nextStatus: GigItem["status"]) => {
    setUpdatingId(id);
    setBanner("");

    const apiClient = api as any;
    const updateFn = apiClient.updateErrandStatus ?? apiClient.updateMyErrandStatus;

    if (!updateFn) {
      setUpdatingId(null);
      setBanner("503 — Status update is unavailable.");
      return;
    }

    const res = await updateFn(token, id, nextStatus);
    setUpdatingId(null);

    if (!res.ok) {
      setBanner(`${res.status} — ${res.error || "Failed to update status."}`);
      return;
    }

    setGigs((prev) =>
      prev.map((g) => (g._id === id ? { ...g, status: nextStatus } : g)),
    );
  };

  const statusBadges = {
    in_progress: { label: "In Progress", color: "bg-amber-50 text-amber-700 border-amber-200" },
    picked_up: { label: "Picked Up", color: "bg-blue-50 text-blue-700 border-blue-200" },
    review: { label: "Under Review", color: "bg-purple-50 text-purple-700 border-purple-200" },
    done: { label: "Completed", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    cancelled: { label: "Cancelled", color: "bg-slate-50 text-slate-500 border-slate-200" },
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between rounded-3xl bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900">Active Runner Gigs</h2>
          <p className="text-sm text-slate-500">Track and update delivery progress for your accepted tasks.</p>
        </div>
        <button
          onClick={fetchMyGigs}
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
        <div className="py-12 text-center text-slate-500">Loading your gigs...</div>
      ) : gigs.length === 0 ? (
        <div className="rounded-3xl bg-white p-12 text-center text-slate-400 shadow-sm">
          You have no active gigs assigned. Accept one from the Browse section!
        </div>
      ) : (
        <div className="space-y-4">
          {gigs.map((gig) => {
            const badge = statusBadges[gig.status] || statusBadges.in_progress;

            return (
              <div key={gig._id} className="rounded-3xl bg-white p-6 shadow-sm sm:p-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <span className={`inline-block rounded-lg border px-3 py-1 text-xs font-bold ${badge.color}`}>
                      {badge.label}
                    </span>
                    <h3 className="mt-2 text-xl font-bold text-slate-900">{gig.title}</h3>
                    <p className="text-sm text-slate-500">{gig.instructions}</p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-xs font-bold tracking-wider text-slate-400">EARNING</p>
                    <p className="text-3xl font-extrabold text-emerald-600">₱{gig.reward}</p>
                  </div>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2 text-sm text-slate-600">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-emerald-500" />
                    <span><strong>Pickup:</strong> {gig.pickup}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-rose-500" />
                    <span><strong>Drop-off:</strong> {gig.dropoff}</span>
                  </div>
                  <div className="flex items-center gap-2 sm:col-span-2">
                    <Clock className="h-4 w-4 text-sky-500" />
                    <span><strong>Deadline:</strong> {gig.deadline}</span>
                  </div>
                </div>

                {/* Status Action Controls */}
                <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-6">
                  <span className="text-xs font-semibold text-slate-400">
                    Requester: {gig.ownerId?.fullName || "Student"}
                  </span>

                  <div className="flex gap-3">
                    {gig.status === "in_progress" && (
                      <button
                        disabled={updatingId === gig._id}
                        onClick={() => updateStatus(gig._id, "picked_up")}
                        className="flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 font-bold text-white shadow-md transition hover:bg-blue-700 disabled:opacity-50"
                      >
                        Mark as Picked Up <ChevronRight className="h-4 w-4" />
                      </button>
                    )}

                    {gig.status === "picked_up" && (
                      <button
                        disabled={updatingId === gig._id}
                        onClick={() => updateStatus(gig._id, "done")}
                        className="flex items-center gap-2 rounded-2xl bg-emerald-500 px-6 py-3 font-bold text-white shadow-md transition hover:bg-emerald-600 disabled:opacity-50"
                      >
                        <CheckCircle2 className="h-4 w-4" /> Complete Delivery
                      </button>
                    )}

                    {gig.status === "done" && (
                      <span className="flex items-center gap-2 font-bold text-emerald-600">
                        <CheckCircle2 className="h-5 w-5" /> Completed
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}