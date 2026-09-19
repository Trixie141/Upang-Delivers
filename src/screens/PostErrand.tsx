import { useState } from "react";
import { Sandwich, Printer, Users, MoreHorizontal, ShieldCheck, AlertCircle } from "lucide-react";
import { useStore } from "../store";
import { api } from "@/lib/api";

const categories = [
  { key: "Food Run", icon: Sandwich, tint: "text-emerald-600" },
  { key: "Printing", icon: Printer, tint: "text-sky-500" },
  { key: "Queuing", icon: Users, tint: "text-violet-500" },
  { key: "Others", icon: MoreHorizontal, tint: "text-slate-400" },
];

const deadlines = [
  "ASAP (Within 30 mins)",
  "Within 1 hour",
  "Before 3:00 PM Today",
  "Anytime today",
];

export default function PostErrand({
  token,
  setPage,
}: {
  token: string;
  setPage: (p: string) => void;
}) {
  const { addRequest, pushToast } = useStore();
  const [category, setCategory] = useState("Food Run");
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [reward, setReward] = useState("50");
  const [cod, setCod] = useState(false);
  const [deadline, setDeadline] = useState(deadlines[0]);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
  e.preventDefault();
  setBusy(true);
  setBanner("");

  const payload = { title, instructions, pickup, dropoff, reward, category, cod, deadline };
  
  // 1. Client-side Validation
  const clientErrors = api.validateErrand(payload);
  setFields(clientErrors);
  if (Object.keys(clientErrors).length) {
    setBanner(
      `422 — payload rejected by validation (${Object.keys(clientErrors).length} field${
        Object.keys(clientErrors).length > 1 ? "s" : ""
      } invalid). Nothing was written to the database.`,
    );
    setBusy(false);
    return;
  }

  // 2. Asynchronous API Request to Backend
  const res = await api.createErrand(token, payload);
  setBusy(false);

  if (!res.ok) {
    setFields(res.fields ?? {});
    setBanner(`${res.status} — ${res.error}`);
    return;
  }

  // 3. Update global store & transition page
  addRequest({ title: res.data.title, to: res.data.dropoff, reward: res.data.reward });
  pushToast(`Errand ${res.data.id} created • ₱${res.data.reward} • owner ${res.data.owner_id}`);
  
  setTitle("");
  setInstructions("");
  setPickup("");
  setDropoff("");
  setPage("requests");
}

  const err = (k: string) =>
    fields[k] ? (
      <p className="mt-2 flex items-center gap-2 text-sm font-medium text-rose-600">
        <AlertCircle className="h-4 w-4" /> {fields[k]}
      </p>
    ) : null;

  const box = (k: string) =>
    `w-full rounded-2xl px-6 py-5 text-lg text-slate-800 outline-none transition placeholder:text-slate-400 ${
      fields[k]
        ? "bg-rose-50 ring-2 ring-rose-400"
        : "bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
    }`;

  return (
    <form onSubmit={submit} className="mx-auto max-w-4xl space-y-7 pb-4">
      {banner && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-6 py-4 text-rose-600">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="font-medium">{banner}</p>
        </div>
      )}

      <section className="rounded-3xl bg-white p-7 shadow-sm sm:p-9">
        <h2 className="text-2xl font-bold text-slate-900">1. What do you need help with?</h2>
        <div className="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-4">
          {categories.map((c) => {
            const Icon = c.icon;
            const active = category === c.key;
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => setCategory(c.key)}
                className={`flex flex-col items-center gap-4 rounded-2xl border-2 py-8 transition ${
                  active
                    ? "border-emerald-500 bg-orange-50/60"
                    : "border-transparent bg-slate-50 hover:border-slate-200"
                }`}
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm">
                  <Icon className={`h-7 w-7 ${c.tint}`} />
                </span>
                <span
                  className={`text-lg font-bold ${active ? "text-slate-900" : "text-slate-500"}`}
                >
                  {c.key}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-3xl bg-white p-7 shadow-sm sm:p-9">
        <h2 className="text-2xl font-bold text-slate-900">2. Errand Details</h2>

        <div className="mt-7 space-y-6">
          <div>
            <label className="text-xs font-bold tracking-[0.12em] text-slate-400">
              TITLE OF ERRAND
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Buy 2 Iced Coffee from Cafe 19"
              className={`mt-2 ${box("title")}`}
            />
            {err("title")}
          </div>

          <div>
            <label className="text-xs font-bold tracking-[0.12em] text-slate-400">
              SPECIFIC INSTRUCTIONS
            </label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={5}
              placeholder="Tell the runner exactly what to do, items to buy, or specific preferences..."
              className={`mt-2 resize-none ${box("instructions")}`}
            />
            {err("instructions")}
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className="text-xs font-bold tracking-[0.12em] text-slate-400">
                PICK-UP LOCATION
              </label>
              <input
                value={pickup}
                onChange={(e) => setPickup(e.target.value)}
                placeholder="e.g., PHINMA Canteen"
                className={`mt-2 ${box("pickup")}`}
              />
              {err("pickup")}
            </div>
            <div>
              <label className="text-xs font-bold tracking-[0.12em] text-slate-400">
                DROP-OFF LOCATION
              </label>
              <input
                value={dropoff}
                onChange={(e) => setDropoff(e.target.value)}
                placeholder="e.g., IT Building - Room 405"
                className={`mt-2 ${box("dropoff")}`}
              />
              {err("dropoff")}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl bg-white p-7 shadow-sm sm:p-9">
        <h2 className="text-2xl font-bold text-slate-900">3. Reward &amp; Timeline</h2>
        <div className="mt-7 grid gap-6 sm:grid-cols-2">
          <div
            className={`rounded-2xl border-2 p-6 ${
              fields.reward ? "border-rose-300 bg-rose-50" : "border-orange-100 bg-orange-50/50"
            }`}
          >
            <p className="text-xs font-bold tracking-[0.12em] text-slate-500">
              RUNNER REWARD (PHP)
            </p>
            <div className="mt-2 flex items-center gap-3">
              <span className="text-3xl font-bold text-slate-500">₱</span>
              <input
                value={reward}
                onChange={(e) => setReward(e.target.value)}
                inputMode="numeric"
                className="w-full bg-transparent text-4xl font-extrabold text-slate-900 outline-none"
              />
            </div>
            <p className="mt-3 text-sm text-slate-500">
              Suggested reward for this distance: ₱45 - ₱60
            </p>
            {err("reward")}
          </div>

          <div>
            <label className="text-xs font-bold tracking-[0.12em] text-slate-400">DEADLINE</label>
            <select
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="mt-2 w-full appearance-none rounded-2xl bg-slate-50 px-6 py-5 text-lg text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500"
            >
              {deadlines.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
            <label className="mt-5 flex cursor-pointer items-center gap-3 text-lg text-slate-700">
              <input
                type="checkbox"
                checked={cod}
                onChange={(e) => setCod(e.target.checked)}
                className="h-6 w-6 accent-emerald-500"
              />
              Payment on delivery (COD)
            </label>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2 text-sm text-slate-500">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          Payload is schema-validated server-side and stamped with your owner ID.
        </p>
        <button
  type="submit"
  disabled={busy}
  className="rounded-2xl bg-emerald-500 px-12 py-5 text-xl font-extrabold text-white shadow-lg shadow-emerald-500/30 transition hover:-translate-y-0.5 hover:bg-emerald-600 disabled:opacity-60"
>
  {busy ? "Posting Errand..." : "Post Errand Now"}
</button>
      </div>
    </form>
  );
}
