// Monte-Carlo verification of the resolution engine.
// Deterministic (fixed seed): simulates each bet to convergence, compares the
// realized house edge to theory, and EXITS NON-ZERO if any asserted bet drifts
// beyond tolerance — so it can gate CI. Run with: npm run verify
import { resolve, newGame, NUMBERS, DEFAULT_RULES } from "../src/engine.js";

const N = 300000;          // resolutions per bet (deterministic seed -> stable)
const TOL = 1.5;          // absolute %-edge tolerance (gross-bug detector)

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// Each simulation gets its own independently-seeded RNG stream (rather than
// sharing one global stream) so that adding, removing, or reordering checks
// never changes another check's sampled outcome.
let seedCounter = 0;
function freshDie() {
  const rng = mulberry32(20260703 + (seedCounter++) * 7919);
  return () => 1 + Math.floor(rng() * 6);
}

// Stay-up bets keep their stake on the table after a win (engine returns
// winnings only), so credit the stake back for handle accounting. `vigOnPlace`
// is a one-time cost charged only when the bet is freshly placed — the initial
// bet, and again each time a loss clears it and it's re-placed — never on a
// win, since a win leaves the same standing bet in place (see engine.js on
// why vig-always must be amortized this way rather than charged flat).
function edgeStay(set, isWin, isLoss, stake, point, rules = DEFAULT_RULES, vigOnPlace = 0) {
  const die = freshDie();
  let handle = 0, ret = 0, count = 0, guard = 0;
  let st = newGame(0); st.phase = "point"; st.point = point; st.working = true;
  set(st, stake); handle += vigOnPlace;
  while (count < N && guard++ < N * 60) {
    const d1 = die(), d2 = die(), t = d1 + d2;
    const out = resolve(st, d1, d2, rules); st = out.state;
    if (st.phase === "comeout") { st.phase = "point"; st.point = point; }
    if (isWin(t) || isLoss(t)) {
      handle += stake; count++;
      if (out.payout > 0) ret += out.payout + stake;
      if (isLoss(t)) { set(st, stake); handle += vigOnPlace; }
    }
  }
  return ((handle - ret) / handle) * 100;
}

// One-roll bets: engine returns stake+winnings on a win; bet clears each roll.
function edgeOneShot(set, stake, rules = DEFAULT_RULES) {
  const die = freshDie();
  let handle = 0, ret = 0, count = 0, guard = 0;
  let st = newGame(0); st.phase = "point"; st.point = 4; st.working = true;
  set(st, stake); handle += stake;
  while (count < N && guard++ < N * 60) {
    const out = resolve(st, die(), die(), rules); st = out.state; ret += out.payout;
    if (st.phase === "comeout") { st.phase = "point"; st.point = 4; }
    count++; if (count < N) { set(st, stake); handle += stake; }
  }
  return ((handle - ret) / handle) * 100;
}

// Full line decision. `multFn(point) -> odds multiple` lets this simulate any
// table-odds variant (1x/2x/3-4-5x/5x/10x/...), not just flat 1x.
function edgeLine(dont, multFn, n = N) {
  const die = freshDie();
  let handle = 0, ret = 0;
  const flat = dont ? "dontpass" : "passline";
  const oddsKey = dont ? "dpodds" : "passodds";
  for (let i = 0; i < n; i++) {
    let st = newGame(0);
    st.bets[flat] = 10; handle += 10; let placed = false, guard = 0;
    while (guard++ < 400) {
      const out = resolve(st, die(), die()); st = out.state; ret += out.payout;
      if (multFn && st.phase === "point" && !placed) {
        const amt = 10 * multFn(st.point); st.bets[oddsKey] = amt; handle += amt; placed = true;
      }
      if (st.bets[flat] === 0 && st.bets[oddsKey] === 0) break;
    }
  }
  return ((handle - ret) / handle) * 100;
}

// Full come/don't-come lifecycle: place the box bet while a point is on, then
// follow it wherever it travels — through point-mades, come-outs, and however
// many rolls it takes — until the flat bet finally resolves. This exercises
// the always-working flat rule and the travel bookkeeping end to end.
function edgeComeFamily(dont) {
  const die = freshDie();
  let handle = 0, ret = 0;
  for (let i = 0; i < N / 3; i++) {
    let st = newGame(0);
    let guard = 0;
    while (st.phase === "comeout" && guard++ < 50) st = resolve(st, die(), die()).state;
    st.bets[dont ? "dontcome" : "come"] = 10; handle += 10;
    guard = 0;
    while (guard++ < 400) {
      const out = resolve(st, die(), die()); st = out.state; ret += out.payout;
      const b = st.bets;
      const live = (dont ? b.dontcome : b.come) > 0 || NUMBERS.some((k) => (dont ? b.dcPts[k] : b.comePts[k]) > 0);
      if (!live) break;
    }
  }
  return ((handle - ret) / handle) * 100;
}

