import { memo } from "react";
import { ODDS_MODES } from "../util.js";

// Table-rule variant selectors: max odds, Field paytable, Buy/Lay vig.
function RulesPanel({ rules, onChange }) {
  const set = (patch) => onChange({ ...rules, ...patch });
  return (
    <div className="panel" style={{ margin: "10px 0", display: "flex", flexWrap: "wrap", gap: 18 }}>
      <div>
        <div className="small" style={{ marginBottom: 6, textTransform: "uppercase", letterSpacing: ".08em" }}>Max odds</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {ODDS_MODES.map((m) => (
            <button key={m.id} className={"btn ghost" + (rules.oddsMode === m.id ? " on" : "")} style={{ fontSize: 11, padding: "6px 10px" }}
              onClick={() => set({ oddsMode: m.id })}>{m.label}</button>
          ))}
        </div>
      </div>
      <div>
        <div className="small" style={{ marginBottom: 6, textTransform: "uppercase", letterSpacing: ".08em" }}>Field pays 12</div>
        <div style={{ display: "flex", gap: 6 }}>
          <button className={"btn ghost" + (rules.fieldTriple ? " on" : "")} style={{ fontSize: 11, padding: "6px 10px" }} onClick={() => set({ fieldTriple: true })}>3:1 (2.78% edge)</button>
          <button className={"btn ghost" + (!rules.fieldTriple ? " on" : "")} style={{ fontSize: 11, padding: "6px 10px" }} onClick={() => set({ fieldTriple: false })}>2:1 (5.56% edge)</button>
        </div>
      </div>
      <div>
        <div className="small" style={{ marginBottom: 6, textTransform: "uppercase", letterSpacing: ".08em" }}>Buy/Lay vig</div>
        <div style={{ display: "flex", gap: 6 }}>
          <button className={"btn ghost" + (!rules.vigAlways ? " on" : "")} style={{ fontSize: 11, padding: "6px 10px" }} onClick={() => set({ vigAlways: false })}>On win only</button>
          <button className={"btn ghost" + (rules.vigAlways ? " on" : "")} style={{ fontSize: 11, padding: "6px 10px" }} onClick={() => set({ vigAlways: true })}>Always (paid at placement)</button>
        </div>
      </div>
    </div>
  );
}
export default memo(RulesPanel);
