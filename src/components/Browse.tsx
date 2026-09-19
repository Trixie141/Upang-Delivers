import { useEffect, useState } from "react";
import { MapPin, Clock, Search, AlertCircle, RefreshCw } from "lucide-react";
import { api } from "../lib/api";

interface Errand {
  _id: string;
  title: string;
  instructions: string;
  category: string;
  pickup: string;
  dropoff: string;
  reward: number;
  deadline: string;
  status: string;
}

export default function Browse({ token, userRole }: { token: string; userRole: string }) {
  const [errands, setErrands] = useState<Errand[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [banner, setBanner] = useState("");

  const fetchErrands = async () => {
    setLoading(true);
    setBanner("");
    const res = await api.getErrands(token);
    setLoading(false);

    if (!res.ok) {
      setBanner(`${res.status} — ${res.error || "Failed to fetch errands."}`);
      return;
    }

    setErrands(res.errands || []);
  };

  useEffect(() => {
    fetchErrands();
  }, [token]);

  const handleAccept = async (id: string) => {
    setAcceptingId(id);
    setBanner("");

    const res = await api.acceptErrand(token, id);
    setAcceptingId(null);

    if (!res.ok) {
      setBanner(`${res.status} — ${res.error || "Failed to accept errand."}`);
      return;
    }

    // Refresh list to update status
    fetchErrands();
  };

  const filteredErrands = errands.filter(
    (e) =>
      e.status === "open" &&
      (e.title.toLowerCase().includes(search.toLowerCase()) ||
        e.category.toLowerCase().includes(search.toLowerCase()) ||
        e.pickup.toLowerCase().includes(search.toLowerCase()) ||
        e.dropoff.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 rounded-3xl bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900">Available Campus Errands</h2>
          <p className="text-sm text-slate-500">Pick up open errands around campus and earn rewards.</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search errands..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 py-2.5 pl-9 pr-4 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <button
            onClick={fetchErrands}
            className="flex items-center gap-2 rounded-2xl border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {banner && (
        <div className="flex items-center gap-3 rounded-2xl bg-rose-50 p-4 font-medium text-rose-600">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p>{banner}</p>
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-slate-500">Loading open errands...</div>
      ) : filteredErrands.length === 0 ? (
        <div className="rounded-3xl bg-white p-12 text-center text-slate-400 shadow-sm">
          No open errands found at the moment.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filteredErrands.map((errand) => (
            <div key={errand._id} className="flex flex-col justify-between rounded-3xl bg-white p-6 shadow-sm">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="rounded-xl bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                    {errand.category}
                  </span>
                  <p className="text-2xl font-extrabold text-emerald-600">₱{errand.reward}</p>
                </div>

                <h3 className="text-lg font-bold text-slate-900">{errand.title}</h3>
                <p className="text-sm text-slate-500">{errand.instructions}</p>

                <div className="space-y-1.5 pt-2 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-emerald-500" />
                    <span><strong>From:</strong> {errand.pickup}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-rose-500" />
                    <span><strong>To:</strong> {errand.dropoff}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-sky-500" />
                    <span><strong>Deadline:</strong> {errand.deadline}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100">
                {userRole === "delivery" ? (
                  <button
                    disabled={acceptingId === errand._id}
                    onClick={() => handleAccept(errand._id)}
                    className="w-full rounded-2xl bg-emerald-500 py-3 font-bold text-white transition hover:bg-emerald-600 disabled:opacity-50"
                  >
                    {acceptingId === errand._id ? "Accepting..." : "Accept Gig"}
                  </button>
                ) : (
                  <p className="text-center text-xs text-slate-400 font-medium">
                    Switch to Delivery role to accept gigs
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}