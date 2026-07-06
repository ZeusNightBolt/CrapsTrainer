// Unit tests for the dice-math source of truth used by the Learn tab and the
// coach. Everything must fall straight out of the 36-outcome enumeration.
import { test } from "node:test";
import assert from "node:assert/strict";
import { TOTALS, COMBOS, WAYS, PROB, POINTS, pointRace, oddsAgainst, SEVEN_WAYS } from "../../src/diceMath.js";

test("totals cover 2..12", () => {
  assert.deepEqual(TOTALS, [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
});

test("each total's enumerated combinations equal its ways count", () => {
  for (const t of TOTALS) assert.equal(COMBOS[t].length, WAYS[t], `total ${t}`);
});

test("ways form the 1..6..1 pyramid and sum to 36", () => {
  assert.deepEqual(TOTALS.map((t) => WAYS[t]), [1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1]);
  assert.equal(TOTALS.reduce((a, t) => a + WAYS[t], 0), 36);
});

test("probabilities sum to exactly 1", () => {
  const sum = TOTALS.reduce((a, t) => a + PROB[t], 0);
  assert.ok(Math.abs(sum - 1) < 1e-12);
});

test("the 7 is the peak at 6 ways", () => {
  assert.equal(SEVEN_WAYS, 6);
  assert.equal(WAYS[7], 6);
});

test("odds-against reduce to clean ratios", () => {
  assert.equal(oddsAgainst(7), "5 : 1");   // 30:6
  assert.equal(oddsAgainst(2), "35 : 1");
  assert.equal(oddsAgainst(4), "11 : 1");  // 33:3 reduced
});

test("point race: P(make) = ways/(ways+6) and true odds reduce 6:ways", () => {
  assert.deepEqual(POINTS, [4, 5, 6, 8, 9, 10]);
  const r4 = pointRace(4);
  assert.ok(Math.abs(r4.makeP - 3 / 9) < 1e-12);
  assert.equal(r4.trueOdds, "2 : 1");
  const r5 = pointRace(5);
  assert.ok(Math.abs(r5.makeP - 4 / 10) < 1e-12);
  assert.equal(r5.trueOdds, "3 : 2");
  const r6 = pointRace(6);
  assert.ok(Math.abs(r6.makeP - 5 / 11) < 1e-12);
  assert.equal(r6.trueOdds, "6 : 5");
});

test("every enumerated combo actually sums to its total and uses legal faces", () => {
  for (const t of TOTALS) for (const [a, b] of COMBOS[t]) {
    assert.equal(a + b, t);
    assert.ok(a >= 1 && a <= 6 && b >= 1 && b <= 6);
  }
});
