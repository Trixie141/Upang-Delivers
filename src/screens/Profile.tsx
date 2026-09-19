import { useState, useEffect } from "react";
import { Camera, UserCog, Star, BadgeCheck, ShieldCheck, IdCard } from "lucide-react";
import { useStore } from "../store";

export default function Profile() {
  const { profile, updateProfile, pushToast } = useStore();
  
  // Safe fallbacks for new user profile fields
  const [form, setForm] = useState({
    studentId: profile.studentId || "N/A",
    email: profile.email || "",
    phone: profile.phone || "",
    spot: profile.spot || "",
    name: profile.name || "New User",
    program: profile.program || "Student",
    avatar: profile.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
    rating: profile.rating || 0,
    reviewCount: profile.reviewCount || 0,
    punctuality: profile.punctuality || 0,
    reliability: profile.reliability || 0,
    communication: profile.communication || 0,
  });

  useEffect(() => {
    setForm((f) => ({ ...f, ...profile }));
  }, [profile]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="-mx-4 -mt-6 sm:-mx-8">
      {/* Banner */}
      <div className="h-44 bg-emerald-500" />

      <div className="mx-auto max-w-6xl px-4 sm:px-8">
        <div className="-mt-28 flex flex-col items-start gap-6 sm:flex-row sm:items-end">
          <div className="relative">
            <div className="h-40 w-40 overflow-hidden rounded-[28px] bg-white p-3 shadow-xl">
              <img
                src={form.avatar}
                alt={form.name}
                className="h-full w-full rounded-2xl object-cover"
              />
            </div>
            <button
              onClick={() => pushToast("Photo upload is disabled in this demo.")}
              className="absolute -bottom-3 right-2 flex h-11 w-11 items-center justify-center rounded-xl bg-white text-slate-600 shadow-lg transition hover:bg-slate-50"
            >
              <Camera className="h-5 w-5" />
            </button>
          </div>
          <div className="pb-4">
            <h2 className="text-4xl font-extrabold text-slate-900">{form.name}</h2>
            <p className="mt-1 text-lg text-slate-500">{form.program}</p>
          </div>
        </div>

        <div className="mt-10 grid gap-7 lg:grid-cols-[1.7fr_1fr]">
          {/* Account settings */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateProfile(form);
              pushToast("Profile changes saved!");
            }}
            className="rounded-3xl bg-white p-7 shadow-sm sm:p-9"
          >
            <h3 className="flex items-center gap-3 text-2xl font-bold text-slate-900">
              <UserCog className="h-7 w-7 text-slate-800" /> Account Settings
            </h3>

            <div className="mt-7 grid gap-6 sm:grid-cols-2">
              <Field label="STUDENT ID">
                <input
                  value={form.studentId}
                  disabled
                  className="w-full cursor-not-allowed rounded-2xl bg-slate-50 px-6 py-5 text-lg text-slate-400"
                />
              </Field>
              <Field label="EMAIL ADDRESS">
                <input
                  value={form.email}
                  onChange={set("email")}
                  placeholder="Enter email address"
                  className="w-full rounded-2xl bg-slate-50 px-6 py-5 text-lg text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </Field>
            </div>

            <div className="mt-6 space-y-6">
              <Field label="PHONE NUMBER">
                <input
                  value={form.phone}
                  onChange={set("phone")}
                  placeholder="Enter phone number"
                  className="w-full rounded-2xl bg-slate-50 px-6 py-5 text-lg text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </Field>
              <Field label="DEFAULT MEETING SPOT">
                <input
                  value={form.spot}
                  onChange={set("spot")}
                  placeholder="Enter preferred campus spot"
                  className="w-full rounded-2xl bg-slate-50 px-6 py-5 text-lg text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </Field>
            </div>

            <button
              type="submit"
              className="mt-8 rounded-2xl bg-emerald-500 px-10 py-5 text-xl font-bold text-white shadow-lg shadow-emerald-500/25 transition hover:-translate-y-0.5 hover:bg-emerald-600"
            >
              Save Changes
            </button>
          </form>

          {/* Trust score */}
          <div className="rounded-3xl bg-white p-7 shadow-sm sm:p-8">
            <h3 className="text-2xl font-bold text-slate-900">Trust Score</h3>
            <div className="mt-5 flex items-end gap-4">
              <p className="text-5xl font-extrabold text-orange-500">
                {form.rating > 0 ? form.rating.toFixed(1) : "N/A"}
              </p>
              <div className="pb-2">
                <div className="flex gap-0.5 text-orange-400">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-5 w-5 ${
                        i < Math.floor(form.rating)
                          ? "fill-orange-400 text-orange-400"
                          : "fill-slate-100 text-slate-200"
                      }`}
                    />
                  ))}
                </div>
                <p className="mt-1 text-sm text-slate-400">
                  {form.reviewCount > 0 ? `Based on ${form.reviewCount} reviews` : "No reviews yet"}
                </p>
              </div>
            </div>

            <div className="mt-8 space-y-6">
              <Meter label="Punctuality" value={form.punctuality} />
              <Meter label="Reliability" value={form.reliability} />
              <Meter label="Communication" value={form.communication} />
            </div>
          </div>
        </div>

        {/* Verification */}
        <div className="mt-7 mb-10 rounded-3xl bg-white p-7 shadow-sm sm:p-9">
          <h3 className="flex items-center gap-3 text-2xl font-bold text-slate-900">
            <IdCard className="h-7 w-7 text-slate-800" /> Identification &amp; Verification
          </h3>
          <div className="mt-6 grid gap-5 md:grid-cols-3">
            {[
              { icon: BadgeCheck, title: "Student ID Verified", sub: "Validated", ok: true },
              { icon: ShieldCheck, title: "Campus Conduct Pledge", sub: "Signed & active", ok: true },
              { icon: IdCard, title: "Government ID", sub: "Not submitted yet", ok: false },
            ].map((v) => {
              const Icon = v.icon;
              return (
                <div
                  key={v.title}
                  className={`flex items-start gap-4 rounded-2xl border p-5 ${
                    v.ok ? "border-emerald-100 bg-emerald-50/50" : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <Icon className={`h-7 w-7 ${v.ok ? "text-emerald-500" : "text-slate-400"}`} />
                  <div>
                    <p className="font-bold text-slate-900">{v.title}</p>
                    <p className="text-sm text-slate-500">{v.sub}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-bold tracking-[0.12em] text-slate-400">{label}</label>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function Meter({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between font-semibold">
        <span className="text-slate-600">{label}</span>
        <span className="text-slate-900">{value}%</span>
      </div>
      <div className="mt-2 h-2 w-full rounded-full bg-slate-100">
        <div
          className="h-2 rounded-full bg-emerald-500 transition-all duration-700"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}