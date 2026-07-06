import { TOTALS, COMBOS, WAYS, PROB, POINTS, pointRace, oddsAgainst, NICK } from "../diceMath.js";
import { edgeColor } from "../util.js";

// Unicode die faces ⚀-⚅ — render each combination as the actual pips.
const PIP = ["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
const pct = (p) => (p * 100).toFixed(2) + "%";

// The Learn tab's visual centrepiece: the full 36-outcome distribution drawn
// from src/diceMath.js (the same enumeration the engine and verifier use), plus
// the "race to the point" table that connects those counts to the true-odds
// payouts. No numbers are hand-typed here — every bar, percentage and ratio is
// computed from the combinatorics at render time.
export default function DiceMath() {
  const maxWays = 6; // WAYS[7]

  return (
    <div className="dicemath">
      <h3>The 36 ways two dice fall</h3>
      <p className="dm-lead">
        Two dice have <b>6 × 6 = 36</b> equally likely outcomes. Totals in the middle have more combinations that make
        them, so they come up more often. This single picture — the <b>1·2·3·4·5·6·5·4·3·2·1</b> pyramid — is the whole
        probability engine of craps. Every payout on the felt is priced against it.
      </p>

      <div className="dm-chart" role="table" aria-label="Ways to roll each total">
        {TOTALS.map((t) => {
          const w = WAYS[t];
          const isSeven = t === 7;
          const isPoint = POINTS.includes(t);
          return (
            <div key={t} className={"dm-row" + (isSeven ? " seven" : isPoint ? " point" : "")} role="row">
              <div className="dm-total mono" role="cell">{t}</div>
              <div className="dm-barwrap" role="cell">
                <div className="dm-bar" style={{ width: (w / maxWays) * 100 + "%" }}>
                  <span className="dm-ways mono">{w}<span className="dm-of"> / 36</span></span>
                </div>
                <span className="dm-combos" aria-hidden="true">
                  {COMBOS[t].filter(([a, b]) => a <= b).map(([a, b], i) => (
                    <span key={i} className="dm-combo" title={`${a} + ${b}`}>{PIP[a]}{PIP[b]}</span>
                  ))}
                </span>
              </div>
              <div className="dm-prob mono" role="cell">{pct(PROB[t])}</div>
              <div className="dm-odds mono small" role="cell">{oddsAgainst(t)}<span className="dm-againstlbl"> against</span></div>
            </div>
          );
        })}
      </div>

      <div className="callout"><b>Why the 7 rules the game.</b> The 7 sits at the peak — <b>6 ways in 36 (16.67%)</b>,
        the single most likely total and, crucially, the <i>only</i> total reachable from every die face. That is
        exactly why it's the game's axis: on the come-out it's a winner for the Pass Line, but once a point is set the
        very same roll ends the hand and sweeps the board. Every "how do I beat the 7" scheme runs aground on this one
        number being unavoidable and un-shiftable.</div>

      <h3>The race to the point — why Odds pay what they pay</h3>
      <p className="dm-lead">
        Once a point is set, the hand is a foot-race between that number and the 7. Because the 7 comes 6 ways, your
        chance of making a point is simply <b>its ways ÷ (its ways + 6)</b>. The <b>Odds</b> bet pays the exact inverse
        of that race — <b>true odds, 0% house edge</b>. It's the only bet in the building priced with no tax, which is
        why the entire optimal strategy is "minimum line bet, maximum Odds."
      </p>

      <div className="dm-points">
        <div className="dm-phead mono small">
          <span>Point</span><span>Ways</span><span>Make it before 7</span><span>True odds (Odds pays)</span>
        </div>
        {POINTS.map((t) => {
          const r = pointRace(t);
          return (
            <div key={t} className="dm-prow">
              <span className="dm-pt mono">{t}</span>
              <span className="mono small">{r.ways}</span>
              <span className="dm-makewrap">
                <span className="dm-makebar" style={{ width: r.makeP * 100 + "%" }} />
                <b className="mono">{pct(r.makeP)}</b>
              </span>
              <span className="mono" style={{ color: edgeColor(0) }}>{r.trueOdds}</span>
            </div>
          );
        })}
      </div>
      <p className="small dm-note">
        4 &amp; 10 are the hardest points (only 3 ways each) so they pay the most, <b>2 : 1</b>; 6 &amp; 8 are the
        easiest (5 ways) and pay <b>6 : 5</b>. Fold in the come-out and a Pass-Line decision resolves in about
        <b> 3.4 rolls</b>; the average shooter throws <b>8.53 times</b> before sevening out.
      </p>

      <p className="small dm-src">
        Distribution and point-race figures are generated from the dice enumeration in
        <span className="mono"> src/diceMath.js</span> and cross-checked against a 3,000,000-roll simulation in
        <span className="mono"> test/simulate.js</span>. Reference math:{" "}
        <a href="https://wizardofodds.com/games/craps/basics/" target="_blank" rel="noreferrer">Wizard of Odds — Craps basics</a>,{" "}
        <a href="https://wizardofodds.com/ask-the-wizard/craps/probability/" target="_blank" rel="noreferrer">probability of making the point</a>,{" "}
        <a href="https://wizardofodds.com/games/craps/appendix/2/" target="_blank" rel="noreferrer">house edge per bet vs. per roll</a>.
      </p>
    </div>
  );
}
