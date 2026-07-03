# Craps Trainer

An interactive, **mathematically-verified** craps trainer. Learn every bet on the table, its exact
payout, and its **true house edge** — with the entire board color-coded by what each bet costs you.

Built because most craps "strategy" content sells systems that can't beat a fixed negative edge. This
tool does the opposite: it makes the edge visible and teaches the only decision that actually matters —
how much variance to buy for a fixed, small expected cost.

![Craps Trainer — live table with a point set, odds loaded, and a place bet working](docs/screenshot.png)

## What's inside

- **Table** — a live, tappable craps table. Place any real bet (line, odds, come/don't-come with odds,
  place, buy, lay, hardways, field, and the full center props including World/Whirl), toggle come-out
  working, roll the dice, and watch every bet resolve with a plain-English log, a bankroll sparkline, and
  session stats.
- **Table rules** — three real casino variants you'll actually run into, live-wired into every number on
  every tab: max odds (1x / 2x / 3-4-5x / 5x / 10x / 20x / 100x), the Field paytable (12 pays 2:1 or 3:1),
  and the Buy/Lay vig convention (charged on a win only, or up front at placement).
- **Bets & Payouts** — every bet sorted by house edge for the currently-selected table rules, with payout,
  win probability, and how it resolves, plus both the Pass-side and Don't-side odds-dilution ladders.
- **Strategy** — the tiered breakdown: what to bet, what's acceptable, and which "systems" (Iron Cross,
  hedging, the doey-don't, World/Whirl) are variance illusions dressed up as edges — plus a variance/bankroll
  section, a corrected "decisions per hour" cost model, and a note on why dice setting isn't a real edge.
- **Simulator** — Monte-Carlo strategy comparison. Pick a strategy (Pass + Max Odds, Don't Pass + Max Lay,
  3-Point Molly, Place 6 & 8, Iron Cross, or an Any-Seven worst-case demo), a unit size, session length, and
  trial count, and it runs thousands of sessions through the same verified engine the Table uses — showing
  the full distribution of outcomes, not just the headline edge percentage.

The house edge is encoded as color everywhere: cyan = 0% (free odds), green = cheap, amber = moderate,
orange = expensive, red = sucker.

Built to play well on a phone: a fixed thumb-reach bar (puck, dice, bankroll, roll button) so you never
scroll to roll, big touch targets, haptic feedback on resolutions, a recent-rolls strip, chip-badge bet
markers on every tile, and safe-area-aware layout for notched screens.

## Why you can trust the numbers

Every payout in the engine is **Monte-Carlo-verified** against its theoretical house edge before it ships.
The verification is committed as a runnable script:

```bash
npm run verify
```

It simulates each bet to statistical convergence and prints realized vs. theoretical edge, e.g.:

```
Pass Line      1.41%   theory 1.41%
Don't Pass     1.36%   theory 1.36%
Place 6        1.52%   theory 1.52%
Place 4        6.67%   theory 6.67%
Buy 4          1.67%   theory 1.67%
Hard 6         9.09%   theory 9.09%
Any Seven     16.67%   theory 16.67%
```

