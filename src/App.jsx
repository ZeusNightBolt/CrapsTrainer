import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import {
  resolve, newGame, blankBets, NUMBERS, LAY_ODDS, VIG, DEFAULT_RULES, totalWagered,
} from "./engine.js";
import { usd, maxOddsMultiple } from "./util.js";
import { PLACE_EDGE, buyEdge, layEdge, fieldEdge } from "./bets.js";
import { getAdvice } from "./coach.js";
import { loadProfile, saveProfile, forgetProfile, recordRoll, readProfile } from "./coachMemory.js";
import { nextRollOutcomes } from "./outcomes.js";
import { Dice } from "./components/Dice.jsx";
import Table from "./components/Table.jsx";
import BetsReference from "./components/BetsReference.jsx";
import Strategy from "./components/Strategy.jsx";
import Simulator from "./components/Simulator.jsx";
import CoachGenie from "./components/CoachGenie.jsx";
import RollResultCard from "./components/RollResultCard.jsx";
import NextRoll from "./components/NextRoll.jsx";
import MobileBar from "./components/MobileBar.jsx";
import RulesPanel from "./components/RulesPanel.jsx";
import { StakePanel, SessionPanel, RollLog, PresetsPanel } from "./components/Rail.jsx";

const CHIPS = [1, 5, 25, 100];
const CHIP_STYLE = {
  1: { background: "#e5e7eb", color: "#0a0b0f" },
  5: { background: "#f43f5e", color: "#fff" },
  25: { background: "#22c55e", color: "#0a0b0f" },
  100: { background: "#1e293b", color: "#fff" },
};

const rnd6 = () => Math.floor(Math.random() * 6);
const round2 = (x) => Math.round((x + Number.EPSILON) * 100) / 100;

// per-path edge for the live "expected drag" readout — rule-dependent entries
// (field, buy, lay) are looked up from bets.js so they can never drift from
// the reference table or the engine's own payout math.
function drag(b, rules) {
  const edge = {
    passline: 1.41, dontpass: 1.36, come: 1.41, dontcome: 1.36, passodds: 0, dpodds: 0,
    field: fieldEdge(rules.fieldTriple), any7: 16.67, anycraps: 11.11, yo: 11.11, aces: 13.89,
    boxcars: 13.89, aceDeuce: 11.11, horn: 12.5, ce: 11.11, world: 13.33,
  };
  const hardEdge = { 4: 11.11, 6: 9.09, 8: 9.09, 10: 11.11 };
  const numEdge = { place: PLACE_EDGE, buy: buyEdge(rules.vigAlways), lay: layEdge(rules.vigAlways), hard: hardEdge };
  let d = 0;
  for (const k in edge) d += (b[k] || 0) * edge[k] / 100;
  for (const g of ["place", "buy", "lay", "hard"]) for (const n in b[g]) d += b[g][n] * (numEdge[g][n] || 0) / 100;
  for (const n of NUMBERS) { d += b.comePts[n] * 1.41 / 100 + b.dcPts[n] * 1.36 / 100; }
  return d;
}

const INIT_STATS = { rolls: 0, points: 0, sevenOuts: 0, peak: 1000, trough: 1000, best: 0, worst: 0, start: 1000 };

// True P&L of a single roll. `out.payout` alone can't be it: bets are debited
// from the bankroll at placement, so a roll that loses every bet has payout 0
// and a winning line bet's payout includes the returned stake. Charging the
// stake of each bet cleared this roll (wagered-before minus wagered-after)
// against the credited payout yields the real net.
function rollDelta(before, after, payout) {
  return round2(payout - (totalWagered(before) - totalWagered(after)));
}