const results = [];
const check = (label, val, theory, assert = true) => results.push({ label, val, theory, assert });

// Deterministic single-roll rule checks — exact payouts for the fiddly cases
// (odds on/off, pushes, working toggles) that Monte-Carlo averages can hide.
const ruleResults = [];
function rule(label, setup, d1, d2, expectPayout, inspect) {
  const st = newGame(0);
  setup(st);
  const out = resolve(st, d1, d2);
  const okPayout = Math.abs(out.payout - expectPayout) < 1e-9;
  const okState = inspect ? inspect(out.state) : true;
  ruleResults.push({ label, ok: okPayout && okState, got: out.payout, want: expectPayout });
}

// Come odds OFF on the come-out are no-action: returned when the number hits…
rule("Come odds OFF returned on hit", (s) => { s.phase = "comeout"; s.working = false; s.bets.comePts[9] = 25; s.bets.comeOdds[9] = 100; },
  4, 5, 25 * 2 + 100);
// …and returned when the 7 shows (flat still loses).
rule("Come odds OFF returned on 7", (s) => { s.phase = "comeout"; s.working = false; s.bets.comePts[9] = 25; s.bets.comeOdds[9] = 100; },
  3, 4, 100);
// With the working toggle ON, come odds pay true odds on the come-out.
rule("Come odds WORKING paid on hit", (s) => { s.phase = "comeout"; s.working = true; s.bets.comePts[9] = 25; s.bets.comeOdds[9] = 100; },
  4, 5, 25 * 2 + 100 * (1 + 1.5));
// A winning come bet is paid and taken down — it must not stay on the number.
rule("Winning come bet comes down", (s) => { s.phase = "point"; s.point = 5; s.bets.comePts[6] = 25; },
  3, 3, 50, (st) => st.bets.comePts[6] === 0);
// Don't-come lay odds always work, come-out included.
rule("DC lay odds work on come-out", (s) => { s.phase = "comeout"; s.working = false; s.bets.dcPts[4] = 30; s.bets.dcOdds[4] = 40; },
  3, 4, 30 * 2 + 40 * 1.5);
// Hardways are no-action on the come-out when not working (bet stays up).
rule("Hardways idle when OFF", (s) => { s.phase = "comeout"; s.working = false; s.bets.hard[8] = 10; },
  4, 4, 0, (st) => st.bets.hard[8] === 10);
// Don't Pass bar-12: push, stake returned.
rule("Don't Pass bar-12 push", (s) => { s.phase = "comeout"; s.bets.dontpass = 25; }, 6, 6, 25);

check("Pass Line", edgeLine(false, null), 1.41);
check("Don't Pass", edgeLine(true, null), 1.36);
check("Come", edgeComeFamily(false), 1.41);
check("Don't Come", edgeComeFamily(true), 1.36);

// Table-odds ladder — blended edge as the odds multiple grows. 345 = the
// modern 3-4-5x standard (3x on 4/10, 4x on 5/9, 5x on 6/8). Small edges need
// more samples to separate signal from noise, so the biggest multiples run
// 5x the trials and stay informational (assert=false) rather than gating CI.
const m345 = (p) => ([4, 10].includes(p) ? 3 : [5, 9].includes(p) ? 4 : 5);
check("Pass + 1x odds", edgeLine(false, () => 1), 0.85, false);
check("Pass + 2x odds", edgeLine(false, () => 2), 0.61, false);
check("Pass + 3-4-5x odds", edgeLine(false, m345), 0.37, false);
check("Pass + 5x odds", edgeLine(false, () => 5), 0.33, false);
check("Pass + 10x odds", edgeLine(false, () => 10, N * 5), 0.18, false);
check("Pass + 20x odds", edgeLine(false, () => 20, N * 5), 0.10, false);
check("Pass + 100x odds", edgeLine(false, () => 100, N * 5), 0.02, false);

check("Don't + 1x lay", edgeLine(true, () => 1), 0.68, false);
check("Don't + 2x lay", edgeLine(true, () => 2), 0.46, false);
check("Don't + 3-4-5x lay", edgeLine(true, m345), 0.27, false);
check("Don't + 5x lay", edgeLine(true, () => 5), 0.23, false);
check("Don't + 10x lay", edgeLine(true, () => 10, N * 5), 0.12, false);

for (const n of NUMBERS)
  check(`Place ${n}`, edgeStay((s, v) => (s.bets.place[n] = v), (t) => t === n, (t) => t === 7,
    [6, 8].includes(n) ? 12 : 10, n === 4 ? 10 : 4), [6, 8].includes(n) ? 1.52 : [5, 9].includes(n) ? 4.0 : 6.67);

