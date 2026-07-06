// Unit tests for the small formatting / lookup helpers.
import { test } from "node:test";
import assert from "node:assert/strict";
import { chipTier, edgeColor, usd, maxOddsMultiple } from "../../src/util.js";

test("chipTier picks the highest fitting denomination", () => {
  assert.equal(chipTier(1), "white");
  assert.equal(chipTier(4), "white");
  assert.equal(chipTier(5), "red");
  assert.equal(chipTier(25), "green");
  assert.equal(chipTier(50), "green");
  assert.equal(chipTier(100), "black");
  assert.equal(chipTier(250), "black");
});

test("edgeColor ramps free → cheap → moderate → expensive → sucker", () => {
  assert.equal(edgeColor(0), "#22d3ee");
  assert.equal(edgeColor(1.41), "#34d399");
  assert.equal(edgeColor(3), "#fbbf24");
  assert.equal(edgeColor(7), "#fb923c");
  assert.equal(edgeColor(16.67), "#f43f5e");
});

test("usd formats with a thousands separator", () => {
  assert.equal(usd(1000), "$1,000");
  assert.equal(usd(0), "$0");
  assert.equal(usd(12.5), "$12.5");
});

test("maxOddsMultiple honours 3-4-5x and flat multiples", () => {
  assert.equal(maxOddsMultiple(4, "345"), 3);
  assert.equal(maxOddsMultiple(5, "345"), 4);
  assert.equal(maxOddsMultiple(6, "345"), 5);
  assert.equal(maxOddsMultiple(8, "345"), 5);
  assert.equal(maxOddsMultiple(10, "10x"), 10);
  assert.equal(maxOddsMultiple(6, "2x"), 2);
});
