import { useState, useMemo } from "react";
import { getBetReference, ODDS_LADDER, DONT_LADDER } from "../bets.js";
import { edgeColor } from "../util.js";

function Ladder({ title, rows, activeId }) {
  return (
    <div className="panel" style={{ marginBottom: 14 }}>
      <div className="small" style={{ marginBottom: 4, textTransform: "uppercase", letterSpacing: ".08em" }}>{title}</div>
      {rows.map((o) => (
        <div className="barrow" key={o.label} style={{ opacity: activeId && o.id !== activeId ? 0.45 : 1 }}>
          <span className="lb">{o.label}{activeId === o.id ? " ←" : ""}</span>
          <div className="bar" style={{ width: (o.edge / rows[0].edge) * 260, background: edgeColor(o.edge) }} />
          <span className="mono" style={{ color: edgeColor(o.edge), fontWeight: 800, fontSize: 11 }}>{o.edge.toFixed(2)}%</span>
        </div>
      ))}
    </div>
  );
}

export default function BetsReference({ rules }) {
  const [sort, setSort] = useState("edge");
  const reference = useMemo(() => getBetReference(rules), [rules]);
  const rows = useMemo(() => {
    const a = [...reference];
    if (sort === "edge") a.sort((x, y) => x.edge - y.edge);
    if (sort === "pay") a.sort((x, y) => parseFloat(y.pwin) - parseFloat(x.pwin));
    if (sort === "name") a.sort((x, y) => x.name.localeCompare(y.name));
    return a;
  }, [sort, reference]);

  const maxE = 16.67;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }} className="ladder-grid">
        <Ladder title="Pass Line + odds — this is the whole game" rows={ODDS_LADDER} activeId={rules.oddsMode} />
        <Ladder title="Don't Pass + lay odds — cheaper, lower variance" rows={DONT_LADDER} activeId={rules.oddsMode} />
      </div>

      <div className="panel" style={{ marginBottom: 14 }}>
        <div className="small" style={{ marginBottom: 8, textTransform: "uppercase", letterSpacing: ".08em" }}>
          House-edge ladder — expected loss per $100 wagered (current table rules)
        </div>
        {[...reference].sort((a, b) => a.edge - b.edge).map((b) => (
          <div className="barrow" key={b.name}>
            <span className="lb">{b.name}</span>
            <div className="bar" style={{ width: Math.max(2, (b.edge / maxE) * 300), background: edgeColor(b.edge) }} />
            <span className="mono" style={{ color: edgeColor(b.edge), fontWeight: 800, fontSize: 11 }}>{b.edge.toFixed(2)}%</span>
          </div>
        ))}
      </div>

      <div className="panel scroll">
        <table>
          <thead>
            <tr>
              <th onClick={() => setSort("name")}>Bet</th>
              <th className="r">Pays</th>
              <th className="r" onClick={() => setSort("pay")}>P(win)</th>
              <th className="r" onClick={() => setSort("edge")}>House edge ▾</th>
              <th>Resolves</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => (
              <tr key={b.name}>
                <td style={{ fontWeight: 700 }}>{b.name}</td>
                <td className="r mono">{b.pays}</td>
                <td className="r mono">{b.pwin}</td>
                <td className="r">
                  <span className="pill mono" style={{ background: edgeColor(b.edge) + "22", color: edgeColor(b.edge) }}>
                    {b.edge.toFixed(2)}%
                  </span>
                </td>
                <td className="small">{b.res}</td>
                <td className="small">{b.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="small" style={{ marginTop: 10, lineHeight: 1.5 }}>
        Edges derived from the 36-outcome dice space and Monte-Carlo-verified in <span className="mono">test/simulate.js</span>,
        cross-checked against Wizard of Odds (wizardofodds.com/games/craps). Table above reflects the current Table Rules
        (Field paytable, Buy/Lay vig convention) selected on the Table tab. "Per roll" resolves every throw; "per
        resolution/decision" only when the bet wins or loses.
      </div>
    </div>
  );
}
