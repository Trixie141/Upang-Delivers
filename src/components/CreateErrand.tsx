import { useState } from "react";
import { PlusCircle, AlertCircle } from "lucide-react";
import { api } from "../lib/api";

// Formats a Date for the `min` attribute of a datetime-local input
// e.g. "2026-09-21T17:00"
const toLocalInputValue = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
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
    deadline: "", // stays "" until the user picks a date/time
    contactPhone: "",
  });

  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBanner("");
    setFields({});

    // Deadline must be a real date/time in the future before we convert it
    const deadlineDate = new Date(formData.deadline);
    if (!formData.deadline || isNaN(deadlineDate.getTime())) {
      setFields({ deadline: "Pick a valid deadline date and time." });
      return;
    }
    if (deadlineDate.getTime() <= Date.now()) {
      setFields({ deadline: "Deadline must be in the future." });
      return;
    }
    if (!/^\d{11}$/.test(formData.contactPhone)) {
      setFields({ contactPhone: "Enter an 11-digit phone number, numbers only." });
      return;
    }

    const payload = {
      ...formData,
      reward: Number(formData.reward),
      deadline: deadlineDate.toISOString(),
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
      setBanner(`${res.status} — ${res.error || "Failed to post errand request."}`);
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

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={label}>Errand Title</label>
          <input
            type="text"
            name="title"
            required
            minLength={6}
            maxLength={90}
            placeholder="e.g., Pick up printed handouts at Main Library"
            value={formData.title}
            onChange={handleChange}
            className={box("title")}
          />
          {err("title")}
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
              min="10"
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
              placeholder="e.g., Campus Bookstore"
              value={formData.pickup}
              onChange={handleChange}
              className={box("pickup")}
            />
            {err("pickup")}
          </div>

          <div>
            <label className={label}>Drop-off Location</label>
            <input
              type="text"
              name="dropoff"
              required
              minLength={3}
              maxLength={80}
              placeholder="e.g., Science Building - Rm 302"
              value={formData.dropoff}
              onChange={handleChange}
              className={box("dropoff")}
            />
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
          <label className={label}>Deadline / Preferred Time</label>
          <input
            type="datetime-local"
            name="deadline"
            required
            min={toLocalInputValue(new Date())} // blocks past dates/times
            value={formData.deadline}
            onChange={handleChange}
            className={box("deadline")}
          />
          {err("deadline")}
        </div>

        <div>
          <label className={label}>Detailed Instructions</label>
          <textarea
            name="instructions"
            required
            minLength={10}
            maxLength={600}
            rows={3}
            placeholder="Provide specific notes for the runner..."
            value={formData.instructions}
            onChange={handleChange}
            className={box("instructions")}
          />
          {err("instructions")}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-3.5 font-bold text-white shadow-md shadow-emerald-200 transition hover:bg-emerald-600 disabled:opacity-50"
        >
          <PlusCircle className="h-5 w-5" />
          {loading ? "Posting Request..." : "Post Errand"}
        </button>
      </form>
    </div>
  );
}