# Probability, RNG & Payout-Math Audit — Craps Trainer

**Date:** 2026-07-07
**Scope:** `src/engine.js`, `src/diceMath.js`, `src/bets.js`, `src/outcomes.js`, `src/coach.js`,
`src/App.jsx`, `src/components/Simulator.jsx`, `test/unit/*.test.js`, `test/simulate.js`
**Auditor:** automated probability/RNG audit (Claude), cross-checked against closed-form theory
and Wizard of Odds published figures.

---

## 1. Methodology

Three independent layers of verification were used; a finding required agreement of all three
to be marked verified:

1. **Closed-form derivation.** Every payout multiple in `engine.js` (`TRUE_ODDS`, `LAY_ODDS`,
   `PLACE_PAY`, `HARD_PAY`, `BUY_PAY`, `LAY_PAY`, field/prop payouts hardcoded in `resolve()`)
   was re-derived by hand from the 36-outcome sample space of two independent d6.
2. **Exact enumeration through the real engine (no Monte-Carlo noise).** A throwaway script
   ran `resolve()` over all 36 ordered dice pairs (with point-race continuation for line bets)
   and computed exact house edges from the engine's actual payouts. Every result matched
   closed-form theory to at least 9 decimal places (see the per-bet table in §4).
3. **The repo's own gates.** `npm test` (46 unit + smoke assertions pinning exact payouts and
   state transitions) and `npm run verify` (deterministic-seed Monte-Carlo of ~300k
   resolutions per bet across 59 edge checks, 7 exact rule checks, 3M-roll dice-fairness
   checks, and `diceMath.js` source-of-truth checks). Both pass.

## 2. Findings

| # | Area | Severity | Finding | Status |
|---|------|----------|---------|--------|
| 1 | Live dice RNG (`App.jsx`, `Simulator.jsx`) | **Medium** | The live table and the in-app strategy simulator dealt dice with `Math.floor(Math.random() * 6)`. Distributionally uniform (no modulo bias), but `Math.random` is not cryptographically sound and violates the project convention that only the seeded PRNG (tests) or a crypto RNG (UI) may roll. | **Fixed.** Added `cryptoDie()` / `rollDiceCrypto()` to `engine.js`: `crypto.getRandomValues` bytes, rejection-sampled below 252 (= 42 × 6) so `% 6` is *exactly* uniform — no modulo bias. `App.jsx` and `Simulator.jsx` now roll with it. |
| 2 | RNG verification gap (`test/simulate.js`) | Low | The CI dice-fairness gate exercised only the seeded mulberry32 verifier die — the die the live table actually rolls was never gated. | **Fixed.** Added a 3M-roll "LIVE dice fairness" block gating `cryptoDie()`: each face 1/6 ± 0.4 pp, each total WAYS/36 ± 0.4 pp. Fails CI if bias is ever reintroduced. |
| 3 | Mislabeled test (`test/unit/engine.test.js`) | Cosmetic | Test named "field pays triple on the 2 under the 3:1 rule" — the 3:1 applies to the 12; the 2 pays 2:1 (the assertion was correct, the name wrong). | **Fixed.** Renamed and extended to assert 2→2:1, 12→3:1 (triple rule), 12→2:1 (double rule), 4→1:1, 7→lose. |
| 4 | Buy/Lay "vig-always" edge figures (`bets.js`, `engine.js`) | Informational | The app quotes Buy 4/10 under vig-always as 3.33%, not the classic published 4.76%. Not an error: 4.76% is the *per-bet-made* convention (one resolution per commission); the app amortizes the one-time commission over the standing bet's expected lifetime (winning buys stay up), i.e. edge = VIG × P(lose) = 5% × ⅔ = 3.33% for 4/10 — the same per-resolution handle basis used for every other stay bet. The divergence is explicitly documented in `engine.js` and reproduced by simulation. The per-bet 4.76% figure was independently re-derived (0.05/1.05) and confirmed as the *other* convention. | No change — deliberate, internally consistent, documented convention. Recommendation only (§5). |
| 5 | Everything else (all payout multiples, all resolution rules, `diceMath.js`, `outcomes.js`, coach edge quotes) | — | Exactly correct. See §3–§4. | Verified, no change. |

## 3. Resolution-logic verification

All checked against standard casino rules; all correct:

- **Come-out:** Pass wins 7/11, loses 2/3/12; Don't Pass wins 2/3, **pushes the barred 12**
  (stake returned, engine pays `B.dontpass * 1`), loses 7/11. Box number sets the point.
- **Point phase:** point repeat pays Pass 1:1 + Pass Odds at true odds; 7-out pays Don't Pass
  1:1 + lay odds at true odds and clears the board back to a come-out.
- **Come / Don't Come:** only placeable with the point on (UI-enforced); travel to the rolled
  box number; a winning come bet is **paid and taken down** (not left riding); traveled flat
  bets always work through the come-out; **come odds are OFF on the come-out** (no-action:
  returned on both a hit and a 7) unless the working toggle is on; **don't-come lay odds
  always work**. All seven of these fiddly cases are pinned by exact-payout rule checks in
  `test/simulate.js`.
- **Place/Buy/Hardways:** off on the come-out (no action either way — a come-out 7 does not
  take them) unless the working toggle is on; winning place/buy/hard bets stay up with
  winnings-only paid. **Lay bets always work.** All standard.
- **Odds caps:** pass odds ≤ flat × table multiple (3-4-5x etc.); don't/lay odds capped as
  lay-to-*win* the multiple (`flat × mult / LAY_ODDS[point]`). Correct convention.
