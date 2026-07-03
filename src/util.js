// House edge = the price of a bet. Color encodes that price everywhere in the UI.
export function edgeColor(e) {
  if (e <= 0.001) return "#22d3ee"; // free (true odds)
  if (e < 2) return "#34d399";      // cheap
  if (e < 5) return "#fbbf24";      // moderate
  if (e < 10) return "#fb923c";     // expensive
  return "#f43f5e";                 // sucker
}

export const usd = (n) =>
  "$" + (Math.round(n * 100) / 100).toLocaleString(undefined, { maximumFractionDigits: 2 });

// Table-odds variants. "345" (3-4-5x) is the modern strip standard; the flat
// multiples (1x/2x/5x/10x/20x/100x) apply uniformly to every point number.
export const ODDS_MODES = [
  { id: "1x", label: "1x" },
  { id: "2x", label: "2x (full double)" },
  { id: "345", label: "3-4-5x" },
  { id: "5x", label: "5x" },
  { id: "10x", label: "10x" },
  { id: "20x", label: "20x" },
  { id: "100x", label: "100x (Vegas high-limit)" },
];

export function maxOddsMultiple(point, mode = "345") {
  if (mode === "345") {
    if ([4, 10].includes(point)) return 3;
    if ([5, 9].includes(point)) return 4;
    return 5; // 6 / 8
  }
  return parseInt(mode, 10); // "1x" -> 1, "10x" -> 10, etc.
}
