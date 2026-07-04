import { memo } from "react";
import { Dice } from "./Dice.jsx";
import { usd } from "../util.js";

// Thumb-reach action bar — fixed to the bottom on small screens only (see
// .mobilebar in styles.css), so rolling never requires scrolling back up.
function MobileBar({ phase, point, dice, rolling, sum, bankroll, start, onRoll }) {
  return (
    <div className="mobilebar">
      <div className={"puck mini " + (phase === "point" ? "on" : "off")}>{phase === "point" ? point : "OFF"}</div>
      <Dice dice={dice} rolling={rolling} size={30} />
      <div className="mb-info">
        <div className="k">{usd(sum)} on table</div>
        <div className="v mono" style={{ color: bankroll >= start ? "#34d399" : "#f43f5e" }}>{usd(bankroll)}</div>
      </div>
      <button className="btn primary grow" onClick={onRoll} disabled={rolling}>{rolling ? "ROLLING…" : "ROLL"}</button>
    </div>
  );
}
export default memo(MobileBar);
