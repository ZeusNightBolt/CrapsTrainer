// ---------------------------------------------------------------------------
// Craps resolution engine — pure, deterministic, UI-agnostic.
// Every payout below is Monte-Carlo-verified against its theoretical house edge
// (see test/simulate.js). Edge figures follow from the 36-outcome dice sample
// space and corroborate Wizard of Odds (wizardofodds.com/games/craps).
// ---------------------------------------------------------------------------

export const NUMBERS = [4, 5, 6, 8, 9, 10];

// winnings per unit staked
export const TRUE_ODDS = { 4: 2, 10: 2, 5: 1.5, 9: 1.5, 6: 1.2, 8: 1.2 };       // right-side odds
export const LAY_ODDS  = { 4: 0.5, 10: 0.5, 5: 2 / 3, 9: 2 / 3, 6: 5 / 6, 8: 5 / 6 }; // wrong-side odds
export const PLACE_PAY = { 6: 7 / 6, 8: 7 / 6, 5: 7 / 5, 9: 7 / 5, 4: 9 / 5, 10: 9 / 5 };
export const HARD_PAY  = { 4: 7, 10: 7, 6: 9, 8: 9 };
export const VIG = 0.05; // charged on the win only (modern strip convention)

// buy/lay net multipliers with 5% vig-on-win (the modern strip default)
export const BUY_PAY = Object.fromEntries(NUMBERS.map((n) => [n, TRUE_ODDS[n] - VIG]));
export const LAY_PAY = Object.fromEntries(NUMBERS.map((n) => [n, LAY_ODDS[n] * (1 - VIG)]));

// Some casinos charge the 5% commission up front, win or lose ("vig always"),
// instead of only deducting it from a win. The app collects that up-front vig
// as a one-time bankroll debit at the moment chips are placed (see App.jsx
// onPlace), so once it's paid the payout itself is just full true odds.
// Because the commission is a single fixed cost amortized over however many
// times the standing bet then wins before it's eventually taken down or loses,
// its edge (expressed on the same per-resolution handle basis as every other
// number here) works out to VIG * P(losing side) for Buy, and
// LAY_ODDS * VIG * P(number) for Lay — see test/simulate.js, which reproduces
// these by simulation: Buy 4/10 ≈ 3.33%, 5/9 ≈ 3.00%, 6/8 ≈ 2.73%;
// Lay 4/10 ≈ 0.83%, 5/9 ≈ 1.33%, 6/8 ≈ 1.89%. Note Lay bets are actually
// *cheaper* under vig-always than vig-on-win — one of the few cases where the
// "worse-sounding" convention is better for the player.
export function buyPay(n, vigAlways) { return vigAlways ? TRUE_ODDS[n] : TRUE_ODDS[n] - VIG; }
export function layPay(n, vigAlways) { return vigAlways ? LAY_ODDS[n] : LAY_ODDS[n] * (1 - VIG); }

export const DEFAULT_RULES = { fieldTriple: true, vigAlways: false };

const round = (x) => Math.round((x + Number.EPSILON) * 100) / 100;

// Fast structural clone of the known state shape (≈10× faster than structuredClone,
// which matters when resolving millions of rolls in the verifier).
const cloneNum = (o) => ({ 4: o[4], 5: o[5], 6: o[6], 8: o[8], 9: o[9], 10: o[10] });
function cloneState(s) {
  const b = s.bets;
  return {
    phase: s.phase, point: s.point, bankroll: s.bankroll, working: s.working,
    bets: {
      passline: b.passline, dontpass: b.dontpass, passodds: b.passodds, dpodds: b.dpodds,
      come: b.come, dontcome: b.dontcome,
      comePts: cloneNum(b.comePts), comeOdds: cloneNum(b.comeOdds),
      dcPts: cloneNum(b.dcPts), dcOdds: cloneNum(b.dcOdds),
      place: cloneNum(b.place), buy: cloneNum(b.buy), lay: cloneNum(b.lay),
      hard: { 4: b.hard[4], 6: b.hard[6], 8: b.hard[8], 10: b.hard[10] },
      field: b.field, any7: b.any7, anycraps: b.anycraps, yo: b.yo,
      aces: b.aces, boxcars: b.boxcars, aceDeuce: b.aceDeuce, horn: b.horn, ce: b.ce, world: b.world,
    },
  };
}

