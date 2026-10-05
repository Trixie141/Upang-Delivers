import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Clock, MapPin, AlertCircle, RefreshCw, ChevronRight, Navigation, Phone, ImagePlus } from "lucide-react";
import { api } from "../lib/api";
import { formatDeadline, formatPaymentMethod } from "../lib/format";

interface GigItem {
  _id: string;
  title: string;
  instructions: string;
  category: string;
  pickup: string;
  dropoff: string;
  reward: number;
  deadline: string;
  paymentMethod?: string;
  cod?: boolean;
  contactPhone?: string;
  status: "in_progress" | "picked_up" | "review" | "done" | "cancelled";
  ownerId?: { _id: string; fullName: string; phone?: string } | string;
  runnerId?: { _id: string; fullName: string } | string;
}

interface GigReview {
  rating: number;
  comment: string;
}

const LOCATION_ACTIVE_STATUSES = ["in_progress", "picked_up"];
const LOCATION_SEND_INTERVAL_MS = 10_000;
const MAX_RECEIPT_BYTES = 350_000;

async function compressReceiptImage(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  try {
    for (const maxDimension of [1280, 960, 720]) {
      const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Could not prepare the receipt photo.");
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

      for (const quality of [0.78, 0.62, 0.5]) {
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
        if (!blob || blob.size > MAX_RECEIPT_BYTES) continue;
        return await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error("Could not read the receipt photo."));
          reader.readAsDataURL(blob);
        });
      }
    }
  } finally {
    bitmap.close();
  }
  throw new Error("Receipt photo is too large. Choose a clearer, closer photo.");
}

