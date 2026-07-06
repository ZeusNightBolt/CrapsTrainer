// Unit tests for the persistent coach memory. localStorage is undefined under
// node, so loadProfile falls back to an empty profile — exactly the guarded
// path the module ships for SSR/first-run.
import { test } from "node:test";
import assert from "node:assert/strict";
import { blankBets, DEFAULT_RULES } from "../../src/engine.js";
import { categoryBreakdown, loadProfile, recordRoll, readProfile, memoryInsights } from "../../src/coachMemory.js";

test("categoryBreakdown splits stake and expected drag by lane", () => {
  const b = blankBets();
  b.passline = 25; b.place[6] = 12; b.field = 10; b.any7 = 5; b.passodds = 50;
  const bd = categoryBreakdown(b, DEFAULT_RULES);
  assert.equal(bd.line.staked, 25);
  assert.equal(bd.place68.staked, 12);
  assert.equal(bd.field.staked, 10);
  assert.equal(bd.props.staked, 5);
  assert.equal(bd.odds.staked, 50);
  assert.equal(bd.odds.drag, 0);                       // odds carry no edge
  assert.ok(Math.abs(bd.line.drag - 25 * 0.0141) < 1e-9);
});

test("loadProfile returns an empty profile when there is no storage", () => {
  const p = loadProfile();
  assert.equal(p.rolls, 0);
  assert.equal(p.net, 0);
  assert.deepEqual(p.recent, []);
});

test("recordRoll folds one resolved roll into the profile without mutating it", () => {
  const p0 = loadProfile();
  const b = blankBets(); b.passline = 25;
  const p1 = recordRoll(p0, b, 25, DEFAULT_RULES);
  assert.equal(p0.rolls, 0, "original profile untouched");
  assert.equal(p1.rolls, 1);
  assert.equal(p1.net, 25);
  assert.deepEqual(p1.recent, [25]);
  assert.equal(p1.cats.line.rollsPresent, 1);
  assert.equal(p1.cats.line.staked, 25);
});

test("readProfile names the favourite lane by dollars wagered", () => {
  let p = loadProfile();
  const line = blankBets(); line.passline = 25;
  const field = blankBets(); field.field = 5;
  p = recordRoll(p, line, 10, DEFAULT_RULES);
  p = recordRoll(p, field, -5, DEFAULT_RULES);
  const read = readProfile(p);
  assert.equal(read.rolls, 2);
  assert.equal(read.net, 5);
  assert.equal(read.favorite.id, "line");             // 25 > 5 staked
  assert.ok(read.totalStaked >= 30);
});

test("memoryInsights stays quiet until there's enough history", () => {
  let p = loadProfile();
  const b = blankBets(); b.passline = 25;
  p = recordRoll(p, b, 0, DEFAULT_RULES);
  assert.deepEqual(memoryInsights(readProfile(p)), []); // 1 roll < threshold
});

test("memoryInsights flags a leak-heavy favourite once warmed up", () => {
  let p = loadProfile();
  const field = blankBets(); field.field = 20;
  for (let i = 0; i < 7; i++) p = recordRoll(p, field, -20, DEFAULT_RULES);
  const insights = memoryInsights(readProfile(p));
  assert.ok(insights.length >= 1);
  assert.ok(insights.some((i) => i.level === "warn"));
});
