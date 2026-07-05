# Craps Trainer

[![CI & Deploy](https://github.com/ZeusNightBolt/CrapsTrainer/actions/workflows/deploy.yml/badge.svg)](https://github.com/ZeusNightBolt/CrapsTrainer/actions/workflows/deploy.yml)
[![Live demo](https://img.shields.io/badge/live-zeusnightbolt.github.io%2FCrapsTrainer-f5c518)](https://zeusnightbolt.github.io/CrapsTrainer/)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

An interactive, **mathematically verified** craps trainer and simulator. Learn every bet on the table,
its exact payout, and its true house edge — with a live coach that recommends the edge-minimizing next
move after every roll.

**▶ Play it now: <https://zeusnightbolt.github.io/CrapsTrainer/>**

![Craps Trainer — live table with a point set, odds loaded, and a place bet working](docs/screenshot.png)

## Why this exists

Most craps "strategy" content sells betting systems that cannot beat a fixed negative edge. This project
takes the opposite approach: it makes the edge visible everywhere — every tile on the felt is labeled and
color-coded by what the bet actually costs — and teaches the only decision that genuinely matters in the
game: **how much variance to buy for a fixed, small expected cost.** Every payout in the engine is
Monte-Carlo verified against published house-edge figures before any build ships.

## Features

### 🧞 Coach genie — advisory, not autopilot
A floating chat-help bubble in the bottom-right corner. Tap the genie and it reads whatever is on the felt
and **explains the logic** — never a dollar amount, never a bet placed for you:

- **What each bet on the table is doing**, in plain English (Pass Line: "7 or 11 wins now, 2·3·12 loses;
  when a point sets, back it with Odds — the only 0%-edge bet").
- **Leak detection with the reasoning** — the Field "looks like seven numbers, but 5·6·7·8 all lose"; Any
  Seven is "the single worst bet, 16.67%"; center props "run 11–17% and decide every roll"; the doey-don't
  "pays two house edges to mostly cancel."
- **The smart next move** — take odds, spread with a Come bet (the 3-Point Molly), or just roll.

A badge on the lamp signals when there's something worth reading (gold pulse = a smart move available,
red dot = a leak on the table), and a footer states your board exposure to the next 7 as a plain fact.

### 🎯 Next-roll panel
A per-total P&L readout (2 through 12) computed by running the actual resolution engine on all 36 die
combinations of the current state — so you can see exactly what every number does to you before you roll,
with cell brightness tracking probability.

### 🎯 Next-roll panel
A per-total P&L readout (2 through 12) computed by running the actual resolution engine on all 36 die
combinations of the current state — so you can see exactly what every number does to you before you roll,
with cell brightness tracking probability.

### 🎲 The mat — a real craps layout
The betting surface is drawn as one full side of a real craps table on its true wide proportions — point
boxes (4 5 SIX 8 NINE 10) with the ON puck riding the point, DON'T COME box, red COME/PASS LINE and
DON'T PASS bands, FIELD with the circled 2/12, free-odds and lay-odds zones, and the complete center
proposition block (hardways, one-roll numbers, ANY SEVEN, ANY CRAPS, C&E, HORN, WORLD). The whole felt is
aspect-ratio-locked and scaled with CSS container-query units, so it **zooms to fit any screen** — the
entire table is visible at once on an iPhone Pro Max with no scrolling, and it grows on desktop. **Tap a
region to bet the selected chip, double-tap to take the bet down, undo any betting action** (rolls are
final), and tap a riding Come/Don't-Come chip to back it with odds. Every real bet is playable, red casino
dice tumble for ~1.5 seconds before the result lands, and the roll log narrates every resolution in plain
English with exact amounts.

### ⚙️ Table rules — real casino variants
Three variants you will actually encounter, live-wired into every number on every tab:

- **Max odds**: 1× / 2× / 3-4-5× / 5× / 10× / 20× / 100×
- **Field paytable**: 12 pays 2:1 (5.56% edge) or 3:1 (2.78%)
- **Buy/Lay vig**: charged on the win only, or up front at placement

### 📊 Bets & Payouts — the reference
Every bet sorted by house edge under the currently selected table rules, with payout, win probability, and
resolution timing — plus both the Pass-side and Don't-side odds-dilution ladders with the active setting
highlighted.

### 📖 Strategy — the write-up
The tiered breakdown: what to bet, what's acceptable, and which "systems" (Iron Cross, hedging, the
doey-don't, World/Whirl) are variance illusions dressed up as edges. Covers variance and bankroll sizing
with simulated standard-deviation figures, a corrected decisions-per-hour cost model, and why dice setting
is not a real edge.

### 🧪 Simulator — see the distribution
Monte-Carlo comparison of real strategies (Pass + Max Odds, Don't Pass + Max Lay, 3-Point Molly,
Place 6 & 8, Iron Cross, and an Any-Seven worst-case demo) across thousands of sessions through the same
verified engine the table uses — mean, median, standard deviation, percentiles, bust rate, and the full
histogram of ending bankrolls.

### 📱 Built for phones
Fixed thumb-reach action bar (puck, live dice, bankroll, roll button) so rolling never requires scrolling,
floating coach card, single-row scrollable tabs, large touch targets, haptic feedback on resolutions, a
recent-rolls strip, safe-area-aware layout for notched screens, and `prefers-reduced-motion` support.

## Why you can trust the numbers

Every payout in the engine is verified against its theoretical house edge before it ships, and the
verification gates CI — a payout that drifts from theory fails the deploy:

```bash
npm run verify
```

The verifier runs three layers:

1. **Per-bet Monte-Carlo simulations** — every bet family simulated to convergence and compared with the
   standard published figures (realized vs. theoretical edge).
2. **Full come / don't-come lifecycle simulations** — box → travel → resolution, followed through
   point-mades and come-outs, asserting the published 1.41% / 1.36% edges.
3. **Exact-payout rule checks** for the cases averages can hide: come odds that are OFF on a come-out are
   no-action (returned whether the number hits or the 7 shows), don't-come lay odds always work, a winning
   come bet is paid *and taken down* (the real casino rule), hardways idle when off, and the bar-12 push
   returns the stake.

All edges derive from the 36-outcome dice sample space and corroborate
[Wizard of Odds](https://wizardofodds.com/games/craps/), the standard published reference.

## House-edge reference

| Bet | Pays | House edge |
|---|---|---|
| Don't Pass / Don't Come | 1:1 | **1.36%** |
| Pass Line / Come | 1:1 | **1.41%** |
| Odds (any point) | true odds | **0.00%** |
| Place 6 / 8 | 7:6 | 1.52% |
| Buy 4 / 10 (vig on win) | 2:1 − 5% | 1.67% |
| Field (12 pays 3:1) | 1:1 / 2:1 / 3:1 | 2.78% |
| Place 5 / 9 | 7:5 | 4.00% |
| Field (12 pays 2:1) | 1:1 / 2:1 | 5.56% |
| Place 4 / 10 | 9:5 | 6.67% |
| Big 6 / 8, Hard 6 / 8 | 1:1 / 9:1 | 9.09% |
| Hard 4 / 10, Any Craps, Yo, Ace-Deuce, C&E | 7:1 / 15:1 | 11.11% |
| Horn | 15:1 / 30:1 | 12.50% |
| World / Whirl | combo | 13.33% |
| Aces / Boxcars | 30:1 | 13.89% |
| Any Seven | 4:1 | **16.67%** |

Free odds behind a line bet dilute the blended edge on the total wager: Pass + 3-4-5× odds ≈ 0.37%;
Pass + 10× ≈ 0.18%; Pass + 100× ≈ 0.02%. The Don't side starts lower and ends lower: Don't Pass +
3-4-5× lay ≈ 0.27%. Both full ladders are simulated in `test/simulate.js` and displayed live in the app.

## Research notes

The bet math and strategy content were checked against published craps literature rather than taken at
face value, and corrected where the common summaries are imprecise:

- **Vig-always vs. vig-on-win** for Buy/Lay bets is not the flat 4.76% often quoted — that figure uses a
  "per bet made" convention that ignores repeat wins. Priced on the same per-resolution basis as every
  other bet in this app (see `src/engine.js`), vig-always works out to `vig × P(losing side)` for Buy
  (3.33% / 3.00% / 2.73%) and `layOdds × vig × P(number)` for Lay (0.83% / 1.33% / 1.89%) — cheaper than
  vig-on-win for Lay bets, pricier for Buy. Both conventions are Monte-Carlo verified.
- **"Decisions per hour" ≠ "rolls per hour."** A table runs roughly 100 rolls/hour, but line bets take
  ~3.4 rolls on average to resolve; pricing hourly cost off the roll count overstates it roughly 3×.
  One-roll bets get no such discount — a large part of why they bleed so much faster.
- **A winning come bet is paid and taken down.** It does not stay riding the number like a place bet —
  a frequent point of confusion the trainer now teaches explicitly, in the roll log and on the felt.
- **Dice setting / rhythm rolling** has no controlled evidence of beating the game; casinos require dice
  to hit a randomizing pyramid wall specifically to defeat it. Covered in the Strategy tab as a placebo.
- The **World/Whirl** bet's 7 outcome is a wash, not a win — the any-7 leg exactly refunds the other four
  units — so it is strictly worse than the plain Horn it is often pitched as an upgrade to.

Sources: [Wizard of Odds — Craps](https://wizardofodds.com/games/craps/) ·
[edge per bet made vs. per roll](https://wizardofodds.com/games/craps/appendix/2/) ·
[Three Point Molly](https://wizardofodds.com/gambling/three-point-molly/) ·
[dice setting](https://wizardofodds.com/ask-the-wizard/craps/dice/)

## Getting started

Requires Node.js 18+.

```bash
git clone https://github.com/ZeusNightBolt/CrapsTrainer.git
cd CrapsTrainer
npm install
npm run dev       # local dev server → http://localhost:5173
```

| Command | Purpose |
|---|---|
| `npm run dev` | Start the local development server |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run verify` | Run the Monte-Carlo engine verification (also gates CI) |

## Project structure

```
CrapsTrainer/
├── index.html                  # HTML shell (dark theme, PWA metas, favicon)
├── vite.config.js              # base: "./" — builds run from any path
├── .github/workflows/
│   └── deploy.yml              # verify + build on every push/PR; deploy on main
├── src/
│   ├── main.jsx                # React entry
│   ├── App.jsx                 # game state, controls, session stats, coach bar
│   ├── engine.js               # pure resolution engine (verified, UI-agnostic)
│   ├── coach.js                # next-best-move advisor — pure fn of (game, rules, chip)
│   ├── bets.js                 # bet reference + odds ladders (rules-aware)
│   ├── util.js                 # edge→color ramp, formatting, odds caps
│   ├── styles.css              # casino-feel styling, mobile-first
│   └── components/
│       ├── Table.jsx           # interactive felt — all bets, on-tile come/DC badges
│       ├── BetsReference.jsx   # sortable edge table + both odds ladders
│       ├── Strategy.jsx        # strategy write-up (rules-aware)
│       ├── Simulator.jsx       # Monte-Carlo strategy comparison
│       ├── Dice.jsx            # pip-rendered dice
│       └── Sparkline.jsx       # bankroll chart
├── test/
│   └── simulate.js             # Monte-Carlo + exact-payout verification
└── docs/
    └── screenshot.png
```

## Using the engine as a library

`src/engine.js` is UI-agnostic and side-effect free — usable in any JavaScript project or on a server:

```js
import { newGame, resolve } from "./src/engine.js";

let game = newGame(1000);        // { phase, point, bankroll, working, bets }
game.bets.passline = 25;         // place a bet
const out = resolve(game, 3, 4); // roll a 3 and a 4
// out.state  → new game state (input is never mutated)
// out.payout → total credited this roll (winnings + returned stakes)
// out.events → [{ type: 'win'|'lose'|'push'|'roll'|'info'|'sevenout', m }]
// out.roll   → [d1, d2, total]
game = out.state;
```

An optional fourth argument selects table variants:
`resolve(game, d1, d2, { fieldTriple: true, vigAlways: false })` (shown values are the defaults).

## Deployment

The production site is hosted on **GitHub Pages**:

> **https://zeusnightbolt.github.io/CrapsTrainer/**

`.github/workflows/deploy.yml` runs `npm run verify` and `npm run build` on every push and pull request
against `main` — a payout that drifts from theory fails the check — and additionally publishes `dist/` via
GitHub's official Pages actions on every push to `main`. No manual deploy step exists or is needed.

Because `vite.config.js` sets `base: "./"`, the build is path-independent: any static host (Netlify,
Vercel, Cloudflare Pages) works with build command `npm run build` and output directory `dist`.

## Security note

`npm audit` reports an advisory in `esbuild` (a transitive dependency of Vite),
[GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99). It affects only the local dev
server — not the production build or the deployed static site, which ship no server. Upgrading to Vite 8
closes it but is a breaking change; the project pins Vite 5 for stability.

## Disclaimer

This is an educational tool. Craps is a negative-expectation game; no bet or system in it has a positive
edge, and nothing in this project is gambling advice.

## License

MIT — see [LICENSE](LICENSE).
