// Coach memory — the coach's long-term context. It keeps a running, persistent
// record of what the player actually bets and how it works out, so the advice
// can stop being generic and start being *about you*: which bets you lean on,
// how much you've pushed through the expensive middle of the table, and what
// the math says that costs. Every dollar figure here is derived from the same
// verified per-bet edges the rest of the app uses (bets.js) — the memory adds
// context, never new "truth".
import { NUMBERS } from "./engine.js";
import { PLACE_EDGE, buyEdge, layEdge, fieldEdge } from "./bets.js";

const KEY = "craps.coach.memory.v1";

// The categories the coach thinks in. Order matters for display (best → worst).
export const CATS = [
  { id: "line", label: "Line (Pass / Come)", tier: "core" },
  { id: "odds", label: "Odds", tier: "free" },
  { id: "dont", label: "Don't side", tier: "core" },
  { id: "place68", label: "Place 6 & 8", tier: "good" },
  { id: "placeHi", label: "Place 4/5/9/10", tier: "meh" },
  { id: "buylay", label: "Buy / Lay", tier: "meh" },
  { id: "field", label: "Field", tier: "leak" },
  { id: "hard", label: "Hardways", tier: "leak" },
  { id: "props", label: "Center props", tier: "leak" },
];
const LABEL = Object.fromEntries(CATS.map((c) => [c.id, c.label]));
const TIER = Object.fromEntries(CATS.map((c) => [c.id, c.tier]));

// Split the live bets into (staked, expected-drag) per category, using the
// exact rule-dependent edges. Drag = dollars the house expects to keep from
// that stake — the honest price tag, not a realized result.
export function categoryBreakdown(bets, rules) {
  const bE = buyEdge(rules.vigAlways), lE = layEdge(rules.vigAlways);
  const fE = fieldEdge(rules.fieldTriple) / 100;
  const out = {};
  const add = (cat, stake, edge) => {
    if (stake <= 0) return;
    if (!out[cat]) out[cat] = { staked: 0, drag: 0 };
    out[cat].staked += stake;
    out[cat].drag += stake * edge;
  };

  add("line", bets.passline, 0.0141);
  add("line", bets.come, 0.0141);
  add("dont", bets.dontpass, 0.0136);
  add("dont", bets.dontcome, 0.0136);
  add("odds", bets.passodds + bets.dpodds, 0);
  for (const n of NUMBERS) {
    add("line", bets.comePts[n], 0.0141);
    add("dont", bets.dcPts[n], 0.0136);
    add("odds", bets.comeOdds[n] + bets.dcOdds[n], 0);
    const placeCat = n === 6 || n === 8 ? "place68" : "placeHi";
    add(placeCat, bets.place[n], PLACE_EDGE[n] / 100);
    add("buylay", bets.buy[n], bE[n] / 100);
    add("buylay", bets.lay[n], lE[n] / 100);
    add("hard", bets.hard[n], (n === 4 || n === 10 ? 11.11 : 9.09) / 100);
  }
  add("field", bets.field, fE);
  const propEdge = { any7: 0.1667, anycraps: 0.1111, yo: 0.1111, aceDeuce: 0.1111, aces: 0.1389, boxcars: 0.1389, horn: 0.125, ce: 0.1111, world: 0.1333 };
  for (const k in propEdge) add("props", bets[k], propEdge[k]);
  return out;
}

function emptyProfile() {
  const cats = {};
  for (const c of CATS) cats[c.id] = { rollsPresent: 0, staked: 0, drag: 0 };
  return { v: 1, rolls: 0, net: 0, recent: [], cats };
}

export function loadProfile() {
  try {
    const raw = typeof localStorage !== "undefined" && localStorage.getItem(KEY);
    if (!raw) return emptyProfile();
    const p = JSON.parse(raw);
    if (!p || p.v !== 1 || !p.cats) return emptyProfile();
    // heal any missing category (e.g. added in a later version)
    const base = emptyProfile();
    p.cats = { ...base.cats, ...p.cats };
    return p;
  } catch {
    return emptyProfile();
  }
}

export function saveProfile(p) {
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(KEY, JSON.stringify(p));
  } catch { /* private-mode / quota — memory just won't persist, no crash */ }
}

export function forgetProfile() {
  try { if (typeof localStorage !== "undefined") localStorage.removeItem(KEY); } catch { /* ignore */ }
  return emptyProfile();
}

