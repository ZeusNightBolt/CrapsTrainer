import { memo, useState, useEffect, useMemo } from "react";
import { usd } from "../util.js";
import { getRollRecap } from "../coach.js";
import { NUMBERS } from "../engine.js";

const PIP = ["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];

// A short, punchy event label for the card's banner — the "what just happened"
// in two words, derived from the same roll context the coach uses.
function eventLabel(lr) {
  if (!lr) return "";
  const { total: t, prevPhase, sevenOut, madePoint } = lr;
  if (sevenOut) return "Seven-out";
  if (madePoint) return "Point made!";
  if (prevPhase === "comeout" && (t === 7 || t === 11)) return `Natural ${t}`;
  if (prevPhase === "comeout" && [2, 3, 12].includes(t)) return `Craps ${t}`;
  if (prevPhase === "comeout" && NUMBERS.includes(t)) return `Point is ${t}`;
  if (prevPhase === "point" && NUMBERS.includes(t)) return `${t} rolls`;
  return `${t}`;
}

// The summary recap flash card — the headline win/loss moment after every roll.
// It slides in over the table, states the net result big and clear, shows the
// dice, lists which bets won and lost, drops the coach's one-line teach, then
// auto-dismisses (tap to dismiss early). Distinct from the genie: this is the
// scoreboard, the genie is the tutor.
function RollResultCard({ lastRoll, rules }) {
  const recap = useMemo(() => getRollRecap(lastRoll, rules), [lastRoll, rules]);
  const [shown, setShown] = useState(null); // recap.id currently on screen

  useEffect(() => {
    if (!recap) return;
    setShown(recap.id);
    const t = setTimeout(() => setShown((id) => (id === recap.id ? null : id)), 4200);
    return () => clearTimeout(t);
  }, [recap]);

  if (!recap || shown !== recap.id) return null;

  const { d1, d2, total, delta } = lastRoll;
  const { level, outcomes, teach } = recap; // recap carries the classified result lines + teach nugget
  const isHard = d1 === d2;
  const wins = outcomes.filter((o) => o.level === "win");
  const losses = outcomes.filter((o) => o.level === "lose");
  const pushes = outcomes.filter((o) => o.level === "push");
  const result = delta > 0 ? "WIN" : delta < 0 ? "LOSS" : "PUSH";

  return (
    <div className="rrc-wrap" onClick={() => setShown(null)}>
      <div key={recap.id} className={"rrc " + level} role="status" aria-live="polite">
        <div className="rrc-accent" />
        <div className="rrc-head">
          <div className="rrc-dice" aria-hidden="true">
            <span className={"rrc-die" + (isHard ? " hard" : "")}>{PIP[d1]}</span>
            <span className={"rrc-die" + (isHard ? " hard" : "")}>{PIP[d2]}</span>
            <span className="rrc-eq mono">= {total}{isHard ? " ·hard" : ""}</span>
          </div>
          <div className={"rrc-badge " + level}>{result}</div>
        </div>

        <div className="rrc-mid">
          <div className="rrc-event">{eventLabel(lastRoll)}</div>
          <div className={"rrc-amt mono " + (delta > 0 ? "up" : delta < 0 ? "down" : "flat")}>
            {delta > 0 ? "+" : delta < 0 ? "−" : ""}{delta === 0 ? "no change" : usd(Math.abs(delta))}
          </div>
        </div>

        {(wins.length > 0 || losses.length > 0 || pushes.length > 0) && (
          <div className="rrc-lines">
            {wins.map((o, i) => <span key={"w" + i} className="rrc-line win">✓ {o.msg}</span>)}
            {pushes.map((o, i) => <span key={"p" + i} className="rrc-line push">↺ {o.msg}</span>)}
            {losses.map((o, i) => <span key={"l" + i} className="rrc-line lose">✗ {o.msg}</span>)}
          </div>
        )}

        <div className="rrc-teach" dangerouslySetInnerHTML={{ __html: teach }} />
        <div className="rrc-timer"><span /></div>
      </div>
    </div>
  );
}

export default memo(RollResultCard);
