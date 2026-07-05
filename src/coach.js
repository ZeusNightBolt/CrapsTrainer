// The Coach — a genie that reads whatever is on the felt and explains the
// logic: which bets are good, which are leaks, and what the smart next move
// is. It is purely advisory — it never tells you how much to bet and never
// places a bet for you. The whole doctrine it teaches is the only one the
// math supports: line + odds + come, keep the middle of the table empty.
import { NUMBERS, totalWagered } from "./engine.js";
import { maxOddsMultiple } from "./util.js";
import { ODDS_LADDER, DONT_LADDER } from "./bets.js";
import { nextRollOutcomes } from "./outcomes.js";

// One insight = one chat bubble. level drives colour + the genie's badge.
const bad = (msg) => ({ level: "warn", msg });
const doIt = (msg) => ({ level: "do", msg });
const ok = (msg) => ({ level: "ok", msg });

export function getAdvice(game, rules) {
  const b = game.bets;
  const outcomes = nextRollOutcomes(game, rules);
  const equity = game.bankroll + totalWagered(b);
  const sevenLoss = Math.max(0, -outcomes.seven);
  const exposure = {
    seven: outcomes.seven,
    sevenPct: equity > 0 ? sevenLoss / equity : 0,
    ev: outcomes.ev,
  };

  const oddsLabel = rules.oddsMode === "345" ? "3-4-5×" : rules.oddsMode;
  const insights = [];

  // ---- the primary "what should I do next" read ----
  const pt = game.point;
  const comeRiding = NUMBERS.filter((n) => b.comePts[n] > 0);
  const comeNoOdds = comeRiding.filter((n) => b.comeOdds[n] < b.comePts[n] * maxOddsMultiple(n, rules.oddsMode));
  const numbersWorking = (b.passline > 0 ? 1 : 0) + comeRiding.length + (b.come > 0 ? 1 : 0);

  if (game.phase === "comeout") {
    if (b.passline === 0 && b.dontpass === 0 && comeRiding.length === 0) {
      insights.push(doIt(`Come-out roll. Start on the <b>Pass Line</b> (1.41% edge) — or <b>Don't Pass</b> (1.36%) if you'd rather fade the table. These two are the cheapest bets on the felt; everything else costs more.`));
    } else if (b.passline > 0) {
      insights.push(ok(`Pass Line is down. Right now <b>7 or 11 wins</b>, <b>2 · 3 · 12 loses</b>. If a number sets the point, your best next move is <b>Odds behind the line</b> — the only 0%-edge bet in the casino.`));
    } else if (b.dontpass > 0) {
      insights.push(ok(`Don't Pass is down. Now the come-out <b>7/11 loses</b> and <b>2/3 wins</b> (12 pushes). You give up this roll to become the favourite on every point after it.`));
    }
  } else {
    // point is on
    if (b.passline > 0 && b.passodds < b.passline * maxOddsMultiple(pt, rules.oddsMode)) {
      insights.push(doIt(`Point is <b>${pt}</b>. Back your Pass Line with <b>Odds</b> (up to ${oddsLabel} here) — it pays true, 0% house edge. Loading odds is the only way to bet more <i>without</i> paying more.`));
    } else if (b.dontpass > 0 && b.dpodds === 0) {
      insights.push(doIt(`Point is <b>${pt}</b> and you're the favourite. You can <b>lay Odds</b> behind Don't Pass at 0% edge — your danger roll is the ${pt} itself, not the 7.`));
    } else if (comeNoOdds.length > 0) {
      insights.push(doIt(`Your <b>Come ${comeNoOdds[0]}</b> has no odds behind it. Add Odds — the same free 0%-edge boost the line gets. A come bet without odds pays 1.41% for no discount.`));
    } else if (b.come > 0) {
      insights.push(ok(`Come bet in the box. It <b>wins on 7/11</b>, loses on 2/3/12, and any number carries it onto that box. It's also your cushion — a 7 that kills the board still <b>pays this bet</b>.`));
    } else if (b.passline > 0 && numbersWorking < 3) {
      insights.push(doIt(`Line + odds are set. Want more action? Put it in the <b>Come box</b>, not on a Place number — a come bet is the same 1.41% + free odds on a second number. Three working numbers is the <b>3-Point Molly</b>, the grinder's ceiling.`));
    } else if (numbersWorking >= 3) {
      insights.push(ok(`Three numbers working with odds — that's as good as craps gets. The correct move now is <b>nothing</b>: just roll.`));
    } else if (b.dontpass > 0 || NUMBERS.some((n) => b.dcPts[n] > 0)) {
      insights.push(ok(`Don't side is set — you're the favourite from here. A <b>Don't Come</b> spreads the same math to a second number, or simply roll.`));
    } else {
      insights.push(doIt(`Point is on and nothing's working. No need to wait for a new come-out — the <b>Come box</b> is the same Pass-Line play, live right now.`));
    }
  }

  // ---- read the leaks currently on the table ----
  if (b.field > 0) {
    insights.push(bad(`<b>Field</b> looks like it covers seven numbers, but 5 · 6 · 7 · 8 — the most common rolls — all lose. ${rules.fieldTriple ? "2.78%" : "5.56%"} edge, and it resolves every single roll.`));
  }
  if (b.any7 > 0) {
    insights.push(bad(`<b>Any Seven</b> is the single worst bet on the table — <b>16.67%</b>. It's a 5:1 shot paying 4:1, every roll.`));
  }
  const hardSum = [4, 6, 8, 10].reduce((a, n) => a + b.hard[n], 0);
  if (hardSum > 0) {
    insights.push(bad(`<b>Hardways</b> pay big but cost 9–11%. The number has to come <i>exactly</i> paired, before any easy version or a 7 — most of the time it doesn't.`));
  }
  const oneRoll = b.anycraps + b.yo + b.aceDeuce + b.aces + b.boxcars + b.horn + b.ce + b.world;
  if (oneRoll > 0) {
    insights.push(bad(`Those <b>center props</b> (horn, C&E, craps, yo, world…) run 11–17% edge and decide every roll. They're the fastest way to bleed a stack — the casino puts them in the middle for a reason.`));
  }
  if (b.place[4] + b.place[10] > 0) {
    insights.push(bad(`<b>Place 4 / 10</b> costs 6.67%. If you want those numbers, <b>Buy</b> them instead (far cheaper) — or skip them and Place the 6 & 8.`));
  }
  if (b.passline > 0 && b.dontpass > 0) {
    insights.push(bad(`You're on <b>both</b> the Pass and Don't Pass (the "doey-don't"). They mostly cancel, so you're paying two house edges for almost no action — the only thing that resolves is the rare 12 push.`));
  }

  // ---- quiet praise for the good number bets ----
  if (b.place[6] > 0 || b.place[8] > 0) {
    insights.push(ok(`<b>Place 6 & 8</b> (1.52%) are the best number bets outside the line — bet them in $6 units so the 7:6 payout lands clean.`));
  }

  const blended = (ODDS_LADDER.find((r) => r.id === rules.oddsMode) || ODDS_LADDER[3]).edge;
  const dontBlended = (DONT_LADDER.find((r) => r.id === rules.oddsMode) || DONT_LADDER[3]).edge;
  if ((b.passodds > 0 || b.dpodds > 0)) {
    const line = b.dpodds > 0 ? dontBlended : blended;
    insights.push(ok(`With odds working your blended edge is about <b>${line.toFixed(2)}%</b> of everything on the line — near the theoretical floor for this game.`));
  }

  const headline = insights.find((i) => i.level === "do") || insights.find((i) => i.level === "warn") || insights[0]
    || ok(`Place a bet and I'll talk you through it. Line + odds is the cheapest way to play.`);

  return { insights: insights.length ? insights : [headline], headline, exposure };
}
