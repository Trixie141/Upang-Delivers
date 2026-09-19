import { useState } from "react";
import { useStore } from "../../store";

function Toggle({
  on,
  onChange,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={`relative h-8 w-14 shrink-0 rounded-full transition ${
        on ? "bg-emerald-500" : "bg-slate-200"
      }`}
    >
      <span
        className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${
          on ? "left-7" : "left-1"
        }`}
      />
    </button>
  );
}

function Section({
  title,
  desc,
  children,
}: {
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
      <div className="border-b border-slate-100 px-7 py-7">
        <h3 className="text-2xl font-bold text-slate-900">{title}</h3>
        <p className="mt-1 text-slate-500">{desc}</p>
      </div>
      <div className="space-y-6 px-7 py-7">{children}</div>
    </div>
  );
}

export default function AdminSettings() {
  const { pushToast } = useStore();
  const [start, setStart] = useState("07:00 AM");
  const [end, setEnd] = useState("09:00 PM");
  const [maintenance, setMaintenance] = useState(false);
  const [fee, setFee] = useState("5");
  const [minReward, setMinReward] = useState("30");
  const [eduEmail, setEduEmail] = useState(true);
  const [autoFlag, setAutoFlag] = useState(true);
  const [idCheck, setIdCheck] = useState(false);

  return (
    <div className="mx-auto max-w-4xl space-y-7 pb-4">
      <Section title="General Configuration" desc="Basic platform behavior and operational hours.">
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label className="text-xs font-bold tracking-[0.12em] text-slate-400">
              SERVICE HOURS START
            </label>
            <input
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 px-5 py-4 text-lg text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="text-xs font-bold tracking-[0.12em] text-slate-400">
              SERVICE HOURS END
            </label>
            <input
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 px-5 py-4 text-lg text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
        <div className="flex items-center justify-between gap-6 border-t border-slate-100 pt-6">
          <div>
            <p className="text-lg font-bold text-slate-900">Maintenance Mode</p>
            <p className="text-slate-500">Disable all new errand postings temporarily.</p>
          </div>
          <Toggle on={maintenance} onChange={setMaintenance} />
        </div>
      </Section>

      <Section title="Fee & Commission Rules" desc="Control platform fees and runner rewards.">
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label className="text-xs font-bold tracking-[0.12em] text-slate-400">
              PLATFORM FEE (%)
            </label>
            <div className="relative mt-2">
              <input
                value={fee}
                onChange={(e) => setFee(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-5 py-4 pr-12 text-lg text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <span className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400">%</span>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold tracking-[0.12em] text-slate-400">
              MINIMUM COD REWARD
            </label>
            <div className="relative mt-2">
              <input
                value={minReward}
                onChange={(e) => setMinReward(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-5 py-4 pr-12 text-lg text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <span className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400">₱</span>
            </div>
          </div>
        </div>
      </Section>

      <Section
        title="Security & Moderation"
        desc="Manage auto-flagging and verification requirements."
      >
        {[
          { label: "Require EDU email for Runners", on: eduEmail, set: setEduEmail },
          { label: "Auto-flag suspicious price patterns", on: autoFlag, set: setAutoFlag },
          { label: "Require government ID before payout", on: idCheck, set: setIdCheck },
        ].map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-6">
            <p className="text-lg text-slate-800">{row.label}</p>
            <Toggle on={row.on} onChange={row.set} />
          </div>
        ))}
      </Section>

      <div className="flex flex-wrap justify-end gap-4">
        <button
          onClick={() => pushToast("Changes discarded.")}
          className="rounded-2xl bg-white px-7 py-4 font-bold text-slate-600 shadow-sm transition hover:bg-slate-50"
        >
          Discard
        </button>
        <button
          onClick={() =>
            pushToast(
              `Settings saved • ${start}–${end} • fee ${fee}% • min ₱${minReward}${
                maintenance ? " • maintenance ON" : ""
              }`,
            )
          }
          className="rounded-2xl bg-emerald-500 px-9 py-4 font-bold text-white shadow-md shadow-emerald-500/25 transition hover:bg-emerald-600"
        >
          Save Settings
        </button>
      </div>
    </div>
  );
}
