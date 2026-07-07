// Unit tests for the pure resolution engine. These pin the exact payout and
// state-transition contract that the Monte-Carlo verifier (test/simulate.js)
// only checks in aggregate — so a wrong sign or a missed "taken down" shows up
// as a precise failure here, not a drifted average.
import { test } from "node:test";
import assert from "node:assert/strict";
import { newGame, resolve, blankBets, totalWagered, NUMBERS, DEFAULT_RULES, cryptoDie, rollDiceCrypto } from "../../src/engine.js";

const withBets = (mut) => { const g = newGame(1000); mut(g.bets); return g; };

test("come-out natural 7 pays the pass line 1:1 and stays on the come-out", () => {
  const g = withBets((b) => { b.passline = 25; });
  const { state, payout } = resolve(g, 3, 4, DEFAULT_RULES); // 7
  assert.equal(payout, 50);                 // stake + winnings returned
  assert.equal(state.bankroll, 1050);
  assert.equal(state.phase, "comeout");
  assert.equal(state.bets.passline, 0);
});

test("come-out craps 2 loses the pass line", () => {
  const g = withBets((b) => { b.passline = 25; });
  const { payout, state } = resolve(g, 1, 1, DEFAULT_RULES);
  assert.equal(payout, 0);
  assert.equal(state.bets.passline, 0);
  assert.equal(state.phase, "comeout");
});

test("rolling a box number sets the point and leaves the flat bet up", () => {
  const g = withBets((b) => { b.passline = 25; });
  const { state, payout } = resolve(g, 2, 3, DEFAULT_RULES); // 5
  assert.equal(payout, 0);
  assert.equal(state.phase, "point");
  assert.equal(state.point, 5);
  assert.equal(state.bets.passline, 25);
});

test("making the point pays pass line + true-odds", () => {
  const g = newGame(1000);
  g.phase = "point"; g.point = 5;
  g.bets.passline = 20; g.bets.passodds = 40;
  const { state, payout } = resolve(g, 2, 3, DEFAULT_RULES); // 5
  // pass 20*2=40, odds 40*(1+1.5)=100
  assert.equal(payout, 140);
  assert.equal(state.phase, "comeout");
  assert.equal(state.point, null);
});

test("seven-out loses the line and clears the point", () => {
  const g = newGame(1000);
  g.phase = "point"; g.point = 6; g.bets.passline = 25; g.bets.passodds = 30;
  const { state, payout, events } = resolve(g, 3, 4, DEFAULT_RULES); // 7
  assert.equal(payout, 0);
  assert.equal(state.phase, "comeout");
  assert.ok(events.some((e) => e.type === "sevenout"));
});

test("a come bet travels to the number rolled", () => {
  const g = newGame(1000);
  g.phase = "point"; g.point = 8; g.bets.come = 10;
  const { state } = resolve(g, 2, 4, DEFAULT_RULES); // 6
  assert.equal(state.bets.come, 0);
  assert.equal(state.bets.comePts[6], 10);
});

test("a winning come bet is paid AND taken down (not left riding)", () => {
  const g = newGame(1000);
  g.phase = "point"; g.point = 8; g.bets.comePts[6] = 10;
  const { state, payout } = resolve(g, 2, 4, DEFAULT_RULES); // 6 repeats
  assert.equal(payout, 20);                 // 10 stake + 10 win
  assert.equal(state.bets.comePts[6], 0);   // taken down, unlike a place bet
});

test("don't pass pushes on the barred 12", () => {
  const g = withBets((b) => { b.dontpass = 25; });
  const { state, payout, events } = resolve(g, 6, 6, DEFAULT_RULES); // 12
  assert.equal(payout, 25);                 // stake returned, no win
  assert.equal(state.bets.dontpass, 0);
  assert.ok(events.some((e) => e.type === "push"));
});

test("field pays 2:1 on the 2, and 3:1 on the 12 under the triple rule", () => {
  const g = withBets((b) => { b.field = 10; });
  const rules = { fieldTriple: true, vigAlways: false };
  assert.equal(resolve(g, 1, 1, rules).payout, 30); // 2: 10 stake + 20 win (2:1)
  assert.equal(resolve(g, 6, 6, rules).payout, 40); // 12: 10 stake + 30 win (3:1)
  assert.equal(resolve(g, 6, 6, { ...rules, fieldTriple: false }).payout, 30); // 12 at 2:1 tables
  assert.equal(resolve(g, 2, 2, rules).payout, 20); // 4: even money
  assert.equal(resolve(g, 3, 4, rules).payout, 0);  // 7: loses
});

test("place 6 pays 7:6 and keeps working after a win", () => {
  const g = newGame(1000);
  g.phase = "point"; g.point = 8; g.bets.place[6] = 12;
  const { state, payout } = resolve(g, 2, 4, DEFAULT_RULES); // 6, point is 8
  assert.equal(payout, 14);               // 12 * 7/6
  assert.equal(state.bets.place[6], 12);  // place bets ride
});

test("hard 8 pays 9:1 only on the paired roll", () => {
  const g = newGame(1000);
  g.phase = "point"; g.point = 6; g.bets.hard[8] = 5;
  assert.equal(resolve(g, 4, 4, DEFAULT_RULES).payout, 45);       // hard 8
  assert.equal(resolve(g, 5, 3, DEFAULT_RULES).state.bets.hard[8], 0); // easy 8 kills it
});

test("any seven pays 4:1", () => {
  const g = withBets((b) => { b.any7 = 5; });
  assert.equal(resolve(g, 3, 4, DEFAULT_RULES).payout, 25); // 5 stake + 20 win
});

test("resolve is pure — it never mutates the input state", () => {
  const g = withBets((b) => { b.passline = 25; b.field = 10; });
  const snapshot = JSON.stringify(g);
  resolve(g, 3, 4, DEFAULT_RULES);
  assert.equal(JSON.stringify(g), snapshot);
});

test("totalWagered sums every live bet", () => {
  const b = blankBets();
  b.passline = 25; b.place[6] = 12; b.field = 10; b.hard[8] = 5;
  assert.equal(totalWagered(b), 52);
  assert.equal(totalWagered(blankBets()), 0);
});

test("NUMBERS are the six box points", () => {
  assert.deepEqual(NUMBERS, [4, 5, 6, 8, 9, 10]);
});

test("cryptoDie yields only integer faces 1-6 and reaches all six", () => {
  const seen = new Set();
  for (let i = 0; i < 6000; i++) {
    const f = cryptoDie();
    assert.ok(Number.isInteger(f) && f >= 1 && f <= 6, `face out of range: ${f}`);
    seen.add(f);
  }
  assert.equal(seen.size, 6);
});

test("cryptoDie faces are uniform (rejection sampling leaves no modulo bias)", () => {
  // 120k draws: per-face sd ≈ 0.107%, so a ±1% band is a >9-sigma gate —
  // it can only trip on a genuine bias (e.g. a reintroduced bare `% 6`).
  const n = 120000, counts = [0, 0, 0, 0, 0, 0];
  for (let i = 0; i < n; i++) counts[cryptoDie() - 1]++;
  for (let f = 0; f < 6; f++) {
    const p = counts[f] / n;
    assert.ok(Math.abs(p - 1 / 6) < 0.01, `face ${f + 1} freq ${p} drifted from 1/6`);
  }
});

test("rollDiceCrypto returns two independent in-range dice", () => {
  for (let i = 0; i < 1000; i++) {
    const [a, b] = rollDiceCrypto();
    assert.ok(a >= 1 && a <= 6 && b >= 1 && b <= 6);
  }
});
