// Unit tests for the advisory coach: the live "what now" read and the post-roll
// teaching recap. These are pure functions of game state + roll context.
import { test } from "node:test";
import assert from "node:assert/strict";
import { newGame, DEFAULT_RULES } from "../../src/engine.js";
import { getAdvice, getRollRecap } from "../../src/coach.js";

test("an empty come-out board steers you to the Pass Line", () => {
  const { insights, headline, exposure } = getAdvice(newGame(1000), DEFAULT_RULES);
  assert.ok(Array.isArray(insights) && insights.length >= 1);
  assert.equal(headline.level, "do");
  assert.match(headline.msg, /Pass Line/);
  assert.equal(exposure.seven, 0);            // nothing on the numbers yet
});

test("with a point and a naked pass line, the coach pushes free Odds", () => {
  const g = newGame(1000);
  g.phase = "point"; g.point = 6; g.bets.passline = 25;
  const { insights } = getAdvice(g, DEFAULT_RULES);
  assert.ok(insights.some((i) => /Odds/.test(i.msg)));
});

test("getRollRecap returns null when there is no roll yet", () => {
  assert.equal(getRollRecap(null, DEFAULT_RULES), null);
});

test("a seven-out recap teaches why the 7 ends the hand", () => {
  const lastRoll = {
    id: 1, d1: 3, d2: 4, total: 7, delta: -25,
    events: [{ type: "sevenout", m: "Seven-out" }, { type: "lose", m: "Pass Line loses" }],
    prevPhase: "point", prevPoint: 6, newPhase: "comeout", newPoint: null,
    betsBefore: {}, madePoint: false, sevenOut: true,
  };
  const recap = getRollRecap(lastRoll, DEFAULT_RULES);
  assert.equal(recap.level, "lose");
  assert.match(recap.teach, /Seven-out/);
  assert.ok(recap.outcomes.length >= 1);
});

test("a come-out natural recap calls it a natural", () => {
  const lastRoll = {
    id: 2, d1: 5, d2: 6, total: 11, delta: 25,
    events: [{ type: "win", m: "Pass Line wins" }],
    prevPhase: "comeout", prevPoint: null, newPhase: "comeout", newPoint: null,
    betsBefore: {}, madePoint: false, sevenOut: false,
  };
  const recap = getRollRecap(lastRoll, DEFAULT_RULES);
  assert.equal(recap.level, "win");
  assert.match(recap.teach, /Natural/);
});
