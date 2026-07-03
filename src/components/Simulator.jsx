import { useState } from "react";
import { resolve, newGame, NUMBERS, LAY_ODDS, totalWagered } from "../engine.js";
import { maxOddsMultiple, usd } from "../util.js";

// Each strategy is just a `beforeRoll(g, unit, rules)` mutator that inspects
// the live game state and tops up whatever bets a real player following that
// strategy would have on the table before the next roll. Running these
// through the same verified `resolve()` used by the interactive Table means
// the simulator can't drift from the engine's payout math.
const STRATEGIES = [
  {
    id: "passOdds", label: "Pass Line + Max Odds",
    beforeRoll(g, unit, rules) {
      const b = g.bets;
      if (g.phase === "comeout" && b.passline === 0 && g.bankroll >= unit) { b.passline += unit; g.bankroll -= unit; }
      if (g.phase === "point" && b.passline > 0 && b.passodds === 0) {
        const want = b.passline * maxOddsMultiple(g.point, rules.oddsMode);
        if (g.bankroll >= want) { b.passodds += want; g.bankroll -= want; }
      }
    },
  },
  {
    id: "dontLay", label: "Don't Pass + Max Lay",
    beforeRoll(g, unit, rules) {
      const b = g.bets;
      if (g.phase === "comeout" && b.dontpass === 0 && g.bankroll >= unit) { b.dontpass += unit; g.bankroll -= unit; }
      if (g.phase === "point" && b.dontpass > 0 && b.dpodds === 0) {
        const mult = maxOddsMultiple(g.point, rules.oddsMode);
        const want = Math.round((b.dontpass * mult) / LAY_ODDS[g.point]);
        if (g.bankroll >= want) { b.dpodds += want; g.bankroll -= want; }
      }
    },
  },
  {
    id: "molly", label: "3-Point Molly (Pass + 2 Come, max odds)",
    beforeRoll(g, unit, rules) {
      const b = g.bets;
      if (g.phase === "comeout" && b.passline === 0 && g.bankroll >= unit) { b.passline += unit; g.bankroll -= unit; }
      if (g.phase === "point") {
        if (b.passline > 0 && b.passodds === 0) {
          const want = b.passline * maxOddsMultiple(g.point, rules.oddsMode);
          if (g.bankroll >= want) { b.passodds += want; g.bankroll -= want; }
        }
        const active = NUMBERS.filter((n) => b.comePts[n] > 0).length;
        if (b.come === 0 && active < 2 && g.bankroll >= unit) { b.come += unit; g.bankroll -= unit; }
        for (const n of NUMBERS) {
          if (b.comePts[n] > 0 && b.comeOdds[n] === 0) {
            const want = b.comePts[n] * maxOddsMultiple(n, rules.oddsMode);
            if (g.bankroll >= want) { b.comeOdds[n] += want; g.bankroll -= want; }
          }
        }
      }
    },
  },
  {
    id: "place68", label: "Place 6 & 8",
    beforeRoll(g, unit) {
      const b = g.bets, u = Math.max(6, Math.round(unit / 6) * 6);
      if (b.place[6] === 0 && g.bankroll >= u) { b.place[6] += u; g.bankroll -= u; }
      if (b.place[8] === 0 && g.bankroll >= u) { b.place[8] += u; g.bankroll -= u; }
    },
  },
  {
    id: "ironCross", label: "Iron Cross (Place 5/6/8 + Field)",
    beforeRoll(g, unit) {
      const b = g.bets, u2 = Math.round(unit * 1.2);
      if (b.place[5] === 0 && g.bankroll >= unit) { b.place[5] += unit; g.bankroll -= unit; }
      if (b.place[6] === 0 && g.bankroll >= u2) { b.place[6] += u2; g.bankroll -= u2; }
      if (b.place[8] === 0 && g.bankroll >= u2) { b.place[8] += u2; g.bankroll -= u2; }
      if (g.bankroll >= unit) { b.field += unit; g.bankroll -= unit; }
    },
  },
  {
    id: "anySeven", label: "Any Seven every roll (worst-case demo)",
    beforeRoll(g, unit) {
      if (g.bankroll >= unit) { g.bets.any7 += unit; g.bankroll -= unit; }
    },
  },
];

