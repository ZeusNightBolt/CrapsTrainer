// The Coach — reads the live game state and produces the next move, balancing
// three things the pure-EV view ignores:
//
//   EV        every bet is negative-EV, so prefer the cheapest ones (line +
//             odds, come + odds) and flag everything else as a leak.
//   EXPOSURE  what the next 7 actually clears off the board, measured against
//             the player's whole stack via the real engine (see outcomes.js).
//             Aggression is fine until one roll can end the session.
//   LONGEVITY unit size vs. bankroll. A $100 unit with full 3-4-5x odds
//             commits ~$500 per hand — half of a $1,000 stack on one decision.
//
// Stances set the risk budget. The math is the same in all three; only the
// caps move. Where the coach recommends restraint it says what the aggressive
// line would be and what it costs, so the trade is always explicit — including
// the one honest "hedge": a fresh Come bet in the box WINS on a seven-out
// (+1 unit while the board dies), softening the hit at the usual 1.41% cost.
import { NUMBERS, LAY_ODDS, totalWagered } from "./engine.js";
import { maxOddsMultiple } from "./util.js";
import { ODDS_LADDER, DONT_LADDER, PLACE_EDGE, buyEdge } from "./bets.js";
import { nextRollOutcomes } from "./outcomes.js";

export const STANCES = [
  { id: "cons", label: "Cautious", icon: "🛡", cap7: 0.08, maxNumbers: 2, oddsCapMult: 2, unitCap: 0.1 },
  { id: "bal", label: "Balanced", icon: "⚖", cap7: 0.18, maxNumbers: 3, oddsCapMult: Infinity, unitCap: 0.2 },
  { id: "aggr", label: "Aggressive", icon: "🔥", cap7: 0.4, maxNumbers: 3, oddsCapMult: Infinity, unitCap: 0.35 },
];

const PROP_KEYS = ["field", "any7", "anycraps", "yo", "aces", "boxcars", "aceDeuce", "horn", "ce", "world"];
const pct = (x) => (x * 100).toFixed(0) + "%";