- **Purity:** `resolve()` never conditions on roll history and never mutates its input
  (pinned by a unit test). `outcomes.js` derives next-roll EVs by running the real engine
  over all 36 pairs, so displayed numbers cannot drift from the payout code.
- **`diceMath.js`:** combos/ways/probabilities/point-race odds all exactly correct
  (1-2-3-4-5-6-5-4-3-2-1 pyramid, P(make) = w/(w+6), true odds 6:w reduced).

## 4. Per-bet edge verification (exact enumeration through `resolve()` vs theory)

Edges are per resolution for stay bets, per roll for one-roll bets, per decision for line
bets — matching how the app quotes them. "Engine exact" comes from enumerating the full
sample space through the real resolution code (zero sampling error).

| Bet | Payout in code | Engine exact | Theory | Match |
|---|---|---|---|---|
| Pass Line / Come | 1:1 | 1.4141% | 7/495 = 1.4141% | ✓ |
| Don't Pass / Don't Come (bar 12) | 1:1 | 1.3636% | 27/1980 = 1.3636% | ✓ |
| Pass/Come Odds 4/10, 5/9, 6/8 | 2:1, 3:2, 6:5 | 0.0000% | 0% (true odds) | ✓ |
| Don't/Lay Odds 4/10, 5/9, 6/8 | 1:2, 2:3, 5:6 | 0.0000% | 0% (true odds) | ✓ |
| Place 6/8 | 7:6 | 1.5152% | 1/66 = 1.52% | ✓ |
| Place 5/9 | 7:5 | 4.0000% | 4.00% | ✓ |
| Place 4/10 | 9:5 | 6.6667% | 1/15 = 6.67% | ✓ |
| Buy 4/10 (vig on win) | 2:1 − 5% of stake | 1.6667% | 1.67% | ✓ |
| Buy 5/9 (vig on win) | 3:2 − 5% | 2.0000% | 2.00% | ✓ |
| Buy 6/8 (vig on win) | 6:5 − 5% | 2.2727% | 2.27% | ✓ |
| Buy 4/10 (vig always, per bet made) | 2:1, 5% up front | 4.7619% | 0.05/1.05 = 4.76% | ✓ (app amortizes to 3.33% per resolution — see finding 4) |
| Lay 4/10 / 5/9 / 6/8 (vig on win) | 1:2 / 2:3 / 5:6 × 0.95 | 1.6667 / 2.0000 / 2.2727% | 1.67 / 2.00 / 2.27% | ✓ |
| Field (12 pays 3:1) | 1:1; 2→2:1; 12→3:1 | 2.7778% | 1/36 = 2.78% | ✓ |
| Field (12 pays 2:1) | 1:1; 2→2:1; 12→2:1 | 5.5556% | 2/36 = 5.56% | ✓ |
| Big 6/8 | 1:1 (reference table) | — | 9.09% | ✓ (documented as a trap; not a placeable bet in the UI) |
| Hard 6/8 | 9:1 | 9.0909% | 1/11 = 9.09% | ✓ |
| Hard 4/10 | 7:1 | 11.1111% | 1/9 = 11.11% | ✓ |
| Any Seven | 4:1 | 16.6667% | 6/36 = 16.67% | ✓ |
| Any Craps | 7:1 | 11.1111% | 4/36 = 11.11% | ✓ |
| Yo (11) / Ace-Deuce (3) | 15:1 | 11.1111% | 11.11% | ✓ |
| Aces (2) / Boxcars (12) | 30:1 | 13.8889% | 5/36 = 13.89% | ✓ |
| Horn (4 units) | 30:1 / 15:1 legs | 12.5000% | 18/144 = 12.5% | ✓ |
| C & E (2 units) | 7:1 / 15:1 legs | 11.1111% | 8/72 = 11.11% | ✓ |
| World (5 units) | Horn + Any-7 wash | 13.3333% | 24/180 = 13.33% | ✓ |

**Dice uniformity (live path, after fix):** `cryptoDie()` = `crypto.getRandomValues`
uint8, accepted only below 252 (= 42 × 6), then `% 6` — each face exactly 1/6 by
construction, each ordered pair exactly 1/36, two independent draws per roll. Empirically
gated in CI at 3M rolls: all faces 16.66–16.68% and all 11 totals within 0.04 pp of
WAYS/36. The blended-odds ladders (`ODDS_LADDER`, `DONT_LADDER`) match published
Pass+odds figures (0.85% @1x … 0.02% @100x) and were reproduced by the simulator.

## 5. Verdict

**SOUND** (after the RNG fix). Every payout multiple, every house-edge figure quoted in the
UI/coach, and all resolution rules match closed-form craps mathematics exactly. The one
material defect — `Math.random` dealing the live rolls — is fixed with a rejection-sampled
crypto d6, and CI now gates the live die's fairness directly.

### Recommendations (no code change made)

1. **Vig-always figures:** consider showing the classic per-bet 4.76% (Buy 4/10) alongside
   the amortized 3.33% in the Bets reference, since players will encounter 4.76% in
   virtually all published literature. The current footnoted convention is defensible but
   nonstandard at first glance.
2. `rollDice(rng = Math.random)` in `engine.js` now has no production callers; if kept as
   the seedable test API, consider making `rng` a required parameter so the `Math.random`
   default can never silently re-enter a live path.
3. `test/simulate.js`'s `TOL` of 1.5 pp is loose for a 300k-resolution sample (Pass Line
   noise at that N is ~0.2 pp); tightening to ~0.5 pp would catch subtler payout
   regressions (e.g. deducting the Lay vig from the stake instead of from the win shifts
   Lay 6/8 by only ~0.45 pp — invisible at the current tolerance).