All edges derive from the 36-outcome dice sample space and corroborate
[Wizard of Odds](https://wizardofodds.com/games/craps/), the standard published reference. Buy/Lay figures
default to the modern convention of a 5% vig charged on the win only; the app also supports "vig always"
(commission paid once at placement) as a Table Rule, which — counterintuitively — is *cheaper* than vig-on-win
for Lay bets and *pricier* for Buy bets. The derivation and the Monte-Carlo checks for both conventions, plus
the full table-odds ladder (1x through 100x) and both Field paytables, are in `test/simulate.js`.

## House edge reference

| Bet | Pays | House edge |
|---|---|---|
| Don't Pass / Don't Come | 1:1 | **1.36%** |
| Pass Line / Come | 1:1 | **1.41%** |
| Odds (any point) | true odds | **0.00%** |
| Place 6 / 8 | 7:6 | 1.52% |
| Buy 4 / 10 (vig on win) | 2:1 − 5% | 1.67% |
| Field (12 pays 3:1) | 1:1 / 2:1 / 3:1 | 2.78% |
| Place 5 / 9 | 7:5 | 4.00% |
| Place 4 / 10 | 9:5 | 6.67% |
| Big 6 / 8, Hard 6 / 8 | 1:1 / 9:1 | 9.09% |
| Hard 4 / 10, Any Craps, Yo | 7:1 / 15:1 | 11.11% |
| Aces / Boxcars | 30:1 | 13.89% |
| Any Seven | 4:1 | **16.67%** |

Adding free odds behind a line bet dilutes the blended edge on your total wager: Pass + 3-4-5× odds ≈
0.37%; Pass + 10× ≈ 0.18%; Pass + 100× ≈ 0.02%. The Don't side dilutes similarly but starts lower and ends
lower: Don't Pass + 3-4-5× lay ≈ 0.27%. Both full ladders are Monte-Carlo simulated in `test/simulate.js` and
shown live on the Bets & Payouts tab.

## Research notes

The bet math and strategy content were checked against, and in places corrected relative to a first draft
by, published craps literature rather than taken at face value:

- **Vig-always vs. vig-on-win** for Buy/Lay bets is not a flat 4.76% on every number the way it's sometimes
  summarized — that figure is a "per bet made" convention. Priced on the same per-resolution basis as every
  other bet in this app (see `engine.js`), vig-always works out to `vig × P(losing side)` for Buy bets
  (3.33% / 3.00% / 2.73%) and `layOdds × vig × P(number)` for Lay bets (0.83% / 1.33% / 1.89%) — cheaper than
  vig-on-win for Lay, pricier for Buy. Both are Monte-Carlo verified.
- **"Decisions per hour" ≠ "rolls per hour."** A table runs roughly 100 rolls/hour, but Pass/Come-type bets
  take ~3.4 rolls on average to resolve, so pricing an hourly cost off the roll count overstates it roughly
  3×. One-roll bets (Field, props) don't get this discount, which is a real part of why they're so much more
  expensive per hour at a similar bet size.
- **Dice setting / rhythm rolling** has no controlled evidence of beating the game, and casinos require dice
  to hit a randomizing pyramid pattern specifically to defeat it. It's covered in the Strategy tab as a
  placebo, not a technique.
- The **World/Whirl** bet (added here; it wasn't in the original build) is a Horn plus an Any-Seven leg. Its
  7 outcome is a wash, not a win — the any-7 payout exactly refunds the other four units — which is a common
  point of confusion, since it's often pitched as a "safer Horn."

Sources consulted: [Wizard of Odds — Craps](https://wizardofodds.com/games/craps/),
[house edge per bet made vs. per roll](https://wizardofodds.com/games/craps/appendix/2/),
[Three Point Molly](https://wizardofodds.com/gambling/three-point-molly/), and
[dice setting / rhythm rolling](https://wizardofodds.com/ask-the-wizard/craps/dice/).

## Quick start

Requires Node.js 18+.

```bash
npm install
npm run dev       # local dev server (http://localhost:5173)
npm run build     # production build to dist/
npm run preview   # serve the production build locally
npm run verify    # run the Monte-Carlo engine verification
```

## Project structure

```
craps-trainer/
├── index.html                  # dark-themed HTML shell
├── vite.config.js
├── src/
│   ├── main.jsx                # React entry
│   ├── App.jsx                 # state, controls, rail, session stats
│   ├── engine.js               # pure resolution engine (verified)
│   ├── bets.js                 # bet reference + odds ladder data
│   ├── util.js                 # edge→color ramp, formatting, odds caps
│   ├── styles.css              # dark, responsive, mobile-first
│   └── components/
│       ├── Table.jsx           # interactive felt / all bets
│       ├── BetsReference.jsx   # sortable edge table + bars + both odds ladders
│       ├── Strategy.jsx        # strategy write-up, rules-aware
│       ├── Simulator.jsx       # Monte-Carlo strategy comparison
│       ├── Dice.jsx            # pip-rendered dice
│       └── Sparkline.jsx       # bankroll chart
└── test/
    └── simulate.js             # Monte-Carlo house-edge verification
```

## Using the engine on its own

`src/engine.js` is UI-agnostic and side-effect free — usable in any JS project or on a server.

```js
import { newGame, resolve } from "./src/engine.js";

let game = newGame(1000);      // { phase, point, bankroll, working, bets }
game.bets.passline = 25;       // place a bet
const out = resolve(game, 3, 4); // roll a 3 and a 4 (4th arg: table rules, defaults to vig-on-win + 3:1 field)
// out.state  -> new game state (immutable; input is not mutated)
// out.payout -> net credited this roll
// out.events -> [{ type: 'win'|'lose'|'push'|'roll'|'info'|'sevenout', m }]
// out.roll   -> [d1, d2, total]
game = out.state;
```

## Deploying to GitHub Pages

`vite.config.js` uses `base: "./"`, so the build works from any path, and `.github/workflows/deploy.yml` is
already set up: it runs `npm run verify` (failing the run if any payout drifts from theory) and `npm run
build` on every push and pull request against `main` — so PRs get a real status check — and additionally
publishes `dist/` via GitHub's official Pages actions when the push is to `main` itself. To turn it on:

1. Push this repo to GitHub.
2. In the repo's Settings → Pages, set **Source** to "GitHub Actions".
3. Push to `main` — the workflow builds and deploys automatically. The Pages URL appears in the Actions run
   summary and in Settings → Pages.

Any static host (Netlify, Vercel, Cloudflare Pages) also works with build command `npm run build` and output
directory `dist`.

## Security note

`npm audit` reports an advisory in `esbuild` (a transitive dependency of Vite),
[GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99). It affects only the **local dev
server** (`vite dev`) — it does not affect the production build in `dist/` or the deployed static site,
which ship no server. Upgrading to Vite 8 closes it but is a breaking change; pinned to Vite 5 here for
stability. Bump when convenient with `npm audit fix --force`.

## Disclaimer

This is an educational tool. Craps is a negative-expectation game; no bet or system in it has a positive
edge. Nothing here is gambling advice.

## License

MIT — see [LICENSE](LICENSE).
