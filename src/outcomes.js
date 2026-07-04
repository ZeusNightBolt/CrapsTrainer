// Next-roll outcome model — runs the real resolution engine on all 36 die
// combinations of the current state, so the numbers here can never disagree
// with what actually happens when the dice land. Cheap (36 pure resolves) and
// memoized at the call sites.
import { resolve, totalWagered } from "./engine.js";

const round2 = (x) => Math.round((x + Number.EPSILON) * 100) / 100;

// Returns:
//   byTotal[t] = { min, max, avg, prob }  net P&L if the next roll totals t
//                (min ≠ max only when hardways split a total, e.g. 2-2 vs 3-1)
//   seven      = net P&L of the next 7 (identical across all six 7 combos)
//   ev         = probability-weighted expected P&L of the next roll
export function nextRollOutcomes(game, rules) {
  const before = totalWagered(game.bets);
  const byTotal = {};
  let ev = 0;
  for (let d1 = 1; d1 <= 6; d1++) {
    for (let d2 = 1; d2 <= 6; d2++) {
      const out = resolve(game, d1, d2, rules);
      const delta = out.payout - (before - totalWagered(out.state.bets));
      const t = d1 + d2;
      const e = byTotal[t] || (byTotal[t] = { min: Infinity, max: -Infinity, sum: 0, n: 0 });
      if (delta < e.min) e.min = delta;
      if (delta > e.max) e.max = delta;
      e.sum += delta; e.n++;
      ev += delta / 36;
    }
  }
  for (const t in byTotal) {
    const e = byTotal[t];
    e.avg = round2(e.sum / e.n);
    e.min = round2(e.min); e.max = round2(e.max);
    e.prob = e.n / 36;
  }
  return { byTotal, seven: byTotal[7].avg, ev: round2(ev) };
}
