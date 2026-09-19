import { GraduationCap, Bike, Briefcase, ShieldCheck, ArrowLeft } from "lucide-react";
import type { Role } from "../store";

const roles: { key: Role; label: string; icon: typeof Bike; blurb: string }[] = [
  { key: "student", label: "Student", icon: GraduationCap, blurb: "Post errands & requests" },
  { key: "delivery", label: "Delivery", icon: Bike, blurb: "Earn by running gigs" },
  { key: "employee", label: "Employee", icon: Briefcase, blurb: "Staff & faculty access" },
];

export default function RoleSelect({
  value,
  onChange,
  onNext,
  onAdminPortal,
  onBack,
}: {
  value: Role;
  onChange: (r: Role) => void;
  onNext: () => void;
  onAdminPortal: () => void;
  onBack: () => void;
}) {
  return (
    <div className="min-h-screen bg-[#FDEFE6] p-4 sm:p-8 lg:p-10">
      <div className="relative mx-auto flex min-h-[85vh] max-w-6xl flex-col items-center justify-center gap-10 rounded-[32px] bg-emerald-500 px-6 py-16 text-center shadow-2xl shadow-emerald-900/10">
        <button
          onClick={onBack}
          className="absolute left-6 top-6 flex h-11 w-11 items-center justify-center rounded-full bg-white/25 text-white transition hover:bg-white/40"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="space-y-5">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            Please select your role
          </h1>
          <p className="mx-auto max-w-2xl text-lg leading-relaxed text-emerald-950/70">
            Choose how you want to use Upang Deliver today. You can always switch between roles in
            your account settings.
          </p>
        </div>

        <div className="grid w-full max-w-3xl grid-cols-1 gap-5 sm:grid-cols-3">
          {roles.map((r) => {
            const Icon = r.icon;
            const active = value === r.key;
            return (
              <button
                key={r.key}
                onClick={() => onChange(r.key)}
                className={`group flex aspect-[4/3] flex-col items-center justify-center gap-3 rounded-[28px] bg-white px-4 shadow-lg transition ${
                  active ? "-translate-y-1 ring-4 ring-emerald-900/40" : "hover:-translate-y-1 hover:shadow-xl"
                }`}
              >
                <Icon
                  className={`h-10 w-10 ${active ? "text-emerald-600" : "text-slate-300"}`}
                  strokeWidth={1.6}
                />
                <span className={`text-2xl font-bold ${active ? "text-slate-900" : "text-slate-400"}`}>
                  {r.label}
                </span>
                <span className="text-xs text-slate-400">{r.blurb}</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={onNext}
          className="w-full max-w-lg rounded-2xl bg-emerald-600 px-8 py-5 text-xl font-bold text-white shadow-xl shadow-emerald-900/20 transition hover:-translate-y-0.5 hover:bg-emerald-700"
        >
          Get Started
        </button>

        <div className="w-full max-w-lg border-t border-white/30 pt-6">
          <p className="text-sm text-emerald-950/70">Campus staff managing the platform?</p>
          <button
            onClick={onAdminPortal}
            className="mx-auto mt-3 flex items-center gap-2 rounded-2xl bg-[#0B1524] px-7 py-4 font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-slate-800"
          >
            <ShieldCheck className="h-5 w-5 text-emerald-400" /> Go to Admin Portal
          </button>
        </div>
      </div>
    </div>
  );
}