export function blankBets() {
  const num = () => ({ 4: 0, 5: 0, 6: 0, 8: 0, 9: 0, 10: 0 });
  return {
    passline: 0, dontpass: 0, passodds: 0, dpodds: 0,
    come: 0, dontcome: 0,
    comePts: num(), comeOdds: num(), dcPts: num(), dcOdds: num(),
    place: num(), buy: num(), lay: num(), hard: { 4: 0, 6: 0, 8: 0, 10: 0 },
    field: 0, any7: 0, anycraps: 0, yo: 0, aces: 0, boxcars: 0, aceDeuce: 0, horn: 0, ce: 0, world: 0,
  };
}

export function newGame(bankroll = 1000) {
  return { phase: "comeout", point: null, bankroll, working: false, bets: blankBets() };
}

export function rollDice(rng = Math.random) {
  return [1 + Math.floor(rng() * 6), 1 + Math.floor(rng() * 6)];
}

// Total currently-active wager across every bet type — used for the "on the
// table" readout and to detect when a simulated session has no live bets left.
export function totalWagered(b) {
  let s = b.passline + b.dontpass + b.passodds + b.dpodds + b.come + b.dontcome +
    b.field + b.any7 + b.anycraps + b.yo + b.aces + b.boxcars + b.aceDeuce + b.horn + b.ce + b.world;
  for (const g of ["place", "buy", "lay", "comePts", "comeOdds", "dcPts", "dcOdds"]) for (const n of NUMBERS) s += b[g][n];
  for (const n of [4, 6, 8, 10]) s += b.hard[n];
  return s;
}

// one-roll bet settlement helper
function oneRoll(B, key, won, mult, ev, label) {
  if (!B[key] || B[key] <= 0) return 0;
  let out = 0;
  if (won) { out = B[key] * mult + B[key]; ev.push({ type: "win", m: `${label} +$${round(B[key] * mult)}` }); }
  else ev.push({ type: "lose", m: `${label} −$${round(B[key])}` });
  B[key] = 0;
  return out;
}

