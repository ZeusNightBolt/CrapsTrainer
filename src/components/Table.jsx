import { useState, useRef, memo } from "react";
import { NUMBERS } from "../engine.js";
import { edgeColor, maxOddsMultiple } from "../util.js";
import { PLACE_EDGE, buyEdge, layEdge, fieldEdge } from "../bets.js";

// The betting mat — one full side of a real craps layout, drawn as tappable
// felt regions instead of a list of tiles:
//
//   ┌────┬────────────────────────────┬─────────┐
//   │ DC │  4  5  SIX  8  NINE  10    │         │
//   ├────┴────────────────────────────┤ center  │
//   │              COME               │  props  │
//   ├─────────────────────────────────┤ (hard-  │
//   │   FIELD  2 3 4 9 10 11 12       │  ways,  │
//   ├──────────────────────┬──────────┤  horn,  │
//   │  DON'T PASS BAR 12   │ lay odds │  etc.)  │
//   ├──────────────────────┼──────────┤         │
//   │      PASS LINE       │ odds     │         │
//   └──────────────────────┴──────────┴─────────┘
//
// Interactions: tap a region to add the selected chip · double-tap to take
// the whole bet down (house rules still apply — a pass line bet can't come
// down after the point is set) · tap a riding come/DC chip to put odds
// behind it. Memoized: only re-renders on real bet/phase/rules changes.
const spell = { 4: "4", 5: "5", 6: "SIX", 8: "8", 9: "NINE", 10: "10" };