export function getAdvice(game, rules, chip, stanceId = "bal") {
  const stance = STANCES.find((s) => s.id === stanceId) || STANCES[1];
  const b = game.bets;
  const advice = [];
  const outcomes = nextRollOutcomes(game, rules);
  const equity = game.bankroll + totalWagered(b);
  const sevenLoss = Math.max(0, -outcomes.seven);
  const budget7 = stance.cap7 * equity;
  const room = budget7 - sevenLoss; // additional next-7 loss the stance allows
  const blended = (ODDS_LADDER.find((r) => r.id === rules.oddsMode) || ODDS_LADDER[3]).edge;
  const dontBlended = (DONT_LADDER.find((r) => r.id === rules.oddsMode) || DONT_LADDER[3]).edge;

  const exposure = {
    seven: outcomes.seven,
    sevenPct: equity > 0 ? sevenLoss / equity : 0,
    ev: outcomes.ev,
    capPct: stance.cap7,
  };

  // Longevity is chronic, not urgent — computed here, appended after the
  // primary advice so it never displaces the actual next move.
  let longevity = null;
  const m68 = Math.min(maxOddsMultiple(6, rules.oddsMode), stance.oddsCapMult);
  const perHand = chip * (1 + m68);
  if (equity > 0 && perHand > stance.unitCap * equity) {
    const fit = Math.max(1, Math.floor((stance.unitCap * equity) / (1 + m68)));
    longevity = {
      level: "warn",
      msg: `Longevity check: a $${chip} unit with odds commits ~$${perHand}/hand — ${pct(perHand / equity)} of your $${equity} stack. One cold shooter ends the session. A ~$${fit} unit fits your ${stance.label.toLowerCase()} risk budget.`,
    };
  }
  const done = () => { if (longevity) advice.push(longevity); return { advice, exposure }; };

  // ---- leaks: money on high-edge bets ----
  const propSum = PROP_KEYS.reduce((a, k) => a + b[k], 0) + [4, 6, 8, 10].reduce((a, n) => a + b.hard[n], 0);
  if (propSum > 0) {
    advice.push({
      level: "warn",
      msg: `$${propSum} is riding the field/center at 2.8–16.7% edge — 2–45× the cost of the line for the same thrill.`,
      action: { type: "clearProps", label: "Take it down" },
    });
  }
  const badPlace = b.place[4] + b.place[10];
  if (badPlace > 0) {
    advice.push({
      level: "warn",
      msg: `Place 4/10 costs ${PLACE_EDGE[4]}%. Buying the same numbers costs ${buyEdge(rules.vigAlways)[4].toFixed(2)}% — or skip them.`,
    });
  }

  // ---- come-out ----
  if (game.phase === "comeout") {
    const comeRiding = NUMBERS.filter((n) => b.comePts[n] > 0);
    if (b.passline === 0 && b.dontpass === 0) {
      advice.push({
        level: "do",
        msg: comeRiding.length > 0
          ? `Come-out. Your come ${comeRiding.length > 1 ? "bets" : "bet"} on ${comeRiding.join(", ")} still work (flats on, odds off — the odds are safe from a 7 right now). A Pass Line bet makes the come-out 7/11 work for you too.`
          : `Come-out roll, nothing working. Bet the Pass Line — 1.41%, the cheapest start (Don't Pass 1.36% to fade the table). Everything else on the felt costs more.`,
        action: { type: "bet", path: "passline", label: `Bet $${chip} Pass` },
      });
    } else if (b.dontpass > 0 && b.passline === 0) {
      advice.push({
        level: "ok",
        msg: `Don't Pass down (1.36%). The come-out 7/11 hurts — the price of being the favorite on every point after. When the puck flips ON, lay odds within your risk budget.`,
      });
    } else {
      advice.push({
        level: "ok",
        msg: `Line bet down — roll. 7/11 wins now; 2/3/12 loses. When a point is set, odds come next: 0% edge, sized to your ${stance.label.toLowerCase()} budget, never more than one roll's pain.`,
      });
    }
    return done();
  }

  // ---- point phase ----
  const pt = game.point;
  const tableMult = maxOddsMultiple(pt, rules.oddsMode);
  const stanceMult = Math.min(tableMult, stance.oddsCapMult);

  // pass odds, sized by table max, stance cap, and the next-7 budget
  if (b.passline > 0) {
    const target = b.passline * stanceMult;
    const remaining = Math.max(0, target - b.passodds);
    const amt = Math.min(remaining, Math.max(0, Math.floor(room)));
    if (remaining > 0 && amt > 0) {
      const capped = amt < b.passline * tableMult - b.passodds;
      advice.push({
        level: "do",
        msg: amt < remaining
          ? `Point is ${pt}. Take $${amt} odds — not the full $${remaining} — to keep the next 7 under ${pct(stance.cap7)} of your stack. Odds are 0% edge, but they all die on one roll.`
          : `Point is ${pt}. Back the line with $${amt} odds${capped ? ` (${stance.label} cap ${stanceMult}× — table allows ${tableMult}×; switch stance for more)` : ` (${rules.oddsMode === "345" ? "3-4-5×" : rules.oddsMode} max)`} — 0% edge, blended cost ~${blended.toFixed(2)}%.`,
        action: { type: "passOdds", amt, label: `+$${amt} odds` },
      });
      return done();
    }
    if (remaining > 0 && amt <= 0) {
      advice.push({
        level: "ok",
        msg: `Odds would be 0% edge, but the next 7 already clears $${sevenLoss} — ${pct(exposure.sevenPct)} of your stack, at your ${stance.label.toLowerCase()} cap. Ride what you have; a made point frees the budget.`,
      });
      return done();
    }
  }

  // don't-side lay odds — the danger roll is the point, not the 7
  if (b.dontpass > 0) {
    const layTarget = Math.round((b.dontpass * stanceMult) / LAY_ODDS[pt]);
    const remaining = Math.max(0, layTarget - b.dpodds);
    const ptLoss = Math.max(0, -(outcomes.byTotal[pt]?.avg ?? 0));
    const layRoom = Math.max(0, Math.floor(stance.cap7 * equity - ptLoss));
    const amt = Math.min(remaining, layRoom);
    if (remaining > 0 && amt > 0) {
      advice.push({
        level: "do",
        msg: `Point is ${pt} and you're the favorite. Lay $${amt} odds behind Don't Pass — 0% edge, blended ~${dontBlended.toFixed(2)}%. Your danger roll is the ${pt} itself (${pct((outcomes.byTotal[pt]?.prob ?? 0))} per roll), not the 7.`,
        action: { type: "dontOdds", amt, label: `+$${amt} lay odds` },
      });
      return done();
    }
  }

  const comeRiding = NUMBERS.filter((n) => b.comePts[n] > 0);
  const dcRiding = NUMBERS.filter((n) => b.dcPts[n] > 0);
  const numbersWorking = (b.passline > 0 ? 1 : 0) + comeRiding.length + (b.come > 0 ? 1 : 0);

  // odds behind traveled come bets, same budget sizing
  for (const n of comeRiding) {
    const target = b.comePts[n] * Math.min(maxOddsMultiple(n, rules.oddsMode), stance.oddsCapMult);
    const remaining = Math.max(0, target - b.comeOdds[n]);
    const amt = Math.min(remaining, Math.max(0, Math.floor(room)));
    if (remaining > 0 && amt > 0) {
      advice.push({
        level: "do",
        msg: amt < remaining
          ? `Your Come ${n} is riding light. Add $${amt} odds — sized so the next 7 stays under ${pct(stance.cap7)} of your stack.`
          : `Back your Come ${n} with $${amt} odds — the same 0%-edge discount as the line. A come bet without odds pays 1.41% for nothing.`,
        action: { type: "comeOdds", n, amt, label: `+$${amt} on ${n}` },
      });
      return done();
    }
  }

  if (b.come > 0) {
    advice.push({
      level: "ok",
      msg: `Come bet in the box — and note: if the 7 shows now, this bet WINS while the board dies. It's your one honest cushion. 7/11 wins it, 2/3/12 loses it, a number sends it traveling.`,
    });
    return done();
  }

  if (b.passline > 0 && numbersWorking < stance.maxNumbers) {
    const overHalfBudget = sevenLoss > budget7 * 0.5;
    advice.push({
      level: "do",
      msg: overHalfBudget
        ? `You have $${sevenLoss} dying on the next 7 (${pct(exposure.sevenPct)} of stack). A fresh Come bet is the balanced add: it WINS +$${chip} on a seven-out — cushioning the hit — then becomes a second number if it travels. Costs the usual 1.41%, nothing more.`
        : `Odds are set. Spread: $${chip} in the COME box — identical 1.41% + odds math on a second number. ${stance.maxNumbers} numbers working is your ${stance.label.toLowerCase()} ceiling.`,
      action: { type: "bet", path: "come", label: overHalfBudget ? `Hedge $${chip} Come` : `Bet $${chip} Come` },
    });
    return done();
  }

  if (numbersWorking >= stance.maxNumbers) {
    const over = sevenLoss > budget7;
    advice.push({
      level: "ok",
      msg: over
        ? `Fully deployed — ${numbersWorking} numbers, and the next 7 now costs $${sevenLoss} (${pct(exposure.sevenPct)} of stack, over your ${pct(stance.cap7)} cap — the dice moved it, not you). Odds can legally come down anytime if that's uncomfortable; otherwise ride it out.`
        : `Fully deployed for a ${stance.label.toLowerCase()} book — ${numbersWorking} numbers, next 7 costs $${sevenLoss} (${pct(exposure.sevenPct)} of stack, cap ${pct(stance.cap7)}). The correct move is: nothing. Roll.`,
    });
    return done();
  }

  if (b.dontpass > 0 || dcRiding.length > 0) {
    advice.push({
      level: "ok",
      msg: `Don't side set (~${dontBlended.toFixed(2)}% blended) — you're the favorite from here. A Don't Come spreads the same math to a second number, or just roll.`,
      action: { type: "bet", path: "dontcome", label: `Bet $${chip} Don't Come` },
    });
    return done();
  }

  advice.push({
    level: "do",
    msg: `Point is ON and nothing's working. No need to wait for a come-out — the COME box is the same 1.41% + odds play, live right now.`,
    action: { type: "bet", path: "come", label: `Bet $${chip} Come` },
  });
  return done();
}