export default function MyGigs({ token, userId }: { token: string; userId: string }) {
  const [gigs, setGigs] = useState<GigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [banner, setBanner] = useState("");
  const [reviews, setReviews] = useState<Record<string, GigReview | null>>({});
  const [sharingLocation, setSharingLocation] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [pickupBillAmounts, setPickupBillAmounts] = useState<Record<string, string>>({});
  const [pickupReceiptImages, setPickupReceiptImages] = useState<Record<string, string>>({});

  const fetchMyGigs = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setBanner("");
    const res = await (api as any).getMyErrands?.(token) ?? (api as any).getErrands?.(token);
    if (showLoading) setLoading(false);

    if (!res.ok) {
      setBanner(`${res.status} — ${res.error || "Failed to load your active gigs."}`);
      return;
    }

    // runnerId may come back populated as an object ({_id, fullName, role})
    // rather than a plain string id, so unwrap it before comparing.
    const runnerGigs = (res.errands || []).filter((e: GigItem) => {
      const runnerId = typeof e.runnerId === "object" && e.runnerId ? e.runnerId._id : e.runnerId;
      return String(runnerId) === userId && e.status !== "cancelled";
    });
    setGigs(runnerGigs);
  };

  useEffect(() => {
    fetchMyGigs();
  }, [token, userId]);

  // For every completed gig, check whether the requester has left a review yet.
  useEffect(() => {
    const apiClient = api as any;
    const doneIds = gigs.filter((g) => g.status === "done" && !(g._id in reviews)).map((g) => g._id);

    doneIds.forEach(async (id) => {
      const res = await apiClient.getReview?.(token, id);
      setReviews((prev) => ({ ...prev, [id]: res?.ok ? res.review : null }));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gigs, token]);

  // Share the runner's position with every active requester, not only the
  // first gig returned by the API.
  const activeGigIds = gigs
    .filter((g) => LOCATION_ACTIVE_STATUSES.includes(g.status))
    .map((g) => g._id);
  const activeGigKey = activeGigIds.join(",");
  const lastSentAt = useRef(0);
  const watchIdRef = useRef<number | null>(null);

  // Refresh active gigs so an automatic server-side deadline cancellation is
  // reflected in the runner's page without requiring a manual refresh.
  useEffect(() => {
    if (!activeGigKey) return;
    const refreshId = setInterval(() => fetchMyGigs(false), 10_000);
    return () => clearInterval(refreshId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGigKey, token, userId]);

  useEffect(() => {
    if (!activeGigKey) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setSharingLocation(false);
      return;
    }

    if (!("geolocation" in navigator)) {
      setLocationError("This browser doesn't support location sharing.");
      return;
    }

    setLocationError("");
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const latitude = Number(pos.coords.latitude);
        const longitude = Number(pos.coords.longitude);
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          setSharingLocation(false);
          setLocationError("The browser returned invalid GPS coordinates. Check location access and try again.");
          return;
        }
        const now = Date.now();
        if (now - lastSentAt.current < LOCATION_SEND_INTERVAL_MS) return;
        lastSentAt.current = now;

        const updateLocation = (api as any).updateMyLocation;
        if (typeof updateLocation !== "function") {
          setSharingLocation(false);
          setLocationError("Location sharing is unavailable. Please refresh the page.");
          return;
        }

        setLocationError("");
        Promise.all(activeGigKey.split(",").map((id) =>
          updateLocation(token, id, latitude, longitude),
        )).then((results) => {
          const failure = results.find((result) => !result?.ok);
          setSharingLocation(!failure);
          if (failure) {
            const fieldDetails = failure.fields
              ? Object.values(failure.fields).join(" ")
              : "";
            setLocationError(
              [failure.error, fieldDetails].filter(Boolean).join(" — ") ||
                "The server couldn't save your location. Please refresh and try again.",
            );
          } else {
            setLocationError("");
          }
        }).catch(() => {
          setSharingLocation(false);
          setLocationError("The server couldn't save your location. Please check your connection.");
        });
      },
      (err) => {
        setSharingLocation(false);
        setLocationError(
          err.code === err.PERMISSION_DENIED
            ? "Location permission denied — the requester won't see live tracking."
            : "Couldn't get your location.",
        );
      },
      { enableHighAccuracy: true, maximumAge: 5000 },
    );

    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, [activeGigKey, token]);

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

  const handleReceiptSelection = async (id: string, file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setBanner("Choose an image file for the bill or receipt.");
      return;
    }
    setBanner("");
    try {
      const image = await compressReceiptImage(file);
      setPickupReceiptImages((prev) => ({ ...prev, [id]: image }));
    } catch (error) {
      setBanner(error instanceof Error ? error.message : "Could not prepare the receipt photo.");
    }
  };

  const confirmPickup = async (id: string) => {
    const amountText = pickupBillAmounts[id];
    const billAmount = Number(amountText);
    const receiptImage = pickupReceiptImages[id];
    if (!amountText?.trim() || !Number.isFinite(billAmount) || billAmount <= 0 || billAmount > 100000) {
      setBanner("Enter a bill amount greater than ₱0.");
      return;
    }
    if (!receiptImage) {
      setBanner("Add a photo of the bill or receipt before confirming pickup.");
      return;
    }

    setUpdatingId(id);
    setBanner("");
    const res = await (api as any).submitPickupEvidence(token, id, billAmount, receiptImage);
    setUpdatingId(null);
    if (!res.ok) {
      setBanner(`${res.status} — ${res.error || "Could not confirm pickup."}`);
      return;
    }
    setGigs((prev) => prev.map((gig) => (gig._id === id ? { ...gig, status: "picked_up" } : gig)));
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

      {activeGigIds.length > 0 && (
        <div
          className={`flex items-center gap-3 rounded-2xl p-4 text-sm font-medium ${
            locationError ? "bg-amber-50 text-amber-700" : "bg-sky-50 text-sky-700"
          }`}
        >
          <Navigation className={`h-5 w-5 shrink-0 ${sharingLocation ? "animate-pulse" : ""}`} />
          <p>
            {locationError || (sharingLocation
              ? "Sharing your live location with the requester."
              : "Waiting for GPS to start sharing your location...")}
          </p>
        </div>
      )}

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
            const requesterName =
              typeof gig.ownerId === "object" && gig.ownerId ? gig.ownerId.fullName : "Student";
            const requesterPhone =
              (typeof gig.ownerId === "object" && gig.ownerId ? gig.ownerId.phone : "") || "";
            const contactPhone = gig.contactPhone || requesterPhone;

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
                    <span><strong>Deadline:</strong> {formatDeadline(gig.deadline)}</span>
                  </div>
                  <div className="flex items-center gap-2 sm:col-span-2">
                    <span className="text-slate-400">₱</span>
                    <span><strong>Client payment method:</strong> {formatPaymentMethod(gig.paymentMethod, gig.cod)}</span>
                  </div>
                  <div className="flex items-center gap-2 sm:col-span-2">
                    <Phone className="h-4 w-4 text-emerald-600" />
                    {contactPhone ? (
                      <span>
                        <strong>Client contact:</strong>{" "}
                        <a className="font-semibold text-sky-700 hover:underline" href={`tel:${contactPhone}`}>
                          {contactPhone}
                        </a>
                      </span>
                    ) : (
                      <span><strong>Client contact:</strong> Not provided</span>
                    )}
                  </div>
                </div>

                {/* Status Action Controls */}
                <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-6">
                  <span className="text-xs font-semibold text-slate-400">
                    Requester: {requesterName}
                  </span>

                  <div className="flex gap-3">
                    {gig.status === "in_progress" && (
                      <div className="w-full space-y-3 rounded-2xl bg-slate-50 p-4 sm:max-w-xl">
                        <div>
                          <p className="font-bold text-slate-800">Pickup bill and evidence</p>
                          <p className="text-xs text-slate-500">Enter the bill amount and attach a clear receipt photo before confirming pickup.</p>
                        </div>
                        <label className="block text-sm font-semibold text-slate-600">
                          Bill amount (₱)
                          <input
                            type="text"
                            inputMode="decimal"
                            value={pickupBillAmounts[gig._id] ?? ""}
                            onChange={(event) => {
                              const value = event.target.value;
                              if (/^\d{0,6}(?:\.\d{0,2})?$/.test(value)) {
                                setPickupBillAmounts((prev) => ({ ...prev, [gig._id]: value }));
                              }
                            }}
                            placeholder="0.00"
                            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900"
                          />
                        </label>
                        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50">
                          <ImagePlus className="h-4 w-4" />
                          {pickupReceiptImages[gig._id] ? "Change bill or receipt photo" : "Add bill or receipt photo"}
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="sr-only"
                            onChange={(event) => handleReceiptSelection(gig._id, event.target.files?.[0])}
                          />
                        </label>
                        {pickupReceiptImages[gig._id] && (
                          <img src={pickupReceiptImages[gig._id]} alt="Bill or receipt preview" className="max-h-48 rounded-xl border border-slate-200 object-contain" />
                        )}
                        <button
                          disabled={updatingId === gig._id || !pickupBillAmounts[gig._id]?.trim() || !pickupReceiptImages[gig._id]}
                          onClick={() => confirmPickup(gig._id)}
                          className="flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 font-bold text-white shadow-md transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {updatingId === gig._id ? "Saving evidence..." : "Confirm Pickup"}
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
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

                {gig.status === "done" && (
                  <div className="mt-4 border-t border-slate-100 pt-4 text-sm">
                    {reviews[gig._id] === undefined ? (
                      <p className="text-slate-400">Checking for a review...</p>
                    ) : reviews[gig._id] ? (
                      <p className="text-slate-600">
                        <span className="font-bold text-amber-500">
                          {"★".repeat(reviews[gig._id]!.rating)}
                          {"☆".repeat(5 - reviews[gig._id]!.rating)}
                        </span>{" "}
                        <span className="font-bold text-slate-900">
                          {reviews[gig._id]!.rating}/5
                        </span>
                        {reviews[gig._id]!.comment ? ` — "${reviews[gig._id]!.comment}"` : ""}
                      </p>
                    ) : (
                      <p className="italic text-slate-400">
                        {requesterName} hasn't left a review yet.
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