// Cashes out at face value any bets still on the table when the session ends
// (a real player can always pick up their chips). Without this, stopping
// mid-shooter with, say, a big odds bet outstanding would understate the
// player's true net worth by whatever's currently at risk, and skew the
// distribution — especially at high odds multiples where a lot can be riding
// on a single unresolved point.
function runSession(strategy, unit, rules, startBankroll, maxRolls) {
  let g = newGame(startBankroll);
  for (let i = 0; i < maxRolls; i++) {
    strategy.beforeRoll(g, unit, rules);
    if (g.bankroll < unit && totalWagered(g.bets) === 0) break; // busted, nothing left to bet
    const d1 = 1 + Math.floor(Math.random() * 6), d2 = 1 + Math.floor(Math.random() * 6);
    const out = resolve(g, d1, d2, rules);
    g = out.state;
  }
  return g.bankroll + totalWagered(g.bets);
}

function quantile(sorted, q) {
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos), rest = pos - base;
  return sorted[base + 1] !== undefined ? sorted[base] + rest * (sorted[base + 1] - sorted[base]) : sorted[base];
}

export default function Simulator({ rules }) {
  const [stratId, setStratId] = useState("passOdds");
  const [unit, setUnit] = useState(25);
  const [startBankroll, setStartBankroll] = useState(1000);
  const [rolls, setRolls] = useState(100);
  const [trials, setTrials] = useState(2000);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);

  const strategy = STRATEGIES.find((s) => s.id === stratId);

  function run() {
    setRunning(true);
    setTimeout(() => {
      const outcomes = new Array(trials);
      for (let i = 0; i < trials; i++) outcomes[i] = runSession(strategy, unit, rules, startBankroll, rolls);
      const sorted = [...outcomes].sort((a, b) => a - b);
      const mean = outcomes.reduce((a, v) => a + v, 0) / trials;
      const variance = outcomes.reduce((a, v) => a + (v - mean) ** 2, 0) / trials;
      const ahead = outcomes.filter((v) => v > startBankroll).length / trials;
      const busted = outcomes.filter((v) => v <= 0).length / trials;
      const min = sorted[0], max = sorted[sorted.length - 1];
      const buckets = 24;
      const span = Math.max(1, max - min);
      const hist = new Array(buckets).fill(0);
      for (const v of outcomes) hist[Math.min(buckets - 1, Math.floor(((v - min) / span) * buckets))]++;
      setResult({
        mean, sd: Math.sqrt(variance), median: quantile(sorted, 0.5),
        p5: quantile(sorted, 0.05), p25: quantile(sorted, 0.25), p75: quantile(sorted, 0.75), p95: quantile(sorted, 0.95),
        ahead, busted, min, max, hist, bucketWidth: span / buckets,
      });
      setRunning(false);
    }, 20);
  }

  return (
    <div>
      <div className="panel" style={{ marginBottom: 14 }}>
        <div className="small" style={{ marginBottom: 8, textTransform: "uppercase", letterSpacing: ".08em" }}>
          Strategy Monte-Carlo simulator
        </div>
        <p className="small" style={{ lineHeight: 1.6, marginBottom: 10 }}>
          Runs thousands of independent sessions through the same verified engine the Table uses, so you can see the
          real spread of outcomes — not just the headline house-edge percentage. Every strategy here loses on average;
          the question this answers is how much variance you're buying for that loss.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
          {STRATEGIES.map((s) => (
            <button key={s.id} className={"btn ghost" + (stratId === s.id ? " on" : "")} style={{ fontSize: 11, padding: "7px 11px" }}
              onClick={() => setStratId(s.id)}>{s.label}</button>
          ))}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
          <label className="small">Unit size
            <div><input className="mono" type="number" min="1" value={unit} onChange={(e) => setUnit(+e.target.value || 1)} style={inputStyle} /></div>
          </label>
          <label className="small">Starting bankroll
            <div><input className="mono" type="number" min="1" value={startBankroll} onChange={(e) => setStartBankroll(+e.target.value || 1)} style={inputStyle} /></div>
          </label>
          <label className="small">Rolls per session
            <div><input className="mono" type="number" min="1" max="2000" value={rolls} onChange={(e) => setRolls(+e.target.value || 1)} style={inputStyle} /></div>
          </label>
          <label className="small">Sessions to simulate
            <div><input className="mono" type="number" min="100" max="20000" value={trials} onChange={(e) => setTrials(+e.target.value || 100)} style={inputStyle} /></div>
          </label>
          <div style={{ alignSelf: "flex-end" }}>
            <button className="btn primary" onClick={run} disabled={running}>{running ? "Simulating…" : "Run simulation"}</button>
          </div>
        </div>
      </div>

      {result && (
        <>
          <div className="panel" style={{ marginBottom: 14 }}>
            <div className="small" style={{ marginBottom: 8, textTransform: "uppercase", letterSpacing: ".08em" }}>
              {trials.toLocaleString()} sessions × {rolls} rolls — {strategy.label}
            </div>
            <div className="stats" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
              <div className="stat"><div className="k">Mean ending bankroll</div><div className="v mono" style={{ color: result.mean >= startBankroll ? "#34d399" : "#f43f5e" }}>{usd(result.mean)}</div></div>
              <div className="stat"><div className="k">Median</div><div className="v mono">{usd(result.median)}</div></div>
              <div className="stat"><div className="k">Std deviation</div><div className="v mono">{usd(result.sd)}</div></div>
              <div className="stat"><div className="k">% sessions ahead</div><div className="v mono">{(result.ahead * 100).toFixed(1)}%</div></div>
              <div className="stat"><div className="k">5th percentile</div><div className="v mono" style={{ color: "#f43f5e" }}>{usd(result.p5)}</div></div>
              <div className="stat"><div className="k">25th percentile</div><div className="v mono">{usd(result.p25)}</div></div>
              <div className="stat"><div className="k">75th percentile</div><div className="v mono">{usd(result.p75)}</div></div>
              <div className="stat"><div className="k">95th percentile</div><div className="v mono" style={{ color: "#34d399" }}>{usd(result.p95)}</div></div>
            </div>
            <div className="small" style={{ marginTop: 8 }}>
              Worst session: <span className="mono">{usd(result.min)}</span> · Best session: <span className="mono">{usd(result.max)}</span> ·
              Busted (≤ $0): <span className="mono">{(result.busted * 100).toFixed(1)}%</span>
            </div>
            <div className="small" style={{ marginTop: 4 }}>
              "Ending bankroll" cashes out any bets still on the table at face value when the roll count is hit,
              so an odds bet mid-point doesn't get counted as a loss just because the session stopped there.
            </div>
          </div>

          <div className="panel">
            <div className="small" style={{ marginBottom: 8, textTransform: "uppercase", letterSpacing: ".08em" }}>
              Distribution of ending bankrolls
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 140 }}>
              {result.hist.map((count, i) => {
                const h = Math.max(2, (count / Math.max(...result.hist)) * 140);
                const val = result.min + i * result.bucketWidth;
                const isProfit = val >= startBankroll;
                return <div key={i} title={usd(val)} style={{ flex: 1, height: h, background: isProfit ? "#34d399" : "#f43f5e", opacity: .8, borderRadius: "2px 2px 0 0" }} />;
              })}
            </div>
            <div className="small" style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
              <span>{usd(result.min)}</span>
              <span>starting bankroll {usd(startBankroll)}</span>
              <span>{usd(result.max)}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const inputStyle = {
  background: "var(--panel-2)", border: "1px solid var(--line-2)", borderRadius: 7,
  color: "var(--ink)", padding: "6px 8px", width: 90, marginTop: 4, fontSize: 12,
};
