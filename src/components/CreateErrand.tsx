import { useEffect, useState } from "react";
import { PlusCircle, AlertCircle } from "lucide-react";
import { api } from "../lib/api";
import { CAMPUS_BUILDINGS, getBuilding } from "../lib/campusRooms";

const toLocalDateValue = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const TIME_SLOTS = Array.from({ length: 22 }, (_, i) => {
  const totalMinutes = 7 * 60 + 30 + i * 30;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const value = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  const label = `${hours % 12 || 12}:${String(minutes).padStart(2, "0")} ${hours < 12 ? "AM" : "PM"}`;
  return { value, label };
});

const nextAvailableDate = () => {
  const now = new Date();
  const lastSlot = TIME_SLOTS[TIME_SLOTS.length - 1].value;
  const lastSlotTime = new Date(`${toLocalDateValue(now)}T${lastSlot}`);
  if (now >= lastSlotTime) now.setDate(now.getDate() + 1);
  return toLocalDateValue(now);
};

const isCampusServiceOpen = (now = new Date()) => {
  const minutes = now.getHours() * 60 + now.getMinutes();
  return minutes >= 7 * 60 + 30 && minutes <= 18 * 60;
};

// Must match the enum in backend validate.js and the Errand model
const CATEGORIES = ["Food Run", "Printing", "Queuing", "Deliveries", "Others"];

