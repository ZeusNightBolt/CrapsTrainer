// The Coach — reads the live game state and produces the next edge-minimizing
// move, in priority order. Pure function of (game, rules, chip) so it can be
// unit-checked; the App maps `action` descriptors onto its bet handlers.
//
// The doctrine it teaches is the only one the math supports:
//   1. Flat bet the line (Pass 1.41% / Don't 1.36%) — nothing else is close.
//   2. The moment a point exists, load MAX ODDS — the only 0%-edge bet.
//   3. Spread to more numbers with COME (not Place/Buy) + odds behind each:
//      the 3-Point Molly. Stop at three numbers working.
//   4. Everything in the middle of the felt is a leak — flag it.
import { NUMBERS, LAY_ODDS } from "./engine.js";
import { maxOddsMultiple } from "./util.js";
import { ODDS_LADDER, DONT_LADDER, PLACE_EDGE, buyEdge } from "./bets.js";

const PROP_KEYS = ["field", "any7", "anycraps", "yo", "aces", "boxcars", "aceDeuce", "horn", "ce", "world"];

export function getAdvice(game, rules, chip) {
  const b = game.bets;
  const advice = [];
  const blended = (ODDS_LADDER.find((r) => r.id === rules.oddsMode) || ODDS_LADDER[3]).edge;
  const dontBlended = (DONT_LADDER.find((r) => r.id === rules.oddsMode) || DONT_LADDER[3]).edge;
  const multLabel = rules.oddsMode === "345" ? "3-4-5×" : rules.oddsMode;

  // ---- leaks first: money bleeding on the middle of the felt ----
  const propSum = PROP_KEYS.reduce((a, k) => a + b[k], 0) + [4, 6, 8, 10].reduce((a, n) => a + b.hard[n], 0);
  if (propSum > 0) {
    advice.push({
      level: "warn",
      msg: `$${propSum} is riding the field/center at 2.8–16.7% edge. Every dollar there costs 2–45× what the line does.`,
      action: { type: "clearProps", label: "Take it down" },
    });
  }
  const badPlace = b.place[4] + b.place[10];
  if (badPlace > 0) {
    advice.push({
      level: "warn",
      msg: `Place 4/10 costs ${PLACE_EDGE[4]}%. Buying the same numbers costs ${buyEdge(rules.vigAlways)[4].toFixed(2)}% — or skip them entirely.`,
    });
  }

  if (game.phase === "comeout") {
    const comeRiding = NUMBERS.filter((n) => b.comePts[n] > 0);
    if (b.passline === 0 && b.dontpass === 0) {
      if (comeRiding.length > 0) {
        advice.push({
          level: "do",
          msg: `Come-out roll. Your come ${comeRiding.length > 1 ? "bets" : "bet"} on ${comeRiding.join(", ")} still work (flats on, odds off — a 7 can't touch the odds). Put a Pass Line bet down so the come-out 7/11 works for you too.`,
          action: { type: "bet", path: "passline", label: `Bet $${chip} Pass` },
        });
      } else {
        advice.push({
          level: "do",
          msg: `Come-out roll, nothing working. Bet the Pass Line — 1.41% edge, the cheapest bet you can start with (Don't Pass is 1.36% if you'd rather fade the table). Everything else on the felt costs more.`,
          action: { type: "bet", path: "passline", label: `Bet $${chip} Pass` },
        });
      }
    } else if (b.dontpass > 0 && b.passline === 0) {
      advice.push({
        level: "ok",
        msg: `Don't Pass is down (1.36%). The come-out 7/11 hurts now — that's the price of becoming the favorite on every point. Once the puck flips ON, lay max odds.`,
      });
    } else {
      advice.push({
        level: "ok",
        msg: `Line bet is down — roll. 7 or 11 wins right now; 2/3/12 loses. If a point is set, your next move is always the same: load MAX ODDS behind the line. It's the only 0%-edge bet in the casino.`,
      });
    }
    return advice;
  }

  // ---- point phase ----
  const pt = game.point;
  const mult = maxOddsMultiple(pt, rules.oddsMode);

  if (b.passline > 0 && b.passodds < b.passline * mult) {
    const want = b.passline * mult - b.passodds;
    advice.push({
      level: "do",
      msg: `Point is ${pt}. Back your Pass Line with $${want} more odds (${multLabel} max) — true odds, 0% edge, and it dilutes your blended cost to ~${blended.toFixed(2)}%. Never roll a point without full odds.`,
      action: { type: "maxPass", label: `+$${want} max odds` },
    });
    return advice;
  }
  if (b.dontpass > 0 && b.dpodds < Math.round((b.dontpass * mult) / LAY_ODDS[pt])) {
    const want = Math.round((b.dontpass * mult) / LAY_ODDS[pt]) - b.dpodds;
    advice.push({
      level: "do",
      msg: `Point is ${pt} and you're the favorite. Lay $${want} more odds behind Don't Pass — 0% edge, blended ~${dontBlended.toFixed(2)}%. You lay more to win less, but the 7 is the most likely roll.`,
      action: { type: "maxDont", label: `+$${want} lay odds` },
    });
    return advice;
  }

  const comeRiding = NUMBERS.filter((n) => b.comePts[n] > 0);
  const comeNoOdds = comeRiding.filter((n) => b.comeOdds[n] < b.comePts[n] * maxOddsMultiple(n, rules.oddsMode));
  const dcRiding = NUMBERS.filter((n) => b.dcPts[n] > 0);
  const numbersWorking = (b.passline > 0 ? 1 : 0) + comeRiding.length + (b.come > 0 ? 1 : 0);

  if (comeNoOdds.length > 0) {
    const n = comeNoOdds[0];
    const want = b.comePts[n] * maxOddsMultiple(n, rules.oddsMode) - b.comeOdds[n];
    advice.push({
      level: "do",
      msg: `Your Come bet is riding the ${n} without full odds. Add $${want} behind it — same 0%-edge odds as the line. A come bet without odds is paying 1.41% for no discount.`,
      action: { type: "maxComeOdds", n, label: `+$${want} odds on ${n}` },
    });
  } else if (b.come > 0) {
    advice.push({
      level: "ok",
      msg: `Come bet in the box. This roll: 7/11 wins it, 2/3/12 loses it, any number sends it traveling. The moment it lands on a number, back it with max odds.`,
    });
  } else if (b.passline > 0 && numbersWorking < 3) {
    advice.push({
      level: "do",
      msg: `Odds are fully loaded. Next: $${chip} in the COME box — the identical 1.41% + free-odds math as your Pass Line, but on a second number. Three numbers working is the 3-Point Molly (~${blended.toFixed(2)}% blended), the grinder's ceiling.`,
      action: { type: "bet", path: "come", label: `Bet $${chip} Come` },
    });
  } else if (numbersWorking >= 3) {
    advice.push({
      level: "ok",
      msg: `Fully deployed — ${numbersWorking} numbers working at ~${blended.toFixed(2)}% blended. The correct move now is: nothing. Roll. If you absolutely want more action, Place 6 & 8 (1.52%) is the only defensible add.`,
    });
  } else if (b.dontpass > 0 || dcRiding.length > 0) {
    advice.push({
      level: "ok",
      msg: `Don't side set with full lay odds (~${dontBlended.toFixed(2)}% blended) — you're the favorite from here. Add a Don't Come to spread the same math across a second number, or just roll.`,
      action: { type: "bet", path: "dontcome", label: `Bet $${chip} Don't Come` },
    });
  } else {
    advice.push({
      level: "do",
      msg: `Point is ON and you have nothing working. No need to wait for a come-out: the COME box is the same 1.41% + max-odds play, live right now.`,
      action: { type: "bet", path: "come", label: `Bet $${chip} Come` },
    });
  }
  return advice;
}