// Resolve one roll. Returns { state, payout, events, roll }. state is a fresh object.
// `rules` selects table variants: fieldTriple (12 pays 3:1 vs 2:1) and vigAlways
// (buy/lay commission charged up front instead of deducted from a win only).
export function resolve(state, d1, d2, rules = DEFAULT_RULES) {
  const t = d1 + d2, isHard = d1 === d2;
  const s = cloneState(state);
  const B = s.bets;
  const pointPhase = s.phase === "point";
  const numbersWork = pointPhase || s.working; // place/buy/come-odds/hard on the come-out
  let payout = 0;
  const ev = [];
  const log = (type, m) => ev.push({ type, m });

  // ---- one-roll: Field ----
  if (B.field > 0) {
    const twelvePay = rules.fieldTriple ? 4 : 3; // total return (winnings+stake) on a 12
    if ([3, 4, 9, 10, 11].includes(t)) { payout += B.field * 2; log("win", `Field +$${round(B.field)}`); }
    else if (t === 2) { payout += B.field * 3; log("win", `Field (2) +$${round(B.field * 2)}`); }
    else if (t === 12) { payout += B.field * twelvePay; log("win", `Field (12) +$${round(B.field * (twelvePay - 1))}`); }
    else log("lose", `Field −$${round(B.field)}`);
    B.field = 0;
  }

  // ---- one-roll: center props ----
  payout += oneRoll(B, "any7", t === 7, 4, ev, "Any Seven");
  payout += oneRoll(B, "anycraps", [2, 3, 12].includes(t), 7, ev, "Any Craps");
  payout += oneRoll(B, "yo", t === 11, 15, ev, "Yo (11)");
  payout += oneRoll(B, "aces", t === 2, 30, ev, "Aces (2)");
  payout += oneRoll(B, "boxcars", t === 12, 30, ev, "Boxcars (12)");
  payout += oneRoll(B, "aceDeuce", t === 3, 15, ev, "Ace-Deuce (3)");
  if (B.horn > 0) {
    const u = B.horn / 4;
    if (t === 2 || t === 12) { payout += u * 30 + u; log("win", `Horn hits ${t}`); }
    else if (t === 3 || t === 11) { payout += u * 15 + u; log("win", `Horn hits ${t}`); }
    else log("lose", "Horn loses");
    B.horn = 0;
  }
  if (B.ce > 0) {
    const h = B.ce / 2;
    if ([2, 3, 12].includes(t)) { payout += h * 7 + h; log("win", "C&E (craps)"); }
    else if (t === 11) { payout += h * 15 + h; log("win", "C&E (eleven)"); }
    else log("lose", "C&E loses");
    B.ce = 0;
  }
  // World/Whirl: a Horn (1 unit each on 2/3/11/12) plus 1 unit on Any Seven.
  // A 7 is a wash — the any-7 leg's 4:1 payout exactly refunds the other four
  // units — so unlike a plain Horn, hitting the most likely number nets zero.
  if (B.world > 0) {
    const u = B.world / 5;
    if (t === 2 || t === 12) { payout += u * 30 + u; log("win", `World hits ${t}`); }
    else if (t === 3 || t === 11) { payout += u * 15 + u; log("win", `World hits ${t}`); }
    else if (t === 7) { payout += u * 4 + u; log("push", "World: 7 is a wash"); }
    else log("lose", "World loses");
    B.world = 0;
  }

  // ---- hardways (working per toggle) ----
  if (numbersWork) {
    for (const n of [4, 6, 8, 10]) {
      if (B.hard[n] > 0) {
        if (t === n && isHard) { payout += B.hard[n] * HARD_PAY[n]; log("win", `Hard ${n} +$${round(B.hard[n] * HARD_PAY[n])}`); }
        else if (t === n || t === 7) { log("lose", `Hard ${n} −$${round(B.hard[n])}`); B.hard[n] = 0; }
      }
    }
  }

  // ---- come / don't-come points ----
  // Casino rules encoded here:
  //  * A traveled come/don't-come FLAT bet always works, come-out included.
  //  * Come ODDS are off on the come-out (unless the working toggle is on).
  //    Odds that are OFF are no-action either way: returned when the number
  //    hits AND returned when the 7 shows — never paid, never lost.
  //  * Don't-come lay odds always work (the don't side is never turned off).
  //  * A winning come/don't-come bet is PAID AND TAKEN DOWN — it does not
  //    stay riding on the number like a place bet. Re-bet the come box to
  //    keep a number covered (that's the whole 3-Point Molly loop).
  for (const n of NUMBERS) {
    if (B.comePts[n] > 0) {
      if (t === n) {
        payout += B.comePts[n] * 2;
        log("win", `Come ${n} wins +$${round(B.comePts[n])} — paid and taken down`);
        if (B.comeOdds[n] > 0) {
          if (numbersWork) { payout += B.comeOdds[n] * (1 + TRUE_ODDS[n]); log("win", `Come ${n} odds +$${round(B.comeOdds[n] * TRUE_ODDS[n])}`); }
          else { payout += B.comeOdds[n]; log("push", `Come ${n} odds were OFF (come-out) — $${round(B.comeOdds[n])} returned`); }
        }
        B.comePts[n] = 0; B.comeOdds[n] = 0;
      } else if (t === 7) {
        log("lose", `Come ${n} −$${round(B.comePts[n])}`);
        if (B.comeOdds[n] > 0) {
          if (numbersWork) log("lose", `Come ${n} odds −$${round(B.comeOdds[n])}`);
          else { payout += B.comeOdds[n]; log("push", `Come ${n} odds were OFF (come-out) — $${round(B.comeOdds[n])} returned`); }
        }
        B.comePts[n] = 0; B.comeOdds[n] = 0;
      }
    }
    if (B.dcPts[n] > 0) {
      if (t === 7) {
        payout += B.dcPts[n] * 2;
        log("win", `Don't Come ${n} wins +$${round(B.dcPts[n])} — paid and taken down`);
        if (B.dcOdds[n] > 0) { payout += B.dcOdds[n] * (1 + LAY_ODDS[n]); log("win", `Don't Come ${n} lay odds +$${round(B.dcOdds[n] * LAY_ODDS[n])}`); }
        B.dcPts[n] = 0; B.dcOdds[n] = 0;
      } else if (t === n) {
        log("lose", `Don't Come ${n} −$${round(B.dcPts[n] + B.dcOdds[n])}`);
        B.dcPts[n] = 0; B.dcOdds[n] = 0;
      }
    }
  }

  // ---- place / buy (working per toggle) ----
  if (numbersWork) {
    for (const n of NUMBERS) {
      if (B.place[n] > 0) {
        if (t === n) { payout += B.place[n] * PLACE_PAY[n]; log("win", `Place ${n} +$${round(B.place[n] * PLACE_PAY[n])}`); }
        else if (t === 7) { log("lose", `Place ${n} −$${round(B.place[n])}`); B.place[n] = 0; }
      }
      if (B.buy[n] > 0) {
        const pay = buyPay(n, rules.vigAlways);
        if (t === n) { payout += B.buy[n] * pay; log("win", `Buy ${n} +$${round(B.buy[n] * pay)}`); }
        else if (t === 7) { log("lose", `Buy ${n} −$${round(B.buy[n])}`); B.buy[n] = 0; }
      }
    }
  }
  // ---- lay bets (always working) ----
  for (const n of NUMBERS) {
    if (B.lay[n] > 0) {
      const pay = layPay(n, rules.vigAlways);
      if (t === 7) { payout += B.lay[n] * pay; log("win", `Lay ${n} +$${round(B.lay[n] * pay)}`); }
      else if (t === n) { log("lose", `Lay ${n} −$${round(B.lay[n])}`); B.lay[n] = 0; }
    }
  }

  // ---- line + come box + point ----
  if (!pointPhase) {
    if (B.passline > 0) {
      if (t === 7 || t === 11) { payout += B.passline * 2; log("win", "Pass Line wins"); B.passline = 0; }
      else if ([2, 3, 12].includes(t)) { log("lose", "Pass Line loses (craps)"); B.passline = 0; }
    }
    if (B.dontpass > 0) {
      if (t === 7 || t === 11) { log("lose", "Don't Pass loses"); B.dontpass = 0; }
      else if (t === 2 || t === 3) { payout += B.dontpass * 2; log("win", "Don't Pass wins"); B.dontpass = 0; }
      else if (t === 12) { payout += B.dontpass; log("push", "Don't Pass pushes (bar 12) — stake returned"); B.dontpass = 0; }
    }
    if (NUMBERS.includes(t)) { s.phase = "point"; s.point = t; log("info", `Point is ${t} — puck ON`); }
    else if (ev.length === 0) log("info", `Come-out ${t}`);
  } else {
    const pt = s.point;
    if (B.come > 0) {
      if (t === 7 || t === 11) { payout += B.come * 2; log("win", `Come wins on ${t} +$${round(B.come)}`); B.come = 0; }
      else if ([2, 3, 12].includes(t)) { log("lose", `Come loses (craps ${t}) −$${round(B.come)}`); B.come = 0; }
      else { B.comePts[t] += B.come; B.come = 0; log("info", `Come travels to ${t} — wins if ${t} repeats before a 7`); }
    }
    if (B.dontcome > 0) {
      if (t === 7 || t === 11) { log("lose", `Don't Come loses (${t}) −$${round(B.dontcome)}`); B.dontcome = 0; }
      else if (t === 2 || t === 3) { payout += B.dontcome * 2; log("win", `Don't Come wins (craps ${t}) +$${round(B.dontcome)}`); B.dontcome = 0; }
      else if (t === 12) { payout += B.dontcome; log("push", "Don't Come pushes (bar 12) — stake returned"); B.dontcome = 0; }
      else { B.dcPts[t] += B.dontcome; B.dontcome = 0; log("info", `Don't Come travels to ${t} — wins on a 7 before the ${t}`); }
    }
    if (t === pt) {
      if (B.passline > 0) { payout += B.passline * 2; log("win", "Pass Line wins (point made)"); B.passline = 0; }
      if (B.passodds > 0) { payout += B.passodds * (1 + TRUE_ODDS[pt]); log("win", "Pass Odds win"); B.passodds = 0; }
      if (B.dontpass > 0) { log("lose", "Don't Pass loses"); B.dontpass = 0; }
      if (B.dpodds > 0) { log("lose", "Lay Odds lose"); B.dpodds = 0; }
      s.phase = "comeout"; s.point = null; log("info", `Point ${pt} made — new come-out`);
    } else if (t === 7) {
      if (B.passline > 0) { log("lose", "Pass Line loses (seven-out)"); B.passline = 0; }
      if (B.passodds > 0) { log("lose", "Pass Odds lose"); B.passodds = 0; }
      if (B.dontpass > 0) { payout += B.dontpass * 2; log("win", "Don't Pass wins"); B.dontpass = 0; }
      if (B.dpodds > 0) { payout += B.dpodds * (1 + LAY_ODDS[pt]); log("win", "Lay Odds win"); B.dpodds = 0; }
      s.phase = "comeout"; s.point = null; log("sevenout", "Seven-out — line down, puck OFF");
    }
  }

  s.bankroll = round(s.bankroll + payout);
  return { state: s, payout: round(payout), events: ev, roll: [d1, d2, t] };
}
