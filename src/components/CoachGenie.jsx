import { memo } from "react";
import { usd } from "../util.js";

// The Coach genie — a floating chat-help bubble in the bottom-right corner.
// Tap it to open a chat-style panel where the genie reads the felt and
// explains the logic of what's bet and what to do next. Purely advisory:
// no amounts, no buttons that place bets. A badge on the lamp signals when
// there's something worth reading (gold = a smart move, red = a leak).
function CoachGenie({ insights, exposure, open, onToggle }) {
  const hasDo = insights.some((i) => i.level === "do");
  const hasWarn = insights.some((i) => i.level === "warn");
  const badge = hasWarn ? "warn" : hasDo ? "do" : null;

  return (
    <div className="genie-root">
      {open && (
        <div className="genie-panel" role="dialog" aria-label="Coach">
          <div className="genie-head">
            <span className="genie-title"><span className="genie-emoji">🧞</span> Coach</span>
            <button className="genie-close" onClick={() => onToggle(false)} aria-label="Close coach">✕</button>
          </div>
          <div className="genie-scroll">
            {insights.map((it, i) => (
              <div key={i} className={"bubble " + it.level}>
                <span dangerouslySetInnerHTML={{ __html: it.msg }} />
              </div>
            ))}
          </div>
          <div className="genie-foot mono">
            {exposure.seven < 0
              ? <>A <b>7</b> right now would cost <b style={{ color: "#f43f5e" }}>{usd(Math.abs(exposure.seven))}</b> — that's your board exposure.</>
              : <>Nothing on the numbers to lose to a <b>7</b> yet.</>}
          </div>
        </div>
      )}
      <button className={"genie-fab" + (badge ? " " + badge : "") + (open ? " open" : "")}
        onClick={() => onToggle(!open)} aria-label={open ? "Close coach" : "Open coach"}>
        <span className="genie-fab-icon">{open ? "✕" : "🧞"}</span>
        {!open && badge && <span className={"genie-dot " + badge} />}
      </button>
    </div>
  );
}

export default memo(CoachGenie);
