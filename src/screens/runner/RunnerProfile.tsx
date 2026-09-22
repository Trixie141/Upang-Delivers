import { Coins, CheckCheck, Zap, Wallet } from "lucide-react";

export interface RunnerProfileStats {
  earned: number;
  completed: number;
  /** Average minutes per gig, or null when there is no data yet */
  avgMinutes: number | null;
  /** Earnings per day, Mon to Sun (7 numbers) */
  weekly: number[];
  balance: number;
}

const EMPTY_STATS: RunnerProfileStats = {
  earned: 0,
  completed: 0,
  avgMinutes: null,
  weekly: [],
  balance: 0,
};

function EarningsChart({ data }: { data: number[] }) {
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const w = 760;
  const h = 320;
  const pad = { l: 64, r: 20, t: 20, b: 34 };
  const max = Math.max(100, Math.ceil(Math.max(...data) / 100) * 100);
  const iw = w - pad.l - pad.r;
  const ih = h - pad.t - pad.b;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(max * f));

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
      {ticks.map((t) => {
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

export default function RunnerProfile({
  name,
  stats = EMPTY_STATS,
}: {
  name: string;
  stats?: RunnerProfileStats;
}) {
  const initials =
    name
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "R";

  const cards = [
    {
      label: "TOTAL EARNED",
      value: `₱${stats.earned.toLocaleString()}`,
      icon: Coins,
      tint: "bg-orange-50 text-orange-500",
    },
    {
      label: "GIGS COMPLETED",
      value: stats.completed.toString(),
      icon: CheckCheck,
      tint: "bg-sky-50 text-sky-500",
    },
    {
      label: "AVERAGE TIME",
      value: stats.avgMinutes === null ? "—" : `${stats.avgMinutes} mins`,
      icon: Zap,
      tint: "bg-violet-50 text-violet-500",
    },
  ];

  const hasWeekly = stats.weekly.length === 7 && stats.weekly.some((v) => v > 0);

  return (
    <div className="mx-auto max-w-6xl space-y-7 pb-4">
      <div className="flex flex-col gap-6 rounded-3xl bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:p-8">
        <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-[26px] bg-emerald-100 text-4xl font-extrabold text-emerald-700">
          {initials}
        </div>
        <div>
          <h2 className="text-4xl font-extrabold text-slate-900">{name || "Runner"}</h2>
          <p className="mt-1 text-lg text-slate-500">PHINMA University of Pangasinan</p>
          <span className="mt-4 flex items-center gap-2 text-sm font-bold text-slate-700">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> ACTIVE RUNNER
          </span>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {cards.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-3xl bg-white p-7 shadow-sm">
              <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${s.tint}`}>
                <Icon className="h-7 w-7" />
              </div>
              <p className="mt-6 text-xs font-bold tracking-[0.14em] text-slate-400">{s.label}</p>
              <p className="mt-1 text-4xl font-extrabold text-slate-900">{s.value}</p>
            </div>
          );
        })}
      </div>

      <div className="rounded-3xl bg-white p-7 shadow-sm">
        <h3 className="text-2xl font-bold text-slate-900">Weekly Earnings Trend</h3>
        <div className="mt-6">
          {hasWeekly ? (
            <EarningsChart data={stats.weekly} />
          ) : (
            <p className="rounded-2xl bg-slate-50 py-16 text-center text-slate-400">
              No earnings yet. Complete a gig to start your trend.
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-6 rounded-3xl bg-[#0B1524] p-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold tracking-[0.18em] text-slate-400">CURRENT BALANCE</p>
          <p className="mt-2 text-5xl font-extrabold text-white">
            ₱{stats.balance.toLocaleString()}
          </p>
        </div>
        <button
          disabled
          title="Withdrawals aren't available yet"
          className="flex items-center justify-center gap-3 rounded-2xl bg-white/10 px-10 py-5 text-lg font-bold text-white ring-1 ring-white/15 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Wallet className="h-5 w-5" /> Withdraw
        </button>
      </div>
    </div>
  );
}