import { memo } from "react";
import { STANCES } from "../coach.js";
import { usd } from "../util.js";

// The coach strip: stance selector, primary advice (+ optional secondary
// warning), the live exposure line, and the one-tap action.
function CoachBar({ advice, exposure, stance, onStance, on, onToggle, onAction, rolling }) {
  if (!on) return <button className="coach-restore" onClick={() => onToggle(true)}>Show coach</button>;
  if (!advice.length) return null;
  const a = advice[0];
  return (
    <div className={"coach " + a.level}>
      <div className="coach-left">
        <button className="coach-tag" onClick={() => onToggle(false)} title="Hide the coach">COACH ✕</button>
        <div className="stance-seg" role="radiogroup" aria-label="Coach stance">
          {STANCES.map((s) => (
            <button key={s.id} className={stance === s.id ? "on" : ""} onClick={() => onStance(s.id)}
              title={`${s.label} — next-7 cap ${Math.round(s.cap7 * 100)}% of stack, up to ${s.maxNumbers} numbers`}>
              {s.icon}
            </button>
          ))}
        </div>
      </div>
      <div className="coach-body">
        <div className="coach-msg">{a.msg}</div>
        {advice.length > 1 && <div className="coach-sub">{advice[1].msg}</div>}
        <div className="coach-exp mono">
          Next 7:{" "}
          <b style={{ color: exposure.seven < 0 ? "#f43f5e" : "#34d399" }}>
            {exposure.seven >= 0 ? "+" : "−"}{usd(Math.abs(exposure.seven))}
          </b>{" "}
          ({Math.round(exposure.sevenPct * 100)}% of stack · cap {Math.round(exposure.capPct * 100)}%)
          {" · "}EV/roll:{" "}
          <b style={{ color: exposure.ev < 0 ? "#fb923c" : "#34d399" }}>
            {exposure.ev >= 0 ? "+" : "−"}{usd(Math.abs(exposure.ev))}
          </b>
        </div>
      </div>
      {a.action && (
        <button className="btn coach-act" disabled={rolling} onClick={() => onAction(a.action)}>{a.action.label}</button>
      )}
    </div>
  );
}
export default memo(CoachBar);
