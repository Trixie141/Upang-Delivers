export function LineChart({
  data,
  labels,
  height = 260,
  showAxis = true,
}: {
  data: number[];
  labels: string[];
  height?: number;
  showAxis?: boolean;
}) {
  const w = 700;
  const h = height;
  const pad = { l: showAxis ? 38 : 12, r: 12, t: 16, b: 28 };
  const max = Math.ceil(Math.max(...data) / 20) * 20 || 100;
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;

  const pts = data.map((v, i) => {
    const x = pad.l + (i * innerW) / (data.length - 1);
    const y = pad.t + innerH - (v / max) * innerH;
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

  const area = `${path} L ${pts[pts.length - 1][0]} ${pad.t + innerH} L ${pts[0][0]} ${pad.t + innerH} Z`;

  const ticks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img">
      {showAxis &&
        ticks.map((t) => {
          const y = pad.t + innerH - t * innerH;
          return (
            <g key={t}>
              <line x1={pad.l} x2={w - pad.r} y1={y} y2={y} stroke="#EEF2F5" strokeWidth={1} />
              <text x={pad.l - 10} y={y + 4} textAnchor="end" className="fill-slate-400 text-[11px]">
                {Math.round(max * t)}
              </text>
            </g>
          );
        })}
      <path d={area} fill="#10b981" opacity={0.08} />
      <path d={path} fill="none" stroke="#10b981" strokeWidth={3} strokeLinecap="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r={4.5} fill="#fff" stroke="#10b981" strokeWidth={3} />
      ))}
      {labels.map((l, i) => (
        <text
          key={l}
          x={pad.l + (i * innerW) / (labels.length - 1)}
          y={h - 6}
          textAnchor="middle"
          className="fill-slate-400 text-[12px]"
        >
          {l}
        </text>
      ))}
    </svg>
  );
}

export function DonutChart({
  slices,
}: {
  slices: { label: string; value: number; color: string }[];
}) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  const r = 70;
  const cx = 110;
  const cy = 110;
  const stroke = 44;
  const circ = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-6">
      <svg viewBox="0 0 220 220" className="w-full max-w-[240px] -rotate-90">
        {slices.map((s) => {
          const len = (s.value / total) * circ;
          const el = (
            <circle
              key={s.label}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={stroke}
              strokeDasharray={`${len} ${circ - len}`}
              strokeDashoffset={-offset}
            />
          );
          offset += len;
          return el;
        })}
      </svg>
      <div className="flex flex-wrap justify-center gap-x-6 gap-y-3">
        {slices.map((s) => (
          <div key={s.label} className="flex items-center gap-2 text-sm text-slate-600">
            <span className="h-3 w-3 rounded-sm" style={{ background: s.color }} />
            {s.label} <span className="font-semibold text-slate-800">{s.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
