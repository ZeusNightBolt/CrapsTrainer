import { edgeColor, usd } from "../util.js";
import { ODDS_LADDER, DONT_LADDER, buyEdge, layEdge, fieldEdge } from "../bets.js";

export default function Strategy({ rules }) {
  const Ladder = ({ label, edge }) => (
    <div className="kv">
      <span>{label}</span>
      <b className="mono" style={{ color: edgeColor(edge) }}>{edge.toFixed(2)}%</b>
    </div>
  );

  const passRow = ODDS_LADDER.find((r) => r.id === rules.oddsMode) || ODDS_LADDER[3];
  const dontRow = DONT_LADDER.find((r) => r.id === rules.oddsMode) || DONT_LADDER[3];
  const bE = buyEdge(rules.vigAlways), lE = layEdge(rules.vigAlways);
  const fE = fieldEdge(rules.fieldTriple);

  return (
    <div className="prose">
      <p><b>The whole game in one line:</b> every wager in craps is negative-EV, so you don't play to win — you play to
        choose your <b>variance</b> for a fixed, small expected cost. The only lever that scales bet size <i>without</i>
        adding edge is the free Odds bet. Everything else is a menu of ways to pay more.</p>

      <h3>Tier 1 — the only bets worth making</h3>
      <p><b>Pass / Come + max Odds.</b> The flat bet is 1.41%. Odds behind it pay true (0% edge), so loading Odds
        dilutes the blended edge across your whole wager:</p>
      <div className="panel" style={{ padding: "10px 14px", margin: "8px 0" }}>
        {ODDS_LADDER.map((r) => <Ladder key={r.id} label={r.label} edge={r.edge} />)}
      </div>
      <p>Your Table Rules are currently set to <b>{passRow.label.replace("Pass, ", "").replace("Pass + ", "")}</b> —
        that's a <b className="mono" style={{ color: edgeColor(passRow.edge) }}>{passRow.edge.toFixed(2)}%</b> blended
        edge on Pass, or <b className="mono" style={{ color: edgeColor(dontRow.edge) }}>{dontRow.edge.toFixed(2)}%</b> on
        Don't Pass with max lay. Change it under "Table rules" on the Table tab.</p>
      <p><b>Don't Pass / Don't Come + Lay Odds</b> is fractionally cheaper (1.36% flat) and lower variance — you're
        the favorite once a point is set (odds-on to win most points). The cost is social (betting against the table)
        and lay odds tie up more capital to win less, since you're laying against the number instead of taking it.</p>
      <div className="callout good"><b>3-Point Molly</b> — the grinder's play. Pass line + two Come bets, max odds on all
        three. You keep three numbers working at the odds-diluted line rate. Maximum time on the table, minimum edge. As
        close to "correct" as craps gets. Toggle the working switch off on the come-out and your odds ride safely
        through a 7 (a come bet's flat portion is always at risk on a 7, but its odds are optional).</div>
      <div className="callout"><b>"Doey-don't" (Pass + Don't Pass together):</b> a common hedge that bets both sides of
        the line at once. It feels risk-free — you can't lose the flat bets on the same roll — but you're now paying
        <i> two</i> house edges (1.41% + 1.36%) instead of one, and the only thing that ever resolves in your favor is
        the rare bar-12 push. It's the "protect the pass line" instinct from Tier 3 wearing a respectable disguise.</div>

      <h3>Tier 2 — acceptable if you want specific action</h3>
      <p><b>Place 6 & 8</b> at 1.52% each is the best number bet — bet them in $6 units or you lose payout to rounding
        (a $10 Place 6 pays $11.67, rounded down to $11 by most houses; $12 pays the full $14).
        <b> Buy the 4/10</b> instead of Placing them: {bE[4].toFixed(2)}% vs 6.67% under your current vig convention.
        Never buy the 6 or 8 ({bE[6].toFixed(2)}% &gt; the 1.52% Place).</p>
      <div className="callout"><b>Vig-on-win vs. vig-always</b> changes which Buy/Lay numbers are worth it. Your table is
        currently set to <b>{rules.vigAlways ? "vig-always (charged at placement)" : "vig-on-win (charged only when you win)"}</b>:
        Buy 4/10 is {bE[4].toFixed(2)}%, Buy 5/9 is {bE[5].toFixed(2)}%, Buy 6/8 is {bE[6].toFixed(2)}%; Lay 4/10 is{" "}
        {lE[4].toFixed(2)}%, Lay 5/9 is {lE[5].toFixed(2)}%, Lay 6/8 is {lE[6].toFixed(2)}%. Counterintuitively,
        vig-always is <i>cheaper</i> for Lay bets and <i>pricier</i> for Buy bets than vig-on-win — the commission is a
        one-time cost either way, but it's sized off the stake for Buy and off the (smaller) potential win for Lay, and
        amortizes differently depending on how often the bet is expected to keep winning before it finally loses.</div>

      <h3>Tier 3 — the traps</h3>
      <div className="callout"><b>Iron Cross</b> (Place 5, 6, 8 + Field): wins on <i>every</i> number except 7. Feels
        unstoppable. But 7 is the single most likely roll (6/36) and the blended edge is ~2.3%–3% on a large amount of
        action. You win small constantly and hand it all back on the 7. A variance illusion, not an edge.</div>
      <div className="callout"><b>Hedging</b> (e.g. Any Craps on the come-out to "protect" the Pass line): every hedge is
        a second negative-EV bet stacked on the first. It smooths variance and <i>raises</i> your total expected loss. If
        you want less variance, bet less — don't hedge.</div>
      <div className="callout"><b>Field paytable trap:</b> your table's Field currently pays{" "}
        {rules.fieldTriple ? "3:1 on a 12" : "only 2:1 on a 12"}, a <b className="mono" style={{ color: edgeColor(fE) }}>{fE.toFixed(2)}%</b>{" "}
        edge. The two paytables look identical at a glance — the difference is one chip's payout on the rarest number —
        but it doubles the house edge. Always check what the felt actually prints before betting the Field.</div>
      <div className="callout"><b>Props, hardways, Big 6/8, Any Seven, Horn, C&E, World/Whirl:</b> 9%–16.7% edge. Any
        Seven at 16.67% is the worst single bet on the felt. Big 6/8 is literally Place 6/8 with the edge multiplied 6×.
        World/Whirl looks like a "safer Horn" because it adds an Any-Seven leg, but that leg only breaks even on a 7 — it
        doesn't offset the other four losing units, so it's worse than a plain Horn. Avoid the entire center of the
        table.</div>

      <h3>Does dice setting / rhythm rolling work?</h3>
      <p>Some players "set" the dice to a chosen face combination and try to throw with minimal rotation ("rhythm
        rolling" or "controlled shooting"), aiming to suppress the 7 slightly. Casinos require the dice to hit the
        back wall's pyramid pattern to count, specifically to randomize any residual bias from the throw. No public,
        controlled study has demonstrated a shooter beating the game this way, and even the sources most sympathetic to
        the idea concede the edge it would need to produce (turning a 1.41% house edge into a player edge) is far larger
        than any claimed effect. Treat it as a placebo for confidence, not a mathematical edge — bet the same way whether
        you're shooting or not.</p>

      <h3>Sizing the cost: rolls vs. decisions vs. hours</h3>
      <p>A live table gets roughly <b>100 rolls/hour</b>, but that is <i>not</i> the same as 100 betting decisions.
        Pass/Don't Pass/Come/Don't Come each take an average of about <b>3.4 rolls</b> to resolve (the shooter, on
        average, throws about <b>8.5 rolls</b> before sevening out), so a table running pure line bets produces closer to{" "}
        <b>20–30 line decisions/hour</b> — a common error is to price "expected loss per hour" off the roll count
        instead, which overstates it roughly 3×. One-roll bets (Field, Any Seven, the props) resolve on literally every
        roll, so they don't get this discount — that's part of why they drain a bankroll so much faster per hour even
        at a similar-looking bet size.</p>
      <p>Expected loss per hour ≈ <b className="mono">edge × avg bet × decisions/hr</b>. Pass + your current odds setting,
        $25 flat with odds working, ~25 line decisions/hr, {passRow.edge.toFixed(2)}% blended ≈ a few dollars an hour of
        expected cost. The same $25 dumped on Any Seven every roll (~100 rolls/hr, 16.67% edge, one-roll) ≈{" "}
        <b className="mono" style={{ color: "#f43f5e" }}>{usd(25 * 0.1667 * 100)}/hr</b>. Same chips on the table, an
        order of magnitude more bleed, because every single roll is a fresh full-edge decision instead of one diluted
        decision every 3–4 rolls.</p>

      <h3>Variance: the part the house-edge number hides</h3>
      <p>House edge tells you the average cost per dollar wagered over a very long run. It says nothing about how wild a
        single session will be, and odds bets change that a lot even though they add zero edge. Simulating a $10 Pass
        Line decision (engine-verified, see the Simulator tab) gives a standard deviation of about{" "}
        <b className="mono">$10</b> with no odds, <b className="mono">$19</b> with 1× odds, <b className="mono">$49</b>{" "}
        with 3-4-5× odds, and <b className="mono">$108</b> with 10× odds — the swings grow roughly linearly with the
        odds multiple even though the expected loss barely moves. That's the actual trade you're making by taking more
        odds: not "more risk of losing," in the edge sense, but a much wider range of plausible outcomes for the same
        tiny expected cost. A grinder chasing a low-variance, long session wants small flat bets with light odds; a
        player trying to hit a specific win target or comp threshold in a short session wants the opposite — max odds,
        because the added variance is free.</p>

      <div className="callout good"><b>The convex read:</b> the house edge is fixed and unbeatable, so the real
        optimization is variance-per-dollar-of-EV-cost. Odds bets are the only place you buy pure variance at zero
        marginal edge — useful if you're chasing a comp threshold or a defined upside swing on a fixed loss budget.
        Outside of that, the rational play is minimum line bet + max odds, or don't sit down. Use the Simulator tab to
        see this trade-off directly: run the same strategy at different unit sizes and watch the spread of outcomes
        widen while the mean barely changes.</div>

      <p className="small" style={{ marginTop: 18 }}>
        Base edges are Monte-Carlo-verified in <span className="mono">test/simulate.js</span> against the standard
        36-outcome dice-combinatorics figures published by Wizard of Odds. Further reading used while building this:{" "}
        <a href="https://wizardofodds.com/games/craps/" target="_blank" rel="noreferrer">Wizard of Odds — Craps</a>,{" "}
        <a href="https://wizardofodds.com/games/craps/appendix/2/" target="_blank" rel="noreferrer">House edge per bet made vs. per roll</a>,{" "}
        <a href="https://wizardofodds.com/gambling/three-point-molly/" target="_blank" rel="noreferrer">Three Point Molly</a>,{" "}
        <a href="https://wizardofodds.com/ask-the-wizard/craps/dice/" target="_blank" rel="noreferrer">dice setting &amp; rhythm rolling</a>.
      </p>
    </div>
  );
}
