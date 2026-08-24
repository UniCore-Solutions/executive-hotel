'use client';

/* Guests stepper panel — port of renderGuests (common.js). */
import { Button } from '@/components/ui/button';
import { useSearch } from '@/context/SearchContext';

interface GuestsPanelProps {
  onDone?: () => void;
}

export default function GuestsPanel({ onDone }: GuestsPanelProps) {
  const { state, setGuests, setChildrenAges } = useSearch();
  const s = state;

  const step = (key: 'adults' | 'children' | 'rooms', dir: number) => {
    const limits = { adults: [1, 9] as const, children: [0, 6] as const, rooms: [1, 5] as const };
    const lo = limits[key][0];
    const hi = limits[key][1];
    const next = Math.min(hi, Math.max(lo, s[key] + dir));
    if (next === s[key]) return;
    if (key === 'adults') setGuests({ adults: next });
    else if (key === 'children') setGuests({ children: next });
    else setGuests({ rooms: next });
  };

  const ageRow = (i: number) => {
    const age = s.childrenAges[i] ?? 4;
    return (
      <div key={i} className="flex items-center justify-between gap-3 py-2">
        <div>
          <p className="text-navy text-sm font-medium">Child {i + 1}</p>
          <p className="text-navy/50 text-xs">Age</p>
        </div>
        <select
          value={age}
          onChange={(e) => {
            const ages = [...(s.childrenAges.length ? s.childrenAges : [])];
            while (ages.length <= i) ages.push(4);
            ages[i] = parseInt(e.target.value, 10);
            setChildrenAges(ages);
          }}
          className="bg-paper border-navy/15 text-navy focus:ring-gold/40 appearance-none rounded-xl border px-3 py-2 text-sm font-medium focus:ring-2 focus:outline-none"
          aria-label={`Age of child ${i + 1}`}
        >
          {Array.from({ length: 18 }, (_, a) => (
            <option key={a} value={a}>
              {a} years
            </option>
          ))}
        </select>
      </div>
    );
  };

  return (
    <div className="divide-navy/8 divide-y">
      {s.children > 0 ? (
        <div className="py-1">{Array.from({ length: s.children }, (_, i) => ageRow(i))}</div>
      ) : null}
      {(['adults', 'children', 'rooms'] as const).map((key) => (
        <div key={key} className="py-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-navy text-sm font-semibold">
                {key === 'adults' ? 'Adults' : key === 'children' ? 'Children' : 'Rooms'}
              </p>
              <p className="text-navy/50 text-xs">
                {key === 'adults'
                  ? 'Age 18+'
                  : key === 'children'
                    ? 'Choose an age for each'
                    : '1–5 rooms'}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                onClick={() => step(key, -1)}
                variant="outline"
                size="icon"
                className="rounded-full text-lg leading-none"
                aria-label={`Decrease ${key.toLowerCase()}`}
              >
                −
              </Button>
              <span data-val={key} className="text-navy w-9 text-center text-sm font-bold">
                {s[key]}
              </span>
              <Button
                type="button"
                onClick={() => step(key, 1)}
                variant="outline"
                size="icon"
                className="rounded-full text-lg leading-none"
                aria-label={`Increase ${key.toLowerCase()}`}
              >
                +
              </Button>
            </div>
          </div>
        </div>
      ))}
      <div className="flex items-center justify-between gap-3 py-3">
        <p className="text-navy/55 text-xs">
          Ages help us find rooms that fit your family. At least one adult per room.
        </p>
        <Button type="button" id="guests-done" onClick={onDone} size="sm" className="shrink-0">
          Done
        </Button>
      </div>
    </div>
  );
}
