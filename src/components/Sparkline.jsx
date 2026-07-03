export default function Sparkline({ data, height = 56 }) {
  const w = 300, pad = 4;
  if (!data || data.length < 2)
    return <div style={{ height, color: "#4b5060", fontSize: 11, display: "flex", alignItems: "center" }}>Roll to chart bankroll…</div>;
  const min = Math.min(...data), max = Math.max(...data), range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - 2 * pad);
    const y = height - pad - ((v - min) / range) * (height - 2 * pad);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const up = data[data.length - 1] >= data[0];
  const color = up ? "#34d399" : "#f43f5e";
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" style={{ display: "block" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}
