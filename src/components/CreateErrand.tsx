import { useState } from "react";
import { PlusCircle, AlertCircle } from "lucide-react";
import { api } from "../lib/api";

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
    category: "Food Delivery",
    pickup: "",
    dropoff: "",
    reward: "",
    deadline: "",
  });

  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setBanner("");

    const payload = {
      ...formData,
      reward: Number(formData.reward),
    };

    const res = await api.createErrand(token, payload);
    setLoading(false);

    if (!res.ok) {
      setBanner(`${res.status} — ${res.error || "Failed to post errand request."}`);
      return;
    }

    onSuccess();
  };

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
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
            Errand Title
          </label>
          <input
            type="text"
            name="title"
            required
            placeholder="e.g., Pick up printed handouts at Main Library"
            value={formData.title}
            onChange={handleChange}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-emerald-500 focus:outline-none"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Category
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-emerald-500 focus:outline-none bg-white"
            >
              <option value="Food Delivery">Food Delivery</option>
              <option value="Printing & Documents">Printing & Documents</option>
              <option value="Item Pickup">Item Pickup</option>
              <option value="Groceries & Snacks">Groceries & Snacks</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Bounty Reward (₱)
            </label>
            <input
              type="number"
              name="reward"
              required
              min="1"
              placeholder="50"
              value={formData.reward}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Pickup Location
            </label>
            <input
              type="text"
              name="pickup"
              required
              placeholder="e.g., Campus Bookstore"
              value={formData.pickup}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Drop-off Location
            </label>
            <input
              type="text"
              name="dropoff"
              required
              placeholder="e.g., Science Building - Rm 302"
              value={formData.dropoff}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
            Deadline / Preferred Time
          </label>
          <input
            type="text"
            name="deadline"
            required
            placeholder="e.g., Today before 3:00 PM"
            value={formData.deadline}
            onChange={handleChange}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-emerald-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
            Detailed Instructions
          </label>
          <textarea
            name="instructions"
            required
            rows={3}
            placeholder="Provide specific notes for the runner..."
            value={formData.instructions}
            onChange={handleChange}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-emerald-500 focus:outline-none"
          />
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