/** QR code (decorative, seeded) */
interface QRProps {
  value: string;
  size?: number;
  className?: string;
}

export function QR({ value, size = 80, className = '' }: QRProps) {
  function mulberry32(a: number) {
    return function () {
      let t = (a += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const rand = mulberry32(h >>> 0);
  const modules = size;
  const grid: boolean[][] = [];
  for (let y = 0; y < modules; y++) {
    const row: boolean[] = [];
    for (let x = 0; x < modules; x++) {
      if ((y < 9 && x < 9) || (y < 9 && x >= modules - 8) || (y >= modules - 8 && x < 9))
        row.push(true);
      else if ((y === 6 || x === 6) && (y < 9 || x < 9 || y >= modules - 8 || x >= modules - 8))
        row.push((y + x) % 2 === 0);
      else row.push(rand() < 0.5);
    }
    grid.push(row);
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${modules} ${modules}`}
      className={`qr-grid ${className}`}
      aria-label="Demo mobile key QR code"
      role="img"
    >
      <rect width={modules} height={modules} fill="white" />
      {grid.map((row, y) =>
        row.map(
          (on, x) =>
            on && <rect key={`${x},${y}`} x={x} y={y} width={1} height={1} fill="#142639" />
        )
      )}
    </svg>
  );
}