export default function App() {
  const [tab, setTab] = useState("table");
  const [game, setGame] = useState(() => newGame(1000));
  const [chip, setChip] = useState(25);
  const [mode, setMode] = useState("add");
  const [dice, setDice] = useState([1, 1]);
  const [rolling, setRolling] = useState(false);
  const [events, setEvents] = useState([{ type: "info", m: "Place a bet, then roll. Puck is OFF — this is a come-out roll." }]);
  const [hist, setHist] = useState([1000]);
  const [stats, setStats] = useState(INIT_STATS);
  const [rules, setRules] = useState({ ...DEFAULT_RULES, oddsMode: "345" });
  const [showRules, setShowRules] = useState(false);
  const [lastRolls, setLastRolls] = useState([]);
  const [flash, setFlash] = useState(null); // { key, amt } → floating ±$ after a roll
  const [coachOpen, setCoachOpen] = useState(false);
  const [lastRoll, setLastRoll] = useState(null); // full context of the most recent roll, for the coach recap
  const [undoStack, setUndoStack] = useState([]); // pre-mutation snapshots, cleared on each roll
  const [profile, setProfile] = useState(loadProfile); // persistent coach memory of your betting habits
  const pendingUndo = useRef(null);
  const iv = useRef(null);

  const b = game.bets;
  const table = useMemo(() => ({ sum: totalWagered(b), drag: drag(b, rules) }), [b, rules]);
  const pnl = round2(game.bankroll - stats.start);
  const outcomes = useMemo(() => nextRollOutcomes(game, rules), [game, rules]);
  const read = useMemo(() => readProfile(profile), [profile]);
  const { insights, exposure } = useMemo(() => getAdvice(game, rules, read), [game, rules, read]);

  // persist the coach's memory whenever it changes (localStorage, best-effort)
  useEffect(() => { saveProfile(profile); }, [profile]);

  // Table max for line odds: pass odds cap = flat × multiple; don't-side lay
  // odds cap is expressed as lay-to-WIN the same multiple.
  function oddsCap(path, bets) {
    const mult = maxOddsMultiple(game.point, rules.oddsMode);
    if (path === "passodds") return bets.passline * mult;
    if (path === "dpodds") return Math.round((bets.dontpass * mult) / LAY_ODDS[game.point]);
    return Infinity;
  }

  const canPlace = useCallback((path) => {
    if (rolling) return false;
    if (path === "passline" || path === "dontpass") return game.phase === "comeout";
    if (path === "come" || path === "dontcome") return game.phase === "point";
    if (path === "passodds") return game.phase === "point" && b.passline > 0 && b.passodds < b.passline * maxOddsMultiple(game.point, rules.oddsMode);
    if (path === "dpodds") return game.phase === "point" && b.dontpass > 0 && b.dpodds < Math.round((b.dontpass * maxOddsMultiple(game.point, rules.oddsMode)) / LAY_ODDS[game.point]);
    return true;
  }, [rolling, game.phase, game.point, b, rules.oddsMode]);

  // Every betting mutation flows through here, so undo comes for free: a
  // pre-mutation snapshot is pushed whenever the bets or bankroll actually
  // change. The stack clears on each roll — you can't un-ring the dice.
  function mutate(fn) {
    pendingUndo.current = null;
    setGame((g) => {
      const bets = structuredClone(g.bets);
      const bankroll = round2(fn(bets, g.bankroll, g));
      const changed = bankroll !== g.bankroll || JSON.stringify(bets) !== JSON.stringify(g.bets);
      pendingUndo.current = changed ? { bets: g.bets, bankroll: g.bankroll } : null;
      return changed ? { ...g, bankroll, bets } : g;
    });
    setUndoStack((s) => (pendingUndo.current ? [...s.slice(-19), pendingUndo.current] : s));
  }
  function undo() {
    if (!undoStack.length || rolling) return;
    const last = undoStack[undoStack.length - 1];
    setGame((g) => ({ ...g, bets: structuredClone(last.bets), bankroll: last.bankroll }));
    setUndoStack((s) => s.slice(0, -1));
  }
  function addPath(bets, path, amt) { if (path.includes(":")) { const [gr, n] = path.split(":"); bets[gr][n] += amt; } else bets[path] += amt; }
  function getPath(bets, path) { if (path.includes(":")) { const [gr, n] = path.split(":"); return bets[gr][n]; } return bets[path]; }

  // Vig-always Buy/Lay commission is a one-time, non-refundable charge paid
  // the moment chips are added — see engine.js.
  function vigSurcharge(path, amt) {
    if (!rules.vigAlways || amt <= 0 || !path.includes(":")) return 0;
    const [gr, n] = path.split(":");
    if (gr === "buy") return round2(amt * VIG);
    if (gr === "lay") return round2(amt * LAY_ODDS[n] * VIG);
    return 0;
  }

  const onPlace = useCallback((path) => {
    if (mode === "remove") return onRemoveChip(path);
    if (!canPlace(path)) return;
    mutate((bets, bank) => {
      // clamp odds bets to the table max so the last chip can't overshoot the cap
      const amt = Math.min(chip, oddsCap(path, bets) - getPath(bets, path));
      if (amt <= 0) return bank;
      const total = amt + vigSurcharge(path, amt);
      if (bank < total) return bank;
      addPath(bets, path, amt);
      return bank - total;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, canPlace, chip, rules, game.point]);

  function onRemoveChip(path) {
    mutate((bets, bank) => { const cur = getPath(bets, path); if (cur <= 0) return bank; const back = Math.min(chip, cur); addPath(bets, path, -back); return bank + back; });
  }
  const onClear = useCallback((path) => {
    if (rolling) return;
    if ((path === "passline" || path === "dontpass") && game.phase === "point") return;
    mutate((bets, bank) => { const cur = getPath(bets, path); addPath(bets, path, -cur); return bank + cur; });
  }, [rolling, game.phase]);

  function addMaxOdds(side) {
    if (game.phase !== "point") return;
    const pt = game.point, mult = maxOddsMultiple(pt, rules.oddsMode);
    mutate((bets, bank) => {
      // partial odds are always allowed — take whatever the bankroll covers
      if (side === "pass" && bets.passline > 0) { const amt = Math.min(bets.passline * mult - bets.passodds, bank); if (amt > 0) { bets.passodds += amt; return bank - amt; } }
      if (side === "dont" && bets.dontpass > 0) { const amt = Math.min(Math.round(bets.dontpass * mult / LAY_ODDS[pt]) - bets.dpodds, bank); if (amt > 0) { bets.dpodds += amt; return bank - amt; } }
      return bank;
    });
  }
  const onComeOdds = useCallback((side, n) => {
    mutate((bets, bank) => {
      const mult = maxOddsMultiple(n, rules.oddsMode);
      if (side === "come") { const cap = bets.comePts[n] * mult; const want = Math.min(chip, cap - bets.comeOdds[n]); if (want > 0 && bank >= want) { bets.comeOdds[n] += want; return bank - want; } }
      else { const cap = Math.round(bets.dcPts[n] * mult / LAY_ODDS[n]); const want = Math.min(chip, cap - bets.dcOdds[n]); if (want > 0 && bank >= want) { bets.dcOdds[n] += want; return bank - want; } }
      return bank;
    });
  }, [chip, rules.oddsMode]);

  function toggleWorking() { setGame((g) => ({ ...g, working: !g.working })); }

  const roll = useCallback(() => {
    if (rolling) return;
    if (totalWagered(game.bets) === 0) { setEvents([{ type: "info", m: "No bets on the table. Place at least one bet first." }]); return; }
    setRolling(true);
    setUndoStack([]); // dice in the air — betting decisions are final
    let n = 0;
    // ~1.1s of tumble before the result lands: 12 shake frames at 90ms
    iv.current = setInterval(() => {
      setDice([1 + rnd6(), 1 + rnd6()]);
      if (++n > 11) {
        clearInterval(iv.current);
        const d1 = 1 + rnd6(), d2 = 1 + rnd6();
        setDice([d1, d2]);
        const out = resolve(game, d1, d2, rules);
        const delta = rollDelta(game.bets, out.state.bets, out.payout);
        const sevenOut = out.events.some((e) => e.type === "sevenout");
        const madePoint = out.events.some((e) => e.m.includes("Point") && e.m.includes("made"));
        setGame(out.state);
        setHist((h) => [...h.slice(-119), out.state.bankroll]);
        setEvents([{ type: "roll", m: `Rolled ${d1} + ${d2} = ${d1 + d2}` }, ...out.events]);
        setLastRolls((r) => [{ d1, d2, t: d1 + d2, delta, sevenOut }, ...r.slice(0, 9)]);
        // full context for the coach's post-roll recap (playful teaching)
        setLastRoll({
          id: Date.now(), d1, d2, total: d1 + d2, delta, events: out.events,
          prevPhase: game.phase, prevPoint: game.point,
          newPhase: out.state.phase, newPoint: out.state.point,
          betsBefore: game.bets, madePoint, sevenOut,
        });
        setProfile((p) => recordRoll(p, game.bets, delta, rules)); // teach the coach what you bet
        if (delta !== 0) setFlash({ key: Date.now(), amt: delta });
        if (navigator.vibrate) navigator.vibrate(sevenOut ? [30, 40, 60] : delta > 0 ? [12, 30, 12] : 12);
        setStats((s) => {
          return {
            ...s, rolls: s.rolls + 1,
            points: s.points + (madePoint ? 1 : 0),
            sevenOuts: s.sevenOuts + (sevenOut ? 1 : 0),
            peak: Math.max(s.peak, out.state.bankroll),
            trough: Math.min(s.trough, out.state.bankroll),
            best: Math.max(s.best, delta),
            worst: Math.min(s.worst, delta),
          };
        });
        setRolling(false);
      }
    }, 90);
  }, [rolling, game, rules]);

  const applyPreset = useCallback((kind) => {
    const bets = blankBets(); let cost = 0;
    const add = (path, v) => { addPath(bets, path, v); cost += v; };
    if (kind === "pass") add("passline", 25);
    if (kind === "dont") add("dontpass", 25);
    if (kind === "68") { add("place:6", 12); add("place:8", 12); }
    if (kind === "ironcross") { add("place:5", 10); add("place:6", 12); add("place:8", 12); add("field", 10); }
    if (kind === "props") { for (const p of ["hard:4", "hard:6", "hard:8", "hard:10"]) add(p, 5); add("any7", 5); add("yo", 5); add("horn", 8); }
    setGame((g) => {
      pendingUndo.current = { bets: g.bets, bankroll: g.bankroll };
      const refund = totalWagered(g.bets);
      return { ...g, bankroll: round2(g.bankroll + refund - cost), bets };
    });
    setUndoStack((s) => (pendingUndo.current ? [...s.slice(-19), pendingUndo.current] : s));
  }, []);

  const reset = useCallback(() => {
    setGame(newGame(1000)); setHist([1000]); setStats(INIT_STATS);
    setEvents([{ type: "info", m: "Reset. Bankroll $1,000." }]); setDice([1, 1]);
    setLastRolls([]); setFlash(null); setUndoStack([]); setLastRoll(null);
  }, []);

  const blendedEdge = table.sum ? (table.drag / table.sum) * 100 : 0;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <h1>Craps Trainer</h1>
          <div className="sub">Verified engine · house edge = the price · color-coded by cost</div>
        </div>
        <div className="hud">
          <div className={"puck " + (game.phase === "point" ? "on" : "off")}>{game.phase === "point" ? game.point : "OFF"}</div>
          <Dice dice={dice} rolling={rolling} />
          <div className="bankroll">
            <div className="k">Bankroll</div>
            <div className="v mono" key={flash ? "v" + flash.key : "v"}
              style={{ color: game.bankroll >= stats.start ? "#34d399" : "#f43f5e" }}>{usd(game.bankroll)}</div>
            {flash && (
              <div key={"f" + flash.key} className={"payfloat mono " + (flash.amt > 0 ? "up" : "down")}>
                {flash.amt > 0 ? "+" : "−"}{usd(Math.abs(flash.amt))}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="tabs">
        {[["table", "Table"], ["bets", "Bets & Payouts"], ["strategy", "Learn"], ["sim", "Simulator"]].map(([k, l]) => (
          <div key={k} className={"tab " + (tab === k ? "on" : "")} onClick={() => setTab(k)}>{l}</div>
        ))}
        <div className="grow" />
        <div className="tab rules-toggle" onClick={() => setShowRules(!showRules)}>{showRules ? "▾" : "▸"} Table rules</div>
      </div>

      {showRules && <RulesPanel rules={rules} onChange={setRules} />}

      {tab === "table" && (
        <>
          <div className="controlbar">
            <div className="chipbar" style={{ margin: 0 }}>
              {CHIPS.map((c) => (
                <div key={c} className={"chip mono " + (chip === c ? "on" : "")} style={CHIP_STYLE[c]} onClick={() => setChip(c)}>${c}</div>
              ))}
            </div>
            <div className="seg">
              <button className={mode === "add" ? "on" : ""} onClick={() => setMode("add")}>Add</button>
              <button className={mode === "remove" ? "on" : ""} onClick={() => setMode("remove")}>Remove</button>
            </div>
            <button className="btn ghost" onClick={undo} disabled={!undoStack.length || rolling} title="Undo the last betting action (rolls are final)">↩ Undo</button>
            <button className="btn ghost" onClick={reset} disabled={rolling} title="Clear the table and reset the bankroll to $1,000">↺ Reset $</button>
            <button className={"btn" + (game.working ? " on" : "")} onClick={toggleWorking} title="Are place/buy/hard/come-odds live on the come-out?">
              Come-out: {game.working ? "WORKING" : "OFF"}
            </button>
            {game.phase === "point" && b.passline > 0 && <button className="btn ghost" onClick={() => addMaxOdds("pass")}>+ Max Pass Odds</button>}
            {game.phase === "point" && b.dontpass > 0 && <button className="btn ghost" onClick={() => addMaxOdds("dont")}>+ Max Lay Odds</button>}
            <div className="grow" />
            <button className="btn primary roll-desktop" style={{ minWidth: 160 }} onClick={roll} disabled={rolling}>{rolling ? "ROLLING…" : "ROLL DICE"}</button>
          </div>

          {lastRolls.length > 0 && (
            <div className="rollstrip" aria-label="Recent rolls">
              {lastRolls.map((r, i) => (
                <div key={lastRolls.length - i} className={"rollpip mono" + (r.sevenOut ? " out" : r.delta > 0 ? " up" : r.delta < 0 ? " down" : "")}>
                  <span className="rt">{r.t}</span>
                  <span className="rd">{r.d1}·{r.d2}</span>
                </div>
              ))}
            </div>
          )}

          <div className="layout">
            <Table bets={b} phase={game.phase} point={game.point} working={game.working} rules={rules}
              onPlace={onPlace} onClear={onClear} canPlace={canPlace} onComeOdds={onComeOdds} />

            <div className="rail">
              <StakePanel sum={table.sum} drag={table.drag} blendedEdge={blendedEdge} mode={mode} />
              <NextRoll outcomes={outcomes} hasBets={table.sum > 0} />
              <SessionPanel stats={stats} pnl={pnl} hist={hist} />
              <RollLog events={events} />
              <PresetsPanel onPreset={applyPreset} onReset={reset} />
            </div>
          </div>

          <MobileBar phase={game.phase} point={game.point} dice={dice} rolling={rolling}
            sum={table.sum} bankroll={game.bankroll} start={stats.start} onRoll={roll} />

          <RollResultCard lastRoll={lastRoll} rules={rules} />

          <CoachGenie insights={insights} exposure={exposure} lastRoll={lastRoll} rules={rules}
            read={read} onForget={() => setProfile(forgetProfile())}
            suppressBubble open={coachOpen} onToggle={setCoachOpen} />
        </>
      )}

      {tab === "bets" && <BetsReference rules={rules} />}
      {tab === "strategy" && <Strategy rules={rules} />}
      {tab === "sim" && <Simulator rules={rules} />}
    </div>
  );
}