for (const n of NUMBERS)
  check(`Buy ${n}`, edgeStay((s, v) => (s.bets.buy[n] = v), (t) => t === n, (t) => t === 7, 20, n === 4 ? 10 : 4),
    [4, 10].includes(n) ? 1.67 : [5, 9].includes(n) ? 2.0 : 2.27);

for (const n of NUMBERS)
  check(`Lay ${n}`, edgeStay((s, v) => (s.bets.lay[n] = v), (t) => t === 7, (t) => t === n, 40, n === 4 ? 10 : 4),
    [4, 10].includes(n) ? 1.67 : [5, 9].includes(n) ? 2.0 : 2.27);

for (const n of [4, 6, 8, 10])
  check(`Hard ${n}`, edgeStay((s, v) => (s.bets.hard[n] = v), (t) => t === n, (t) => t === n || t === 7, 10, n === 4 ? 10 : 4),
    [6, 8].includes(n) ? 9.09 : 11.11);

check("Field", edgeOneShot((s, v) => (s.bets.field = v), 10), 2.78);
check("Any Seven", edgeOneShot((s, v) => (s.bets.any7 = v), 10), 16.67);
check("Any Craps", edgeOneShot((s, v) => (s.bets.anycraps = v), 10), 11.11);
check("Yo (11)", edgeOneShot((s, v) => (s.bets.yo = v), 10), 11.11);
check("Aces (2)", edgeOneShot((s, v) => (s.bets.aces = v), 10), 13.89, false);
check("Horn", edgeOneShot((s, v) => (s.bets.horn = v), 20), 12.5, false);
check("C&E", edgeOneShot((s, v) => (s.bets.ce = v), 20), 11.11, false);
check("World/Whirl", edgeOneShot((s, v) => (s.bets.world = v), 25), 13.33, false);

// Table-rule variants.
check("Field (2:1 / 2:1)", edgeOneShot((s, v) => (s.bets.field = v), 10, { ...DEFAULT_RULES, fieldTriple: false }), 5.56);

// Vig-always: commission is paid once at placement (5% of stake for Buy, 5% of
// the potential win for Lay), so its per-resolution-equivalent edge is that
// one-time cost amortized over the standing bet's expected lifetime — see the
// derivation in engine.js. It is NOT a flat 4.76% here (that figure is the
// "per bet made, ignoring repeat wins" convention used elsewhere; this app
// prices every other stay bet per-resolution, so vig-always is priced the
// same way for a fair comparison).
const LAY_ODDS = { 4: 0.5, 10: 0.5, 5: 2 / 3, 9: 2 / 3, 6: 5 / 6, 8: 5 / 6 };
const BUY_ALWAYS_EDGE = { 4: 3.33, 10: 3.33, 5: 3.0, 9: 3.0, 6: 2.73, 8: 2.73 };
const LAY_ALWAYS_EDGE = { 4: 0.83, 10: 0.83, 5: 1.33, 9: 1.33, 6: 1.89, 8: 1.89 };
const vigAlwaysRules = { ...DEFAULT_RULES, vigAlways: true };

for (const n of NUMBERS)
  check(`Buy ${n} (vig always)`, edgeStay((s, v) => (s.bets.buy[n] = v), (t) => t === n, (t) => t === 7,
    20, n === 4 ? 10 : 4, vigAlwaysRules, 20 * 0.05), BUY_ALWAYS_EDGE[n], false);
for (const n of NUMBERS)
  check(`Lay ${n} (vig always)`, edgeStay((s, v) => (s.bets.lay[n] = v), (t) => t === 7, (t) => t === n,
    40, n === 4 ? 10 : 4, vigAlwaysRules, 40 * LAY_ODDS[n] * 0.05), LAY_ALWAYS_EDGE[n], false);

let failed = 0;
console.log(`\n  rule checks (exact payouts)`);
console.log("  " + "-".repeat(46));
for (const r of ruleResults) {
  if (!r.ok) failed++;
  console.log(`  ${r.ok ? "ok  " : "FAIL"} ${r.label}` + (r.ok ? "" : ` (got ${r.got}, want ${r.want})`));
}

console.log(`\n  bet              realized   theory   delta`);
console.log("  " + "-".repeat(46));
for (const r of results) {
  const d = Math.abs(r.val - r.theory);
  const bad = r.assert && d > TOL;
  if (bad) failed++;
  const flag = bad ? " FAIL" : r.assert ? " ok" : " ~";
  console.log(
    "  " + r.label.padEnd(16) +
    (r.val.toFixed(2) + "%").padStart(8) +
    (r.theory.toFixed(2) + "%").padStart(9) +
    ("+/-" + d.toFixed(2)).padStart(9) + flag
  );
}
console.log("");
if (failed) { console.error(`  ${failed} bet(s) drifted > ${TOL}% from theory - engine may be broken.\n`); process.exit(1); }
console.log(`  All asserted bets within +/-${TOL}% of theory. Engine verified.\n`);