// Fold one resolved roll into the profile (pure — returns a new object).
export function recordRoll(profile, betsBefore, delta, rules) {
  const p = { ...profile, cats: { ...profile.cats } };
  p.rolls += 1;
  p.net = Math.round((p.net + delta) * 100) / 100;
  p.recent = [...profile.recent.slice(-39), Math.round(delta * 100) / 100];
  const bd = categoryBreakdown(betsBefore, rules);
  for (const cat in bd) {
    const c = profile.cats[cat] || { rollsPresent: 0, staked: 0, drag: 0 };
    p.cats[cat] = {
      rollsPresent: c.rollsPresent + 1,
      staked: Math.round((c.staked + bd[cat].staked) * 100) / 100,
      drag: Math.round((c.drag + bd[cat].drag) * 100) / 100,
    };
  }
  return p;
}

// Derive the reads the coach and the memory panel display.
export function readProfile(profile) {
  const entries = CATS
    .map((c) => ({ id: c.id, label: c.label, tier: c.tier, ...profile.cats[c.id] }))
    .filter((e) => e.staked > 0);
  const totalStaked = entries.reduce((a, e) => a + e.staked, 0);
  const totalDrag = entries.reduce((a, e) => a + e.drag, 0);

  // "what you like to bet" = most money pushed through a non-free category
  const wagerCats = entries.filter((e) => e.id !== "odds");
  const favorite = wagerCats.slice().sort((a, b) => b.staked - a.staked)[0] || null;

  const leak = entries.filter((e) => e.tier === "leak");
  const leakStaked = leak.reduce((a, e) => a + e.staked, 0);
  const leakDrag = leak.reduce((a, e) => a + e.drag, 0);
  const goodStaked = entries.filter((e) => e.tier === "core" || e.tier === "free" || e.tier === "good").reduce((a, e) => a + e.staked, 0);

  // discipline = share of wagered dollars sitting on line/odds/place-6-8
  const discipline = totalStaked > 0 ? goodStaked / totalStaked : 1;
  const blendedEdge = totalStaked > 0 ? (totalDrag / totalStaked) * 100 : 0;

  return {
    rolls: profile.rolls,
    net: profile.net,
    recent: profile.recent,
    entries: entries.sort((a, b) => b.staked - a.staked),
    totalStaked, totalDrag, favorite,
    leakStaked, leakDrag, discipline, blendedEdge,
  };
}

// The personalized coaching lines. Returned as {level,msg} insights so the
// coach can splice them straight into the genie feed. Only fires once the
// player has enough history to say something honest (>= 6 rolls).
export function memoryInsights(read) {
  if (!read || read.rolls < 6) return [];
  const out = [];
  const money = (n) => "$" + (Math.round(n * 100) / 100).toLocaleString(undefined, { maximumFractionDigits: 2 });

  if (read.favorite) {
    const f = read.favorite;
    if (TIER[f.id] === "leak") {
      out.push({ level: "warn", msg: `🧠 <b>I've been watching your bets.</b> Your go-to is <b>${LABEL[f.id]}</b> — you've pushed <b>${money(f.staked)}</b> through it over ${read.rolls} rolls, and at its edge the math expects the house to keep about <b>${money(f.drag)}</b> of that. It's the most expensive habit on your table.` });
    } else if (f.id === "place68") {
      out.push({ level: "ok", msg: `🧠 <b>Reading your history:</b> you lean on <b>Place 6 & 8</b> — smart. At 1.52% they're the best number bets on the felt, and you've kept your expected drag to about <b>${money(f.drag)}</b> across ${read.rolls} rolls. Bet them in $6 units so the 7:6 pays clean.` });
    } else {
      out.push({ level: "ok", msg: `🧠 <b>Reading your history:</b> your favourite is the <b>${LABEL[f.id]}</b> — the cheapest lane in the game. ${money(f.staked)} wagered, only ~${money(f.drag)} of expected edge. This is exactly what a disciplined craps player's log looks like.` });
    }
  }

  if (read.leakStaked > 0 && read.discipline < 0.7) {
    out.push({ level: "warn", msg: `🧠 Across our sessions <b>${(100 * (1 - read.discipline)).toFixed(0)}%</b> of your action has been on the pricey middle (props / field / hardways) — expected cost so far about <b>${money(read.leakDrag)}</b>. Shift those chips to line + odds and the same bankroll lasts far longer.` });
  } else if (read.rolls >= 12 && read.discipline >= 0.85) {
    out.push({ level: "ok", msg: `🧠 <b>${(read.discipline * 100).toFixed(0)}%</b> of everything you've wagered has been on the cheap bets (line, odds, 6 & 8). Your blended edge is about <b>${read.blendedEdge.toFixed(2)}%</b> — you're playing this game about as correctly as it can be played.` });
  }

  return out;
}
