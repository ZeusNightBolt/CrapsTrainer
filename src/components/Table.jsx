import { useState } from "react";
import { NUMBERS } from "../engine.js";
import { edgeColor, maxOddsMultiple } from "../util.js";
import { PLACE_EDGE, buyEdge, layEdge, fieldEdge } from "../bets.js";

const oddsLabel = (n) => ([4, 10].includes(n) ? "2:1" : [5, 9].includes(n) ? "3:2" : "6:5");
const layLabel = (n) => ([4, 10].includes(n) ? "1:2" : [5, 9].includes(n) ? "2:3" : "5:6");

export default function Table({ bets, phase, point, working, rules, onPlace, onClear, canPlace, onComeOdds }) {
  const [showBuyLay, setShowBuyLay] = useState(false);
  const BUY_EDGE = buyEdge(rules.vigAlways);
  const LAY_EDGE = layEdge(rules.vigAlways);

  const amt = (path) => {
    if (path.includes(":")) { const [g, n] = path.split(":"); return bets[g][n]; }
    return bets[path];
  };
  const tap = (path) => onPlace(path); // add/remove handled upstream via mode
  const hold = (e, path) => { e.preventDefault(); onClear(path); };

  const Tile = ({ path, label, edge, sub, ok = true }) => {
    const a = amt(path);
    const enabled = ok && (canPlace ? canPlace(path) : true);
    return (
      <div className={"tile" + (enabled ? "" : " dis")} onClick={() => enabled && tap(path)}
        onContextMenu={(e) => hold(e, path)}
        style={{ borderColor: a ? edgeColor(edge) : "var(--line-2)" }}>
        <div>
          <div className="tn">{label}</div>
          <div className="te mono" style={{ color: edgeColor(edge) }}>
            {edge === 0 ? "0% edge" : edge.toFixed(2) + "%"}{sub ? " · " + sub : ""}
          </div>
        </div>
        {a > 0 && <div className="amt mono" style={{ color: edgeColor(edge) }}>${a}</div>}
      </div>
    );
  };

  const NumTile = ({ n }) => {
    const a = bets.place[n];
    const isPt = point === n;
    const e = PLACE_EDGE[n];
    return (
      <div className="tile num" onClick={() => onPlace("place:" + n)} onContextMenu={(e2) => hold(e2, "place:" + n)}
        style={{ borderColor: isPt ? "#34d399" : a ? edgeColor(e) : "var(--line-2)" }}>
        {isPt && <div className="pt">PT</div>}
        <div className="big mono">{n}</div>
        <div className="te mono" style={{ color: edgeColor(e) }}>{e}%</div>
        {a > 0 && <div className="amt mono" style={{ color: edgeColor(e) }}>${a}</div>}
      </div>
    );
  };

  const travel = [];
  for (const n of NUMBERS) {
    if (bets.comePts[n] > 0) travel.push({ side: "come", n, flat: bets.comePts[n], odds: bets.comeOdds[n] });
    if (bets.dcPts[n] > 0) travel.push({ side: "dc", n, flat: bets.dcPts[n], odds: bets.dcOdds[n] });
  }

  return (
    <div className="felt">
      <div className="sec">Line bets — bet with (Pass) or against (Don't) the shooter</div>
      <div className="tiles g4">
        <Tile path="passline" label="PASS LINE" edge={1.41} />
        <Tile path="dontpass" label="DON'T PASS" edge={1.36} />
        <Tile path="come" label="COME" edge={1.41} />
        <Tile path="dontcome" label="DON'T COME" edge={1.36} />
      </div>

      <div className="sec">Free odds — 0% edge, requires a line bet · point {point || "not set"} · max {maxOddsMultiple(point || 6, rules.oddsMode)}x</div>
      <div className="tiles g2">
        <Tile path="passodds" label="PASS ODDS (free)" edge={0}
          sub={phase === "point" && bets.passline ? "pays " + oddsLabel(point) : "needs Pass + point"} />
        <Tile path="dpodds" label="LAY ODDS (free)" edge={0}
          sub={phase === "point" && bets.dontpass ? "lay " + layLabel(point) : "needs Don't + point"} />
      </div>

      {travel.length > 0 && (
        <>
          <div className="sec">Traveling come bets</div>
          <div className="travel">
            {travel.map((t, i) => (
              <div className="trav" key={i}>
                <b>{t.side === "come" ? "Come" : "Don't"} {t.n}</b>
                <span className="mono">${t.flat}{t.odds ? ` +$${t.odds} odds` : ""}</span>
                <button className="odds-btn" onClick={() => onComeOdds(t.side, t.n)}>+odds</button>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="sec">
        Place numbers
        {phase === "comeout" && !working && <span className="warn">· OFF on come-out</span>}
      </div>
      <div className="tiles g6">
        {NUMBERS.map((n) => <NumTile key={n} n={n} />)}
      </div>

      <button className="expander" style={{ marginTop: 12 }} onClick={() => setShowBuyLay(!showBuyLay)}>
        {showBuyLay ? "▾" : "▸"} Buy & Lay (true odds − 5% vig) — advanced
      </button>
      {showBuyLay && (
        <>
          <div className="sec">Buy — true odds minus vig (only worth it on 4 / 10)</div>
          <div className="tiles g6">
            {NUMBERS.map((n) => <Tile key={n} path={"buy:" + n} label={"BUY " + n} edge={BUY_EDGE[n]} />)}
          </div>
          <div className="sec">Lay — bet the 7 comes before the number (wrong-way)</div>
          <div className="tiles g6">
            {NUMBERS.map((n) => <Tile key={n} path={"lay:" + n} label={"LAY " + n} edge={LAY_EDGE[n]} />)}
          </div>
        </>
      )}

      <div className="sec">Hardways <span className="warn">· high edge</span></div>
      <div className="tiles g4">
        <Tile path="hard:4" label="HARD 4" edge={11.11} sub="7:1" />
        <Tile path="hard:6" label="HARD 6" edge={9.09} sub="9:1" />
        <Tile path="hard:8" label="HARD 8" edge={9.09} sub="9:1" />
        <Tile path="hard:10" label="HARD 10" edge={11.11} sub="7:1" />
      </div>

      <div className="sec">Field & one-roll props <span className="warn">· the sucker row</span></div>
      <div className="tiles g4">
        <Tile path="field" label="FIELD" edge={fieldEdge(rules.fieldTriple)} sub={rules.fieldTriple ? "12 pays 3:1" : "12 pays 2:1"} />
        <Tile path="any7" label="ANY SEVEN" edge={16.67} sub="4:1 · worst bet" />
        <Tile path="anycraps" label="ANY CRAPS" edge={11.11} sub="7:1" />
        <Tile path="yo" label="YO (11)" edge={11.11} sub="15:1" />
        <Tile path="aceDeuce" label="ACE-DEUCE (3)" edge={11.11} sub="15:1" />
        <Tile path="aces" label="ACES (2)" edge={13.89} sub="30:1" />
        <Tile path="boxcars" label="BOXCARS (12)" edge={13.89} sub="30:1" />
        <Tile path="horn" label="HORN" edge={12.5} sub="4-way, $4 units" />
        <Tile path="ce" label="C & E" edge={11.11} sub="craps + 11" />
        <Tile path="world" label="WORLD / WHIRL" edge={13.33} sub="5-way, $5 units" />
      </div>
    </div>
  );
}
