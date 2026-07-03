const PIPS = {
  1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8],
};

export function Die({ value, rolling, size = 44 }) {
  return (
    <div className={"die" + (rolling ? " rolling" : "")} style={{ width: size, height: size }}>
      {Array.from({ length: 9 }).map((_, i) => (
        <span key={i} className={"cell" + (PIPS[value].includes(i) ? " on" : "")} />
      ))}
    </div>
  );
}

export function Dice({ dice, rolling, size }) {
  return (
    <div className="dice">
      <Die value={dice[0]} rolling={rolling} size={size} />
      <Die value={dice[1]} rolling={rolling} size={size} />
    </div>
  );
}
