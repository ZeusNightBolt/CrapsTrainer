import { memo } from "react";

const TOTALS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const fmt = (v) => {
  const a = Math.abs(v);
  const s = a >= 100 ? Math.round(a).toString() : (Math.round(a * 100) / 100).toString();
  return (v > 0 ? "+" : v < 0 ? "−" : "") + s;
};

// Per-total P&L for the next roll, straight from the engine (outcomes.js) —
// the "what does each number do to me" readout. Opacity tracks probability,
// so the 7's cell reads loudest.
function NextRoll({ outcomes, hasBets }) {
  return (
    <div className="panel">
      <div className="small" style={{ marginBottom: 8, textTransform: "uppercase", letterSpacing: ".08em" }}>
        Next roll — net P&L by total
      </div>
      {!hasBets ? (
        <div className="small">Put chips on the felt to see what every total does to your stack.</div>
      ) : (
        <>
          <div className="nextroll">
            {TOTALS.map((t) => {
              const o = outcomes.byTotal[t];
              const v = o.avg;
              const cls = v > 0 ? " up" : v < 0 ? " down" : "";
              return (
                <div key={t} className={"oc" + cls} style={{ opacity: 0.55 + o.prob * 2.4 }}
                  title={`${t}: ${fmt(v)}${o.min !== o.max ? ` (range ${fmt(o.min)} to ${fmt(o.max)})` : ""} · P=${o.n}/36`}>
                  <div className="t mono">{t}</div>
                  <div className="v mono">{fmt(v)}{o.min !== o.max ? "~" : ""}</div>
                </div>
              );
            })}
          </div>
          <div className="small" style={{ marginTop: 6 }}>
            Dollars, engine-computed. Brighter = more likely. "~" = hardway combos split this total.
          </div>
        </>
      )}
    </div>
  );
}
export default memo(NextRoll);
