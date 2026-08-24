/** Deterministic demo QR (port of RC.ui.qr + mulberry — ui.js). */

function mulberry(seed: number): () => number {
  let s = seed;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function qrCells(ref: string, size = 21): string {
  let seed = 7;
  for (let i = 0; i < ref.length; i++) seed = (seed * 31 + ref.charCodeAt(i)) | 0;
  const rnd = mulberry(seed);
  const inFinder = (x: number, y: number) =>
    (x < 7 && y < 7) || (x >= size - 7 && y < 7) || (x < 7 && y >= size - 7);
  const finder = (fx: number, fy: number) => {
    let s = '';
    for (let v = 0; v < 7; v++)
      for (let h = 0; h < 7; h++) {
        const solid =
          h === 0 || h === 6 || v === 0 || v === 6 || (h >= 2 && h <= 4 && v >= 2 && v <= 4);
        if (solid) s += `<rect x="${fx + h}" y="${fy + v}" width="1" height="1" fill="#142639"/>`;
      }
    return s;
  };
  let cells = finder(0, 0) + finder(size - 7, 0) + finder(0, size - 7);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (inFinder(x, y)) continue;
      const timing = y === 6 || x === 6;
      const on = timing ? x % 2 === 0 || y % 2 === 0 : rnd() > 0.5;
      if (on) cells += `<rect x="${x}" y="${y}" width="1" height="1" fill="#142639"/>`;
    }
  }
  return cells;
}
