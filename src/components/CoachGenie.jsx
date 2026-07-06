import { memo, useState, useEffect, useMemo } from "react";
import { usd } from "../util.js";
import { getRollRecap } from "../coach.js";

// The Coach genie — a floating chat-help bubble in the bottom-right corner.
// Two jobs:
//   • BEFORE a roll it reads the felt and explains the logic (advisory only —
//     no amounts, no bets placed for you).
//   • AFTER a roll it pops a playful speech bubble narrating what the dice did
//     and teaching *why* (the 7 is the most common roll, what a natural is,
//     which bets that number pays…), and keeps the full recap in the panel.
function CoachGenie({ insights, exposure, lastRoll, rules, read, onForget, suppressBubble, open, onToggle }) {
  const recap = useMemo(() => getRollRecap(lastRoll, rules), [lastRoll, rules]);

  // transient speech bubble: shows after each roll, auto-dismisses, and is
  // replaced by the next roll. Opening the panel clears it.
  const [bubbleId, setBubbleId] = useState(null);
  useEffect(() => {
    if (!recap) return;
    setBubbleId(recap.id);
    const t = setTimeout(() => setBubbleId((id) => (id === recap.id ? null : id)), 7000);
    return () => clearTimeout(t);
  }, [recap]);
  useEffect(() => { if (open) setBubbleId(null); }, [open]);

  const bubbleShown = !suppressBubble && !open && bubbleId && recap && bubbleId === recap.id;
  const hasDo = insights.some((i) => i.level === "do");
  const hasWarn = insights.some((i) => i.level === "warn");
  const badge = bubbleShown ? recap.level === "win" ? "do" : recap.level === "lose" ? "warn" : "do"
    : hasWarn ? "warn" : hasDo ? "do" : null;

  const Recap = () => (
    <div className={"recap " + recap.level}>
      <div className="recap-top">
        <span className="recap-title">{recap.title}</span>
        {recap.delta !== 0 && (
          <span className={"recap-delta " + (recap.delta > 0 ? "up" : "down")}>
            {recap.delta > 0 ? "+" : "−"}{usd(Math.abs(recap.delta))}
          </span>
        )}
      </div>
      {recap.outcomes.length > 0 && (
        <div className="recap-outcomes">
          {recap.outcomes.map((o, i) => (
            <span key={i} className={"oc-line " + o.level}>
              {o.level === "win" ? "✓" : o.level === "push" ? "↺" : "✗"} {o.msg}
            </span>
          ))}
        </div>
      )}
      <div className="recap-teach" dangerouslySetInnerHTML={{ __html: recap.teach }} />
      {recap.pays.length > 0 && (
        <div className="recap-pays">This number pays: <b>{recap.pays.join(" · ")}</b></div>
      )}
    </div>
  );

  // "What I've learned about how you play" — a compact read of the persistent
  // player profile (coachMemory.js). Shows your favourite bet, how your action
  // is split, and the expected cost the math attaches to each lane.
  const Memory = ({ read, onForget }) => {
    const top = read.entries.slice(0, 4);
    return (
      <div className="genie-mem">
        <div className="mem-head">
          <span className="mem-title">🧠 What I've learned about you</span>
          <button className="mem-forget" onClick={onForget} title="Erase the coach's memory of your betting history">forget</button>
        </div>
        <div className="mem-stat mono small">
          {read.rolls} rolls tracked · net <b className={read.net >= 0 ? "up" : "down"}>{read.net >= 0 ? "+" : "−"}{usd(Math.abs(read.net))}</b>
          {read.totalStaked > 0 && <> · blended edge <b>{read.blendedEdge.toFixed(2)}%</b></>}
        </div>
        {read.favorite && (
          <div className="mem-fav small">Favourite bet: <b>{read.favorite.label}</b> — {usd(read.favorite.staked)} wagered</div>
        )}
        {top.length > 0 && (
          <div className="mem-bars">
            {top.map((e) => {
              const frac = read.totalStaked > 0 ? e.staked / read.totalStaked : 0;
              return (
                <div key={e.id} className="mem-row" title={`Expected house edge cost so far: ${usd(e.drag)}`}>
                  <span className="mem-lbl small">{e.label}</span>
                  <span className="mem-track"><span className={"mem-fill tier-" + e.tier} style={{ width: Math.max(4, frac * 100) + "%" }} /></span>
                  <span className="mem-drag mono small">−{usd(e.drag)}</span>
                </div>
              );
            })}
          </div>
        )}
        <div className="mem-foot small">Bars = share of your action · <b>−$</b> = expected house-edge cost on that lane. I use this to tailor the advice above.</div>
      </div>
    );
  };

  return (
    <div className="genie-root">
      {open && (
        <div className="genie-panel" role="dialog" aria-label="Coach">
          <div className="genie-head">
            <span className="genie-title"><span className="genie-emoji">🧞</span> Coach</span>
            <button className="genie-close" onClick={() => onToggle(false)} aria-label="Close coach">✕</button>
          </div>
          <div className="genie-scroll">
            {recap && <Recap />}
            {recap && <div className="genie-divider">— what now —</div>}
            {insights.map((it, i) => (
              <div key={i} className={"bubble " + it.level}>
                <span dangerouslySetInnerHTML={{ __html: it.msg }} />
              </div>
            ))}
            {read && read.rolls > 0 && <Memory read={read} onForget={onForget} />}
          </div>
          <div className="genie-foot mono">
            {exposure.seven < 0
              ? <>A <b>7</b> right now would cost <b style={{ color: "#f43f5e" }}>{usd(Math.abs(exposure.seven))}</b> — your board exposure.</>
              : <>Nothing on the numbers to lose to a <b>7</b> yet.</>}
          </div>
        </div>
      )}

      {/* transient post-roll speech bubble */}
      {bubbleShown && (
        <button className={"genie-speech " + recap.level} onClick={() => onToggle(true)}>
          <span className="sp-title">{recap.title}
            {recap.delta !== 0 && <b className={recap.delta > 0 ? "up" : "down"}> {recap.delta > 0 ? "+" : "−"}{usd(Math.abs(recap.delta))}</b>}
          </span>
          <span className="sp-teach" dangerouslySetInnerHTML={{ __html: recap.teach }} />
          <span className="sp-more">tap for the full read →</span>
        </button>
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
