import { useEffect, useMemo, useState } from "react";
import {
  Search,
  MapPin,
  Clock,
  Star,
  Coffee,
  Printer,
  Package,
  Users,
  BookOpen,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { api } from "../../lib/api.ts";
import { formatDeadline } from "../../lib/format.ts";

const filters = [
  { key: "All Errands", icon: null },
  { key: "Food Run", icon: Coffee },
  { key: "Printing", icon: Printer },
  { key: "Deliveries", icon: Package },
  { key: "Queuing", icon: Users },
  { key: "Others", icon: BookOpen },
];

interface ApiErrand {
  _id: string;
  title: string;
  instructions: string;
  category: string;
  pickup: string;
  dropoff: string;
  reward: number;
  deadline: string;
  contactPhone: string;
  status: string;
  ownerId?: {
    _id: string;
    fullName: string;
    role: string;
  };
  createdAt: string;
}


export default function BrowseErrands({
  token,
  goToGigs,
}: {
  token: string;
  goToGigs: () => void;
}) {
  const [errands, setErrands] = useState<ApiErrand[]>([]);
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [banner, setBanner] = useState("");
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("All Errands");
  const [details, setDetails] = useState<string | null>(null);

  // 1. Fetch real errands from Express API
  const fetchErrands = async () => {
    setLoading(true);
    setBanner("");

    const apiWithErrands = api as typeof api & {
      getErrands?: (authToken: string) => Promise<{
        ok: boolean;
        status?: number;
        error?: string;
        data?: ApiErrand[];
        errands?: ApiErrand[];
      }>;
    };

    const getErrandsFn = apiWithErrands.getErrands;
    if (!getErrandsFn) {
      setLoading(false);
      setBanner("Errand feed is unavailable right now.");
      return;
    }

    const res = await getErrandsFn(token);
    setLoading(false);

    if (!res.ok) {
      setBanner(`${res.status ?? 500} — ${res.error || "Failed to load open errands."}`);
      return;
    }
    setErrands(res.data || res.errands || []);
  };

  useEffect(() => {
    fetchErrands();
  }, [token]);

  // 2. Handle accepting a gig via API
  const handleAccept = async (id: string) => {
    setAcceptingId(id);
    setBanner("");

    const apiWithAccept = api as typeof api & {
      acceptErrand?: (authToken: string, errandId: string) => Promise<{
        ok: boolean;
        status?: number;
        error?: string;
        data?: unknown;
      }>;
    };

    const acceptFn = apiWithAccept.acceptErrand;
    if (!acceptFn) {
      setAcceptingId(null);
      setBanner("Accept action is unavailable right now.");
      return;
    }

    const res = await acceptFn(token, id);
    setAcceptingId(null);

    if (!res.ok) {
      setBanner(`${res.status ?? 500} — ${res.error || "Could not accept gig."}`);
      return;
    }

    goToGigs();
  };

  // 3. Filter open errands
  const list = useMemo(
    () =>
      errands.filter((e) => {
        const matchesCategory = cat === "All Errands" || e.category === cat;
        const posterName = e.ownerId?.fullName || "Student";
        const matchesQuery = (e.title + e.dropoff + e.pickup + posterName)
          .toLowerCase()
          .includes(query.toLowerCase());
        return matchesCategory && matchesQuery;
      }),
    [errands, cat, query],
  );

  return (
    <div className="mx-auto max-w-6xl space-y-7">
      {banner && (
        <div className="flex items-center gap-3 rounded-2xl bg-rose-50 p-4 font-medium text-rose-600">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p>{banner}</p>
        </div>
      )}

      {/* Search & Actions */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by item, location, or building..."
            className="w-full rounded-2xl bg-white py-5 pl-14 pr-6 text-lg text-slate-800 shadow-sm outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <button
          onClick={fetchErrands}
          className="flex items-center justify-center gap-3 rounded-2xl bg-white px-7 py-5 text-lg font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <RefreshCw className={`h-5 w-5 text-slate-400 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap gap-3">
        {filters.map((f) => {
          const Icon = f.icon;
          const active = cat === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setCat(f.key)}
              className={`flex items-center gap-2 rounded-full px-6 py-3 font-semibold transition ${
                active
                  ? "bg-[#0B1524] text-white"
                  : "bg-white text-slate-600 shadow-sm hover:bg-slate-50"
              }`}
            >
              {Icon && <Icon className="h-4 w-4" />} {f.key}
            </button>
          );
        })}
      </div>

      {/* Errand Cards */}
      {loading ? (
        <div className="py-12 text-center text-lg font-medium text-slate-500">
          Fetching live errands from campus...
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-3xl bg-white p-12 text-center text-slate-500 shadow-sm">
          No open errands available matching your criteria.
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {list.map((e) => {
            const posterName = e.ownerId?.fullName || "Student Requester";
            const initials = posterName
              .split(" ")
              .map((n) => n[0])
              .join("")
              .substring(0, 2)
              .toUpperCase();

            return (
              <div key={e._id} className="flex flex-col justify-between rounded-3xl bg-white p-7 shadow-sm">
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-lg font-bold text-emerald-800">
                        {initials}
                      </div>
                      <div>
                        <p className="text-lg font-bold text-slate-900">{posterName}</p>
                        <p className="flex items-center gap-1 text-sm text-slate-500">
                          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                          5.0 <span className="text-slate-300">•</span> {e.category}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] font-bold tracking-[0.15em] text-slate-400">REWARD</p>
                      <p className="text-3xl font-extrabold text-emerald-600">₱{e.reward}</p>
                    </div>
                  </div>

                  <h3 className="mt-6 text-2xl font-bold leading-snug text-slate-900">{e.title}</h3>

                  <div className="mt-5 space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50">
                        <MapPin className="h-5 w-5 text-emerald-500" />
                      </span>
                      <p className="text-slate-500">
                        Drop-off: <span className="font-bold text-slate-900">{e.dropoff}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50">
                        <Clock className="h-5 w-5 text-sky-500" />
                      </span>
                      <p className="text-slate-500">
                        Deadline: <span className="font-bold text-slate-900">{formatDeadline(e.deadline)}</span>
                      </p>
                    </div>
                  </div>

                  {details === e._id && (
                    <div className="mt-5 space-y-2 rounded-2xl bg-slate-50 p-5 text-sm text-slate-600">
                      <p>
                        <span className="font-bold text-slate-800">Pick-up Location:</span> {e.pickup}
                      </p>
                      <p>
                        <span className="font-bold text-slate-800">Instructions:</span> {e.instructions}
                      </p>
                      <p>
                        <span className="font-bold text-slate-800">Contact Number:</span> {e.contactPhone}
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setDetails((d) => (d === e._id ? null : e._id))}
                    className="rounded-2xl bg-[#0B1524] py-4 text-lg font-bold text-white transition hover:bg-slate-800"
                  >
                    {details === e._id ? "Hide Details" : "View Details"}
                  </button>
                  <button
                    disabled={acceptingId === e._id}
                    onClick={() => handleAccept(e._id)}
                    className="rounded-2xl bg-emerald-500 py-4 text-lg font-bold text-white shadow-md shadow-emerald-500/25 transition hover:bg-emerald-600 disabled:opacity-50"
                  >
                    {acceptingId === e._id ? "Accepting..." : "Accept Gig"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>  
      )}
    </div>
  );
}