function Table({ bets, phase, point, working, rules, onPlace, onClear, canPlace, onComeOdds }) {
  const [showBuyLay, setShowBuyLay] = useState(false);
  const lastTap = useRef({ path: null, t: 0 });
  const BUY_EDGE = buyEdge(rules.vigAlways);
  const LAY_EDGE = layEdge(rules.vigAlways);

  const val = (path) => {
    if (path.includes(":")) { const [g, n] = path.split(":"); return bets[g][n]; }
    return bets[path];
  };

  // tap = add the selected chip · double-tap (<320ms) = take the bet down
  const tap = (path) => {
    const now = Date.now();
    if (lastTap.current.path === path && now - lastTap.current.t < 320) {
      lastTap.current = { path: null, t: 0 };
      onClear(path);
      return;
    }
    lastTap.current = { path, t: now };
    if (canPlace ? canPlace(path) : true) onPlace(path);
  };

  const Zone = ({ path, cls = "", area, children, title }) => {
    const a = path ? val(path) : 0;
    const enabled = !path || (canPlace ? canPlace(path) : true);
    return (
      <div className={"zone " + cls + (enabled ? "" : a > 0 ? " lock" : " dis")}
        style={area ? { gridArea: area } : undefined} title={title}
        onClick={path ? () => tap(path) : undefined}
        onContextMenu={path ? (e) => { e.preventDefault(); onClear(path); } : undefined}>
        {children}
        {a > 0 && <div className="mchip mono">${a}</div>}
      </div>
    );
  };

  const NumBox = ({ n }) => {
    const isPt = point === n;
    const come = bets.comePts[n], dc = bets.dcPts[n];
    return (
      <div className={"zone numbox" + (isPt ? " pt-on" : "")} style={{ gridArea: "n" + n }}
        title={`Place the ${n} — ${PLACE_EDGE[n]}% edge`}
        onClick={() => tap("place:" + n)}
        onContextMenu={(e) => { e.preventDefault(); onClear("place:" + n); }}>
        {isPt && <div className="puckdot" title={`The point is ${n}`}>ON</div>}
        <div className="numeral">{spell[n]}</div>
        {dc > 0 && (
          <button className="ridechip dc mono" title={`Don't Come $${dc} on ${n} — tap for lay odds`}
            onClick={(e) => { e.stopPropagation(); onComeOdds("dc", n); }}>
            DC {dc}{bets.dcOdds[n] > 0 ? `+${bets.dcOdds[n]}` : ""}
          </button>
        )}
        {come > 0 && (
          <button className="ridechip come mono" title={`Come $${come} on ${n} — tap to add odds`}
            onClick={(e) => { e.stopPropagation(); onComeOdds("come", n); }}>
            C {come}{bets.comeOdds[n] > 0 ? `+${bets.comeOdds[n]}` : ""}
          </button>
        )}
        {bets.place[n] > 0 && <div className="mchip mono place">${bets.place[n]}</div>}
      </div>
    );
  };

  const Prop = ({ path, label, pays, edge, cls = "" }) => (
    <Zone path={path} cls={"prop " + cls} title={`${label} — pays ${pays}, ${edge}% edge`}>
      <span className="pl">{label}</span>
      <span className="pp mono" style={{ color: edgeColor(edge) }}>{pays}</span>
    </Zone>
  );

  const oddsOk = phase === "point";

  return (
    <div className="feltwrap">
      <div className="mat">
        <Zone path="dontcome" cls="dcbox" area="dc" title="Don't Come — 1.36% edge">
          <span className="vlabel">DON'T COME</span>
        </Zone>

        {NUMBERS.map((n) => <NumBox key={n} n={n} />)}

        <Zone path="come" cls="comeband" area="come" title="Come — 1.41% edge, travels to the number rolled">
          <span className="bigband">COME</span>
          <span className="bandsub">7/11 wins · 2/3/12 loses · numbers travel</span>
        </Zone>

        <Zone path="field" cls="fieldband" area="field"
          title={`Field — one roll, ${fieldEdge(rules.fieldTriple)}% edge, 12 pays ${rules.fieldTriple ? "3:1" : "2:1"}`}>
          <span className="fl">FIELD</span>
          <span className="fnums mono">
            <b className="circ">2</b> 3 4 9 10 11 <b className="circ">12</b>
          </span>
          <span className="bandsub">2 pays double · 12 pays {rules.fieldTriple ? "triple" : "double"}</span>
        </Zone>

        <Zone path="dontpass" cls="dpband" area="dp" title="Don't Pass — 1.36% edge, bar 12">
          <span className="fl">DON'T PASS BAR</span><span className="bar12 mono">12</span>
        </Zone>
        <Zone path="dpodds" cls="oddszone" area="dpo" title="Lay odds behind Don't Pass — 0% edge">
          <span className="pl">{oddsOk && bets.dontpass > 0 ? "LAY ODDS 0%" : "lay odds"}</span>
        </Zone>

        <Zone path="passline" cls="passband" area="pass" title="Pass Line — 1.41% edge">
          <span className="bigband">PASS LINE</span>
        </Zone>
        <Zone path="passodds" cls="oddszone" area="po"
          title={`Odds behind the line — 0% edge, max ${maxOddsMultiple(point || 6, rules.oddsMode)}x here`}>
          <span className="pl">{oddsOk && bets.passline > 0 ? "ODDS 0% FREE" : "odds"}</span>
        </Zone>

        <div className="propscol" style={{ gridArea: "props" }}>
          <div className="propshead">— CENTER —</div>
          <div className="proppair">
            <Prop path="hard:6" label="HARD 6" pays="9:1" edge={9.09} />
            <Prop path="hard:8" label="HARD 8" pays="9:1" edge={9.09} />
          </div>
          <div className="proppair">
            <Prop path="hard:4" label="HARD 4" pays="7:1" edge={11.11} />
            <Prop path="hard:10" label="HARD 10" pays="7:1" edge={11.11} />
          </div>
          <Prop path="any7" label="ANY SEVEN" pays="4:1" edge={16.67} cls="wide worst" />
          <div className="proppair">
            <Prop path="aces" label="ACES" pays="30:1" edge={13.89} />
            <Prop path="boxcars" label="12" pays="30:1" edge={13.89} />
          </div>
          <div className="proppair">
            <Prop path="aceDeuce" label="ACE·2" pays="15:1" edge={11.11} />
            <Prop path="yo" label="YO 11" pays="15:1" edge={11.11} />
          </div>
          <Prop path="anycraps" label="ANY CRAPS" pays="7:1" edge={11.11} cls="wide" />
          <div className="proppair">
            <Prop path="horn" label="HORN" pays="÷4" edge={12.5} />
            <Prop path="ce" label="C & E" pays="÷2" edge={11.11} />
          </div>
          <Prop path="world" label="WORLD" pays="÷5" edge={13.33} cls="wide" />
        </div>
      </div>

      <div className="mat-hints small">
        Tap a region to bet the selected chip · <b>double-tap takes the bet down</b> · tap a riding C/DC chip to
        back it with odds{phase === "comeout" && !working ? " · place bets are OFF on the come-out" : ""}
      </div>

      <button className="expander" onClick={() => setShowBuyLay(!showBuyLay)}>
        {showBuyLay ? "▾" : "▸"} Buy & Lay (true odds − 5% vig) — advanced
      </button>
      {showBuyLay && (
        <div className="buylay">
          {NUMBERS.map((n) => (
            <Zone key={"b" + n} path={"buy:" + n} cls="prop" title={`Buy ${n} — ${BUY_EDGE[n].toFixed(2)}%`}>
              <span className="pl">BUY {n}</span>
              <span className="pp mono" style={{ color: edgeColor(BUY_EDGE[n]) }}>{BUY_EDGE[n].toFixed(2)}%</span>
            </Zone>
          ))}
          {NUMBERS.map((n) => (
            <Zone key={"l" + n} path={"lay:" + n} cls="prop" title={`Lay ${n} — ${LAY_EDGE[n].toFixed(2)}%`}>
              <span className="pl">LAY {n}</span>
              <span className="pp mono" style={{ color: edgeColor(LAY_EDGE[n]) }}>{LAY_EDGE[n].toFixed(2)}%</span>
            </Zone>
          ))}
        </div>
      )}
    </div>
  );
}

export default memo(Table);
