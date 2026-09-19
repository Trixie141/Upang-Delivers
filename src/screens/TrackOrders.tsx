import { useState } from "react";
import {
  Check,
  Truck,
  Flag,
  FileText,
  History,
  User,
  MapPin,
  Phone,
  Timer,
} from "lucide-react";
import { useStore } from "../store";

const steps = [
  { label: "Pending", date: "Oct 24", icon: Check },
  { label: "Processing", date: "Oct 25", icon: Check },
  { label: "Out for Delivery", date: "Now", icon: Truck },
  { label: "Delivered", date: "Pending", icon: Flag },
];

export default function TrackOrders() {
  const { pushToast } = useStore();
  const [current, setCurrent] = useState(2);

  return (
    <div className="mx-auto max-w-6xl space-y-7">
      <div className="rounded-3xl bg-white p-7 shadow-sm sm:p-9">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-4">
            <p className="text-4xl font-extrabold text-slate-900 sm:text-5xl">$1,248.50</p>
            <span className="flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-600">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> On Time
            </span>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => pushToast("Invoice downloaded (demo).")}
              className="flex items-center gap-2 rounded-xl border border-slate-200 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <FileText className="h-5 w-5 text-slate-400" /> Download Invoice
            </button>
            <button
              onClick={() => {
                setCurrent((c) => (c + 1) % 4);
                pushToast("Delivery status updated.");
              }}
              className="flex items-center gap-2 rounded-xl bg-sky-500 px-5 py-3 font-semibold text-white transition hover:bg-sky-600"
            >
              <History className="h-5 w-5" /> Modify Delivery
            </button>
          </div>
        </div>

        {/* Stepper */}
        <div className="relative mt-12 grid grid-cols-4 gap-2">
          <div className="absolute left-[12.5%] right-[12.5%] top-6 h-1 rounded bg-slate-200" />
          <div
            className="absolute left-[12.5%] top-6 h-1 rounded bg-emerald-500 transition-all duration-500"
            style={{ width: `${(current / 3) * 75}%` }}
          />
          {steps.map((s, i) => {
            const Icon = s.icon;
            const done = i < current;
            const active = i === current;
            return (
              <div key={s.label} className="relative flex flex-col items-center gap-3 text-center">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-full transition ${
                    done
                      ? "bg-emerald-500 text-white"
                      : active
                        ? "bg-sky-500 text-white ring-4 ring-sky-100"
                        : "bg-slate-100 text-slate-400"
                  }`}
                >
                  <Icon className="h-5 w-5" strokeWidth={2.4} />
                </div>
                <p
                  className={`text-sm font-semibold sm:text-base ${
                    active ? "text-sky-600" : done ? "text-slate-800" : "text-slate-400"
                  }`}
                >
                  {s.label}
                </p>
                <p className="text-xs text-slate-400 sm:text-sm">{s.date}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-7 lg:grid-cols-[1.6fr_1fr]">
        <div className="overflow-hidden rounded-3xl bg-white p-4 shadow-sm">
          <img
            src="/images/campus-map.png"
            alt="Campus map"
            className="h-full w-full rounded-2xl object-cover"
          />
        </div>

        <div className="rounded-3xl bg-white p-7 shadow-sm">
          <h3 className="text-xl font-bold text-slate-900">Delivery Information</h3>
          <div className="mt-6 space-y-6">
            {[
              { icon: User, label: "Recipient", value: "Marcus Vance" },
              { icon: MapPin, label: "Drop Off", value: "NH Room 214" },
              { icon: Phone, label: "Phone", value: "0991234566" },
            ].map((row) => {
              const Icon = row.icon;
              return (
                <div key={row.label} className="flex items-center gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">{row.label}</p>
                    <p className="font-bold text-slate-900">{row.value}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8 border-t border-slate-100 pt-6">
            <p className="text-slate-400">Estimated Arrival</p>
            <div className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-emerald-50 px-6 py-4 text-xl font-extrabold text-emerald-600">
              <Timer className="h-6 w-6" /> ETA: 42 Mins
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
