import { useState } from "react";
import { Camera, Coins, CheckCheck, Zap, Star, Calendar, Wallet } from "lucide-react";
import { useStore } from "../../store";

function EarningsChart() {
  const data = [120, 450, 310, 575, 240, 380, 190];
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const w = 760;
  const h = 320;
  const pad = { l: 64, r: 20, t: 20, b: 34 };
  const max = 600;
  const iw = w - pad.l - pad.r;
  const ih = h - pad.t - pad.b;

  const pts = data.map((v, i) => {
    const x = pad.l + (i * iw) / (data.length - 1);
    const y = pad.t + ih - (v / max) * ih;
    return [x, y] as const;
  });
  const path = pts
    .map((p, i) => {
      if (i === 0) return `M ${p[0]} ${p[1]}`;
      const prev = pts[i - 1];
      const cx = (prev[0] + p[0]) / 2;
      return `C ${cx} ${prev[1]}, ${cx} ${p[1]}, ${p[0]} ${p[1]}`;
    })
    .join(" ");
  const area = `${path} L ${pts[pts.length - 1][0]} ${pad.t + ih} L ${pts[0][0]} ${pad.t + ih} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
      {[0, 100, 200, 300, 400, 500, 600].map((t) => {
        const y = pad.t + ih - (t / max) * ih;
        return (
          <g key={t}>
            <line x1={pad.l} x2={w - pad.r} y1={y} y2={y} stroke="#EEF2F5" />
            <text x={pad.l - 12} y={y + 4} textAnchor="end" className="fill-slate-400 text-[12px]">
              ₱{t}
            </text>
          </g>
        );
      })}
      {labels.map((l, i) => (
        <line
          key={l}
          x1={pad.l + (i * iw) / (labels.length - 1)}
          x2={pad.l + (i * iw) / (labels.length - 1)}
          y1={pad.t}
          y2={pad.t + ih}
          stroke="#F5F7F9"
        />
      ))}
      <path d={area} fill="#10b981" opacity={0.12} />
      <path d={path} fill="none" stroke="#10b981" strokeWidth={4} strokeLinecap="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r={5} fill="#10b981" />
      ))}
      {labels.map((l, i) => (
        <text
          key={l}
          x={pad.l + (i * iw) / (labels.length - 1)}
          y={h - 8}
          textAnchor="middle"
          className="fill-slate-400 text-[13px]"
        >
          {l}
        </text>
      ))}
    </svg>
  );
}

export default function RunnerProfile() {
  const { profile, updateProfile, pushToast } = useStore();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile.name);
  const [program, setProgram] = useState(profile.program);

  const stats = [
    { label: "TOTAL EARNED", value: "₱3,842.00", sub: "+12% from last month", subTone: "text-emerald-600", icon: Coins, tint: "bg-orange-50 text-orange-500" },
    { label: "GIGS COMPLETED", value: "54", sub: "100% completion rate", subTone: "text-slate-400", icon: CheckCheck, tint: "bg-sky-50 text-sky-500" },
    { label: "AVERAGE TIME", value: "18 mins", sub: "Fastest in PTA Building", subTone: "text-slate-400", icon: Zap, tint: "bg-violet-50 text-violet-500" },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-7 pb-4">
      <div className="rounded-3xl bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="relative w-fit">
              <div className="h-36 w-36 overflow-hidden rounded-[26px] bg-white p-2 shadow-lg ring-1 ring-slate-100">
                <img
                  src={profile.avatar}
                  alt={profile.name}
                  className="h-full w-full rounded-2xl object-cover"
                />
              </div>
              <button
                onClick={() => pushToast("Photo upload is disabled in this demo.")}
                className="absolute -bottom-3 right-2 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-lg transition hover:bg-emerald-600"
              >
                <Camera className="h-5 w-5" />
              </button>
            </div>

            <div>
              {editing ? (
                <div className="space-y-3">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-2xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <input
                    value={program}
                    onChange={(e) => setProgram(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-600 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              ) : (
                <>
                  <h2 className="text-4xl font-extrabold text-slate-900">{profile.name}</h2>
                  <p className="mt-1 text-lg text-slate-500">{profile.program}</p>
                </>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-6">
                <span className="flex items-center gap-2 text-sm font-bold text-slate-700">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> ACTIVE RUNNER
                </span>
                <span className="flex items-center gap-2 font-bold text-slate-900">
                  <Star className="h-5 w-5 fill-amber-400 text-amber-400" /> 4.9{" "}
                  <span className="font-normal text-slate-400">(42 reviews)</span>
                </span>
                <span className="flex items-center gap-2 text-slate-600">
                  <Calendar className="h-5 w-5 text-slate-400" />{" "}
                  <span className="font-bold text-slate-900">Joined August 2026</span>
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              if (editing) {
                updateProfile({ name, program });
                pushToast("Profile updated.");
              }
              setEditing((v) => !v);
            }}
            className="shrink-0 rounded-2xl bg-[#0B1524] px-9 py-4 text-lg font-bold text-white transition hover:bg-slate-800"
          >
            {editing ? "Save Profile" : "Edit Profile"}
          </button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-3xl bg-white p-7 shadow-sm">
              <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${s.tint}`}>
                <Icon className="h-7 w-7" />
              </div>
              <p className="mt-6 text-xs font-bold tracking-[0.14em] text-slate-400">{s.label}</p>
              <p className="mt-1 text-4xl font-extrabold text-slate-900">{s.value}</p>
              <p className={`mt-3 text-sm font-semibold ${s.subTone}`}>{s.sub}</p>
            </div>
          );
        })}
      </div>

      <div className="rounded-3xl bg-white p-7 shadow-sm">
        <h3 className="text-2xl font-bold text-slate-900">Weekly Earnings Trend</h3>
        <div className="mt-6">
          <EarningsChart />
        </div>
      </div>

      <div className="flex flex-col gap-6 rounded-3xl bg-[#0B1524] p-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold tracking-[0.18em] text-slate-400">CURRENT BALANCE</p>
          <p className="mt-2 text-5xl font-extrabold text-white">₱245.50</p>
          <p className="mt-2 text-sm text-slate-400">Payouts are released every Friday, 5:00 PM.</p>
        </div>
        <button
          onClick={() => pushToast("Withdrawal of ₱245.50 requested.")}
          className="flex items-center justify-center gap-3 rounded-2xl bg-white/10 px-10 py-5 text-lg font-bold text-white ring-1 ring-white/15 transition hover:bg-white/20"
        >
          <Wallet className="h-5 w-5" /> Withdraw
        </button>
      </div>
    </div>
  );
}