export default function CreateErrand({
  token,
  onSuccess,
}: {
  token: string;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    title: "",
    instructions: "",
    category: "Food Run",
    pickup: "",
    dropoff: "",
    reward: "",
    paymentMethod: "cash_on_delivery",
    deadline: "", // stays "" until the user picks a date/time
    contactPhone: "",
  });

  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [dropoffBuilding, setDropoffBuilding] = useState("");
  const [dropoffRoom, setDropoffRoom] = useState("");
  const [preferredDate, setPreferredDate] = useState(nextAvailableDate);
  const [preferredTime, setPreferredTime] = useState("");
  const [serviceOpen, setServiceOpen] = useState(isCampusServiceOpen);

  useEffect(() => {
    const updateServiceHours = () => setServiceOpen(isCampusServiceOpen());
    const timer = window.setInterval(updateServiceHours, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const value = e.target.name === "reward" ? e.target.value.replace(/\D/g, "") : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBanner("");
    setFields({});

    if (!isCampusServiceOpen()) {
      setServiceOpen(false);
      setBanner("Errand posting is closed. You can post between 7:30 AM and 6:00 PM.");
      return;
    }

    const selectedDateTime = preferredDate && preferredTime
      ? new Date(`${preferredDate}T${preferredTime}`)
      : new Date(NaN);
    const dateTimeLocal = `${preferredDate}T${preferredTime}`;
    setFormData((current) => ({ ...current, deadline: dateTimeLocal }));

    // Deadline must be a real date/time in the future before we convert it
    if (!preferredDate || !preferredTime || isNaN(selectedDateTime.getTime())) {
      setFields({ deadline: "Choose a valid date and preferred time." });
      return;
    }
    if (selectedDateTime.getTime() <= Date.now()) {
      setFields({ deadline: "Choose a future date and time." });
      return;
    }
    const slot = TIME_SLOTS.some((item) => item.value === preferredTime);
    if (!slot) {
      setFields({ deadline: "Preferred time must be between 7:30 AM and 6:00 PM." });
      return;
    }
    if (!/^\d{11}$/.test(formData.contactPhone)) {
      setFields({ contactPhone: "Enter an 11-digit phone number, numbers only." });
      return;
    }

    const payload = {
      ...formData,
      dropoff: [dropoffBuilding, dropoffRoom].filter(Boolean).join(" - "),
      reward: Number(formData.reward),
      deadline: selectedDateTime.toISOString(),
    };

    // Same rules the backend enforces, checked before sending
    const clientErrors = api.validateErrand(payload);
    if (Object.keys(clientErrors).length) {
      setFields(clientErrors);
      setBanner("Please fix the highlighted fields.");
      return;
    }

    setLoading(true);
    const res = await api.createErrand(token, payload);
    setLoading(false);

    if (!res.ok) {
      setFields(res.fields ?? {}); // shows which field the server rejected
      setBanner(res.error || "Failed to post errand request.");
      return;
    }

    onSuccess();
  };

  const label = "block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1";
  const box = (k: string) =>
    `w-full rounded-2xl border px-4 py-3 text-sm focus:outline-none ${
      fields[k]
        ? "border-rose-400 bg-rose-50 focus:border-rose-500"
        : "border-slate-200 focus:border-emerald-500"
    }`;
  const err = (k: string) =>
    fields[k] ? <p className="mt-1 text-xs font-medium text-rose-600">{fields[k]}</p> : null;

  return (
    <div className="mx-auto max-w-2xl rounded-3xl bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-extrabold text-slate-900">Post a New Errand Request</h2>
        <p className="text-sm text-slate-500">Provide task details so campus runners can assist you.</p>
      </div>

      {banner && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl bg-rose-50 p-4 font-medium text-rose-600">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p>{banner}</p>
        </div>
      )}

      {!serviceOpen && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-800" role="status">
          Errand posting is currently closed. You can post errands between 7:30 AM and 6:00 PM.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={label}>Errand Title</label>
          <input
            type="text"
            name="title"
            required
            minLength={6}
            maxLength={90}
            pattern="[\p{L} ]{6,90}"
            title="Use 6 to 90 letters and spaces only."
            placeholder="e.g., Pick up printed handouts at Main Library"
            value={formData.title}
            onChange={handleChange}
            className={box("title")}
          />
          {err("title")}
          <p className="mt-1 text-xs text-slate-400">Use 6–90 letters and spaces only.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label}>Category</label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className={`${box("category")} bg-white`}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            {err("category")}
          </div>

          <div>
            <label className={label}>Bounty Reward (₱)</label>
            <input
              type="number"
              name="reward"
              required
              min="20"
              max="1000"
              step="1"
              placeholder="50"
              value={formData.reward}
              onChange={handleChange}
              className={box("reward")}
            />
            {err("reward")}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label}>Pickup Location</label>
            <input
              type="text"
              name="pickup"
              required
              minLength={3}
              maxLength={80}
              pattern="[^<>]{3,80}"
              title="Enter 3 to 80 characters without < or >."
              placeholder="e.g., Campus Bookstore"
              value={formData.pickup}
              onChange={handleChange}
              onBlur={() => setFormData((current) => ({ ...current, pickup: current.pickup.trim() }))}
              className={box("pickup")}
            />
            {err("pickup")}
            <p className="mt-1 text-xs text-slate-400">Enter 3–80 characters. The location cannot be blank or contain &lt; or &gt;.</p>
          </div>

          <div className="space-y-3">
            <label className={label}>Drop-off Location</label>
            <select
              value={dropoffBuilding}
              onChange={(e) => {
                setDropoffBuilding(e.target.value);
                setDropoffRoom("");
                setFormData((current) => ({ ...current, dropoff: "" }));
                setFields((current) => ({ ...current, dropoff: "" }));
              }}
              className={`${box("dropoff")} bg-white`}
              required
              aria-label="Drop-off building"
            >
              <option value="">Select building</option>
              {CAMPUS_BUILDINGS.map(({ building }) => <option key={building} value={building}>{building}</option>)}
            </select>
            <select
              value={dropoffRoom}
              onChange={(e) => {
                setDropoffRoom(e.target.value);
                setFormData((current) => ({ ...current, dropoff: e.target.value }));
                setFields((current) => ({ ...current, dropoff: "" }));
              }}
              className={`${box("dropoff")} bg-white`}
              required
              disabled={!dropoffBuilding}
              aria-label="Drop-off room number"
            >
              <option value="">Select room number or location</option>
              {getBuilding(dropoffBuilding)?.floors.map((group) => (
                <optgroup key={group.floor} label={group.floor}>
                  {group.rooms.map((room) => <option key={room} value={room}>{room}</option>)}
                </optgroup>
              ))}
            </select>
            <p className="text-xs text-slate-400">Choose the building first, then select a room or listed campus location.</p>
            {err("dropoff")}
          </div>
        </div>

              
            <div>
          <label className={label}>Contact Phone Number</label>
          <input
            type="tel"
            name="contactPhone"
            required
            inputMode="numeric"
            pattern="\d{11}"
            maxLength={11}
            placeholder="09171234567"
            value={formData.contactPhone}
            onChange={(e) =>
              setFormData({ ...formData, contactPhone: e.target.value.replace(/\D/g, "").slice(0, 11) })
            }
            className={box("contactPhone")}
          />
          <p className="mt-1 text-xs text-slate-400">
            Only shown to the runner once they accept your errand.
          </p>
          {err("contactPhone")}
        </div>

        <div>
          <label className={label}>Preferred Date and Time</label>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              type="date"
              name="preferredDate"
              required
              min={nextAvailableDate()}
              value={preferredDate}
              onChange={(e) => {
                setPreferredDate(e.target.value);
                setPreferredTime("");
                setFormData((current) => ({ ...current, deadline: "" }));
                setFields((current) => ({ ...current, deadline: "" }));
              }}
              className={box("deadline")}
              aria-label="Preferred date"
            />
            <select
              name="preferredTime"
              required
              value={preferredTime}
              onChange={(e) => {
                setPreferredTime(e.target.value);
                setFormData((current) => ({ ...current, deadline: `${preferredDate}T${e.target.value}` }));
                setFields((current) => ({ ...current, deadline: "" }));
              }}
              className={`${box("deadline")} bg-white`}
              aria-label="Preferred time"
            >
              <option value="" disabled>Select a time</option>
              {TIME_SLOTS.filter((item) => {
                if (preferredDate !== toLocalDateValue(new Date())) return true;
                return new Date(`${preferredDate}T${item.value}`).getTime() > Date.now();
              }).map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </div>
          <p className="mt-1 text-xs text-slate-400">Available every 30 minutes from 7:30 AM to 6:00 PM. Past dates and times are unavailable.</p>
          {err("deadline")}
        </div>

        <div>
          <label className={label}>Payment Method</label>
          <select
            name="paymentMethod"
            value={formData.paymentMethod}
            onChange={handleChange}
            className={box("paymentMethod")}
          >
            <option value="cash_on_delivery">Cash on delivery</option>
            <option value="e_wallet">E-wallet (GCash/Maya)</option>
            <option value="bank_transfer">Bank transfer</option>
          </select>
          <p className="mt-1 text-xs text-slate-400">E-wallet and bank transfers are arranged directly; the app does not process payments.</p>
        </div>

        <div>
          <label className={label}>Detailed Instructions</label>
          <textarea
            name="instructions"
            required
            minLength={10}
            maxLength={600}
            rows={3}
            onBlur={() => setFormData((current) => ({ ...current, instructions: current.instructions.trim() }))}
            placeholder="Provide specific notes for the runner..."
            value={formData.instructions}
            onChange={handleChange}
            className={box("instructions")}
          />
          {err("instructions")}
          <p className="mt-1 text-xs text-slate-400">Enter 10–600 characters with at least one letter or number. Markup is not allowed.</p>
        </div>

        <button
          type="submit"
          disabled={loading || !serviceOpen}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-3.5 font-bold text-white shadow-md shadow-emerald-200 transition hover:bg-emerald-600 disabled:opacity-50"
        >
          <PlusCircle className="h-5 w-5" />
          {loading ? "Posting Request..." : "Post Errand"}
        </button>
      </form>
    </div>
  );
}
