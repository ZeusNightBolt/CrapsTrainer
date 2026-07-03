export default function Sparkline({ data, height = 56 }) {
  const w = 300, pad = 4;
  if (!data || data.length < 2)
    return <div style={{ height, color: "#4b5060", fontSize: 11, display: "flex", alignItems: "center" }}>Roll to chart bankroll…</div>;
  const min = Math.min(...data), max = Math.max(...data), range = max - min || 1;
  const xy = data.map((v, i) => [
    pad + (i / (data.length - 1)) * (w - 2 * pad),
    height - pad - ((v - min) / range) * (height - 2 * pad),
  ]);
  const pts = xy.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${pts} ${xy[xy.length - 1][0].toFixed(1)},${height} ${xy[0][0].toFixed(1)},${height}`;
  const up = data[data.length - 1] >= data[0];
  const color = up ? "#34d399" : "#f43f5e";
  const gid = up ? "sparkup" : "sparkdown";
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" style={{ display: "block" }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${gid})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
