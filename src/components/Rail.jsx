import { memo } from "react";
import { edgeColor, usd } from "../util.js";
import Sparkline from "./Sparkline.jsx";

// The right-rail panels, each memoized so dice animation and log churn don't
// re-render the whole column.

export const StakePanel = memo(function StakePanel({ sum, drag, blendedEdge, mode }) {
  return (
    <div className="panel">
      <div className="kv"><span>On the table</span><b className="mono">{usd(sum)}</b></div>
      <div className="kv"><span>Expected drag / resolution</span><b className="mono" style={{ color: edgeColor(blendedEdge) }}>−{usd(drag)}</b></div>
      <div className="small" style={{ marginTop: 4 }}>
        Blended edge {blendedEdge.toFixed(2)}% — approx, mixes per-roll & per-decision bets.{" "}
        {mode === "remove" ? "Tap a bet to remove a chip." : "Tap to bet · right-click or Remove mode to take down."}
      </div>
    </div>
  );
});

export const SessionPanel = memo(function SessionPanel({ stats, pnl, hist }) {
  return (
    <div className="panel">
      <div className="small" style={{ marginBottom: 8, textTransform: "uppercase", letterSpacing: ".08em" }}>Session</div>
      <div className="stats">
        <div className="stat"><div className="k">P&L</div><div className="v mono" style={{ color: pnl >= 0 ? "#34d399" : "#f43f5e" }}>{pnl >= 0 ? "+" : ""}{usd(pnl)}</div></div>
        <div className="stat"><div className="k">Rolls</div><div className="v mono">{stats.rolls}</div></div>
        <div className="stat"><div className="k">Points made</div><div className="v mono">{stats.points}</div></div>
        <div className="stat"><div className="k">Seven-outs</div><div className="v mono">{stats.sevenOuts}</div></div>
        <div className="stat"><div className="k">Peak</div><div className="v mono">{usd(stats.peak)}</div></div>
        <div className="stat"><div className="k">Trough</div><div className="v mono">{usd(stats.trough)}</div></div>
        <div className="stat"><div className="k">Best roll</div><div className="v mono" style={{ color: "#34d399" }}>+{usd(stats.best)}</div></div>
        <div className="stat"><div className="k">Worst roll</div><div className="v mono" style={{ color: "#f43f5e" }}>{usd(stats.worst)}</div></div>
      </div>
      <Sparkline data={hist} />
    </div>
  );
});

export const RollLog = memo(function RollLog({ events }) {
  return (
    <div className="panel">
      <div className="small" style={{ marginBottom: 6, textTransform: "uppercase", letterSpacing: ".08em" }}>Roll log</div>
      <div className="log">{events.map((e, i) => <div key={i} className={"ev " + e.type}>{e.m}</div>)}</div>
    </div>
  );
});

const PRESETS = [
  ["pass", "Pass line"], ["dont", "Don't Pass"], ["68", "Place 6 & 8"],
  ["ironcross", "Iron Cross"], ["props", "Props (bleed)"],
];

export const PresetsPanel = memo(function PresetsPanel({ onPreset, onReset }) {
  return (
    <div className="panel">
      <div className="small" style={{ marginBottom: 8, textTransform: "uppercase", letterSpacing: ".08em" }}>Strategy presets</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {PRESETS.map(([k, l]) => (
          <button key={k} className="btn ghost" style={{ fontSize: 11, padding: "7px 11px" }} onClick={() => onPreset(k)}>{l}</button>
        ))}
      </div>
      <button className="btn ghost full" style={{ marginTop: 8, fontSize: 11 }} onClick={onReset}>Reset bankroll</button>
    </div>
  );
});
