// The 36-outcome sample space of two fair dice, precomputed once. This is the
// single source of truth the Learn tab visualizes and the coach quotes — the
// same combinatorics the engine's payouts derive from and that test/simulate.js
// verifies against 3,000,000 simulated rolls. Nothing here is a magic number:
// every figure is generated from the enumeration of ordered (a, b) pairs.
export const TOTALS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

// Every ordered (die-a, die-b) pair that makes each total. length === ways.
export const COMBOS = (() => {
  const m = {};
  for (const t of TOTALS) m[t] = [];
  for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) m[a + b].push([a, b]);
  return m;
})();

// Ways to roll each total — the classic 1·2·3·4·5·6·5·4·3·2·1 pyramid.
export const WAYS = Object.fromEntries(TOTALS.map((t) => [t, COMBOS[t].length]));

// Exact probability of each total on one roll.
export const PROB = Object.fromEntries(TOTALS.map((t) => [t, WAYS[t] / 36]));

const gcd = (a, b) => (b ? gcd(b, a % b) : a);

// "5 : 1" style odds-against-rolling-this-total on a single roll.
export function oddsAgainst(t) {
  const w = WAYS[t];
  const against = 36 - w;
  const g = gcd(against, w);
  return `${against / g} : ${w / g}`;
}

// Common-language name for the flashier totals.
export const NICK = { 2: "snake eyes", 3: "ace-deuce", 7: "the seven", 11: "yo", 12: "boxcars" };

// The six box points and, for each, the true math of the game: how likely you
// are to make it before a 7, and the true-odds payout that pays (the Odds bet).
// Making the point is a race between WAYS[point] and WAYS[7] = 6, so
//   P(make) = ways / (ways + 6)   and   true odds = 6 : ways  (reduced).
export const POINTS = [4, 5, 6, 8, 9, 10];
export function pointRace(t) {
  const w = WAYS[t];
  const makeP = w / (w + 6);
  const g = gcd(6, w);
  return { total: t, ways: w, makeP, trueOdds: `${6 / g} : ${w / g}` };
}

// Aggregate reads the coach and the viz both use.
export const SEVEN_WAYS = WAYS[7];           // 6
export const SEVEN_PROB = PROB[7];           // 0.1667
