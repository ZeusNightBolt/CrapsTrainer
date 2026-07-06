// The Coach — a genie that reads whatever is on the felt and explains the
// logic: which bets are good, which are leaks, and what the smart next move
// is. It is purely advisory — it never tells you how much to bet and never
// places a bet for you. The whole doctrine it teaches is the only one the
// math supports: line + odds + come, keep the middle of the table empty.
import { NUMBERS, totalWagered } from "./engine.js";
import { maxOddsMultiple } from "./util.js";
import { ODDS_LADDER, DONT_LADDER } from "./bets.js";
import { nextRollOutcomes } from "./outcomes.js";
import { memoryInsights } from "./coachMemory.js";

// One insight = one chat bubble. level drives colour + the genie's badge.
const bad = (msg) => ({ level: "warn", msg });
const doIt = (msg) => ({ level: "do", msg });
const ok = (msg) => ({ level: "ok", msg });

export function getAdvice(game, rules, read = null) {
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
  const placeNums = NUMBERS.filter((n) => b.place[n] > 0 || b.buy[n] > 0);

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
    } else if (placeNums.length > 0) {
      insights.push(ok(`Your Place number${placeNums.length > 1 ? "s are" : " is"} working (${placeNums.join(", ")}). They pay when their number hits — but note that only a <b>Come bet</b> also wins on the 7 that clears them. See the hedge idea below.`));
    } else {
      insights.push(doIt(`Point is on and nothing's working. No need to wait for a new come-out — the <b>Come box</b> is the same Pass-Line play, live right now.`));
    }
  }

  // ---- personalized: what the coach has learned you like to bet ----
  // These read the persistent player profile (coachMemory.js) and speak to
  // your actual tendencies, not just the felt in front of you.
  for (const m of memoryInsights(read)) insights.push(m);

  // ---- combos & hedges: read the shape of the whole board ----
  const workingNums = new Set(placeNums.concat(comeRiding));
  if (game.phase === "point" && b.passline > 0) workingNums.add(pt);
  const coverage = workingNums.size;
  const ironCross = b.place[5] > 0 && b.place[6] > 0 && b.place[8] > 0 && b.field > 0;

  if (ironCross) {
    insights.push(doIt(`🧩 <b>Iron Cross</b> spotted — Place 5/6/8 + Field. You now collect on <b>every roll except the 7</b>, which feels unbeatable. The catch: the 7 is the likeliest roll (6 ways in 36) and it sweeps <b>all $${sevenLoss}</b> at once — blended cost ~2.3%. If you're running it, a <b>Come bet</b> is the honest counter: it's the one wager that <i>pays you</i> on that exact 7.`));
  } else if (game.phase === "point" && coverage >= 3 && b.come === 0 && sevenLoss > 0) {
    insights.push(doIt(`🛡 <b>Hedge idea:</b> you've got <b>${coverage} numbers</b> working — one 7 wipes out all <b>$${sevenLoss}</b> at once, and the 7 is the single most likely roll. The one add that <i>wins</i> on that seven-out is a <b>Come bet</b>. It won't beat the house edge, but it turns your worst roll into a partial score — a genuine variance hedge, not a system.`));
  } else if (game.phase === "point" && coverage >= 2 && b.field > 0 && !ironCross) {
    insights.push(ok(`🧩 <b>Combo read:</b> the Field pays 2·3·4·9·10·11·12 and your numbers cover the middle — together you collect on nearly everything but the 7. On its own the Field is a leak (${rules.fieldTriple ? "2.78%" : "5.56%"}), but inside this spread it's plugging the outside-number gaps. Just know what it all shares: the 7 takes the whole board.`));
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

  // ---- quiet praise for the good shapes ----
  if (b.passline > 0 && b.passodds > 0 && comeRiding.length >= 2 && comeRiding.every((n) => b.comeOdds[n] > 0)) {
    insights.push(ok(`⭐ Textbook <b>3-Point Molly</b> — line + two come numbers, all backed with odds. This is the lowest-edge way to keep three numbers working. Nothing to add; ride it.`));
  } else if (b.place[6] > 0 || b.place[8] > 0) {
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

// ---------------------------------------------------------------------------
// Post-roll recap — the interactive, teaching half of the coach. Given the
// full context of the roll that just happened, it narrates what the dice did
// to your bets and drops a playful, genuinely educational nugget: why the 7
// ended the hand, what a natural is, which bets that number pays, etc.
// ---------------------------------------------------------------------------

const WAYS = { 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 5, 9: 4, 10: 3, 11: 2, 12: 1 };
const ODDNAMES = { 2: "snake eyes", 3: "ace-deuce", 11: "yo (eleven)", 12: "boxcars" };

// Which standard bets a given total pays, for the "this number pays…" teacher.
function paysOn(t, isHard, phase) {
  const p = [];
  if (phase === "comeout" && (t === 7 || t === 11)) p.push("Pass Line");
  if (phase === "comeout" && (t === 2 || t === 3 || t === 12)) p.push("Don't Pass");
  if ([2, 3, 4, 9, 10, 11, 12].includes(t)) p.push("Field");
  if (t === 7) p.push("Any Seven");
  if ([2, 3, 12].includes(t)) p.push("Any Craps");
  if (t === 11) p.push("Yo");
  if (t === 2) p.push("Aces");
  if (t === 12) p.push("Boxcars");
  if (t === 3) p.push("Ace-Deuce");
  if (isHard && [4, 6, 8, 10].includes(t)) p.push(`Hard ${t}`);
  if ([4, 5, 6, 8, 9, 10].includes(t)) p.push(`Place/Come ${t}`);
  return p;
}

export function getRollRecap(lastRoll, rules) {
  if (!lastRoll) return null;
  const { d1, d2, total: t, delta, events, prevPhase, prevPoint, sevenOut, madePoint } = lastRoll;
  const isHard = d1 === d2;
  const ways = WAYS[t];
  const waysTxt = `the ${t} comes up <b>${ways} way${ways > 1 ? "s" : ""} in 36</b>`;

  // condense the engine events into coloured result lines
  const outcomes = events
    .filter((e) => e.type === "win" || e.type === "lose" || e.type === "push")
    .map((e) => ({ level: e.type === "win" ? "win" : e.type === "push" ? "push" : "lose", msg: e.m }));

  // the playful teaching nugget, most specific first
  let teach;
  if (sevenOut) {
    teach = `💀 <b>Seven-out.</b> The 7 is the most common roll — ${waysTxt} — so it ends the hand and sweeps the board. Only your free <b>Odds</b> are handed back untouched. That's the whole case for line + odds: the 7 can't overpay against it.`;
  } else if (madePoint) {
    teach = `🎯 <b>Point made!</b> You rolled the ${t} before a 7 — Pass Line and Odds pay true. Same shooter rolls a fresh come-out, so ride the heater and bet the line again.`;
  } else if (prevPhase === "comeout" && (t === 7 || t === 11)) {
    teach = `✨ <b>Natural ${t}!</b> On the come-out, 7 and 11 win the Pass Line outright — no point needed. (${waysTxt.charAt(0).toUpperCase() + waysTxt.slice(1)}.)`;
  } else if (prevPhase === "comeout" && [2, 3, 12].includes(t)) {
    teach = `🎲 <b>Craps — ${t}${ODDNAMES[t] ? ` (${ODDNAMES[t]})` : ""}.</b> On the come-out this loses the Pass Line (the 12 pushes the Don't). No point set — the shooter goes again.`;
  } else if (prevPhase === "comeout" && NUMBERS.includes(t)) {
    teach = `📍 <b>Point is ${t}.</b> The puck flips ON. Now a 7 ends everything, so this is the moment to back your line with <b>Odds</b> — 0% edge, the only bet the house can't tax.`;
  } else if (prevPhase === "point" && [2, 3, 11, 12].includes(t)) {
    teach = `🎯 A <b>${t}</b> is one-roll territory — it only touches the Field and center props. Your point (${prevPoint}) is untouched; keep rolling for it.`;
  } else if (prevPhase === "point" && NUMBERS.includes(t)) {
    const hit = outcomes.some((o) => o.level === "win");
    teach = hit
      ? `✓ The <b>${t}</b> paid your working numbers${isHard ? " (and it came the hard way!)" : ""}. The shooter keeps rolling toward the point (${prevPoint}).`
      : `The <b>${t}</b> is a live number, but you had nothing on it. The point (${prevPoint}) still stands — a Come bet would put the next number to work for you.`;
  } else {
    teach = `${waysTxt.charAt(0).toUpperCase() + waysTxt.slice(1)}.`;
  }

  const pays = paysOn(t, isHard, prevPhase);
  const level = delta > 0 ? "win" : delta < 0 ? "lose" : "push";
  const title = `🎲 ${d1} + ${d2} = ${t}${isHard ? " · hard" : ""}`;

  return { id: lastRoll.id, title, level, delta, outcomes, teach, pays };
}
