const PIPS = {
  1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8],
};

export function Die({ value, rolling }) {
  return (
    <div className={"die" + (rolling ? " rolling" : "")} style={{ width: 44, height: 44 }}>
      {Array.from({ length: 9 }).map((_, i) => (
        <span key={i} className={"cell" + (PIPS[value].includes(i) ? " on" : "")} />
      ))}
    </div>
  );
}

export function Dice({ dice, rolling }) {
  return (
    <div className="dice">
      <Die value={dice[0]} rolling={rolling} />
      <Die value={dice[1]} rolling={rolling} />
    </div>
  );
}
