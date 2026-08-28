/** Extras picker with quantity steppers */
'use client';

import { useState, useEffect } from 'react';
import type { Extra, CurrencyCode } from '@/types';
import { Button } from './button';
import { Badge } from './Badge';
import { fmtPrice } from '@/lib/format';

interface ExtrasPickerProps {
  extras: Extra[];
  selected: Array<{ id: string; qty: number }>;
  onChange: (selected: Array<{ id: string; qty: number }>) => void;
  adults?: number;
  childCount?: number;
  compact?: boolean;
  sidebar?: boolean;
  currency?: CurrencyCode;
}

export function ExtrasPicker({
  extras: allExtras,
  selected: initialSelected,
  onChange,
  adults = 2,
  childCount = 0,
  compact,
  sidebar,
  currency = 'MAD',
}: ExtrasPickerProps) {
  const [selected, setSelected] = useState<Array<{ id: string; qty: number }>>(initialSelected);

  useEffect(() => onChange(selected), [selected, onChange]);

  const guests = adults + childCount;
  const getDefaultQty = (extra: Extra) => (extra.unit === 'per person' ? guests : 1);
  const getMaxQty = (extra: Extra) =>
    extra.unit === 'per person' ? Math.max(8, guests) : 6;

  const updateQty = (id: string, delta: number) => {
    const extra = allExtras.find((e) => e.id === id);
    if (!extra) return;
    setSelected((prev) => {
      const idx = prev.findIndex((e) => e.id === id);
      const maxQty = getMaxQty(extra);
      if (idx >= 0) {
        const newQty = Math.max(0, Math.min(maxQty, (prev[idx]?.qty ?? 0) + delta));
        if (newQty === 0) return prev.filter((e) => e.id !== id);
        return prev.map((e, i) => (i === idx ? { ...e, qty: newQty } : e));
      }
      if (delta > 0) return [...prev, { id, qty: Math.min(maxQty, delta) }];
      return prev;
    });
  };

  const toggle = (extra: Extra) => {
    const exists = selected.find((e) => e.id === extra.id);
    if (exists) setSelected((prev) => prev.filter((e) => e.id !== extra.id));
    else setSelected((prev) => [...prev, { id: extra.id, qty: getDefaultQty(extra) }]);
  };

  return (
    <div
      className={
        compact ? (sidebar ? 'grid grid-cols-1 gap-3' : 'grid gap-3 md:grid-cols-2') : 'space-y-3'
      }
    >
      {allExtras.map((extra) => {
        const sel = selected.find((e) => e.id === extra.id);
        const qty = sel?.qty ?? 0;
        const checked = qty > 0;
        if (compact) {
          return (
            <label
              key={extra.id}
              data-extra={extra.id}
              data-checked={checked}
              className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3 transition-colors ${checked ? 'border-gold/50 bg-gold/[0.06]' : 'border-navy/12 bg-white'}`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(extra)}
                className="border-navy/30 text-navy focus:ring-gold/40 accent-navy mt-1 h-4 w-4 shrink-0 rounded"
                aria-label={`Add ${extra.name}`}
              />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="text-navy text-[13px] font-semibold">{extra.name}</span>
                  <span className="text-gold-dark text-xs font-bold whitespace-nowrap">
                    {fmtPrice(extra.price, currency)}
                    <span className="text-navy/45 font-medium">
                      {' '}
                      /{extra.unit === 'per person' ? 'pp' : 'stay'}
                    </span>
                  </span>
                </span>
                {checked && (
                  <span className="text-navy/45 mt-1.5 flex items-center gap-2">
                    <span className="text-[11px] font-semibold tracking-wider uppercase">
                      {extra.unit === 'per person' ? `Quantity (x${guests} guests)` : 'Quantity'}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        updateQty(extra.id, -1);
                      }}
                      className="border-navy/15 text-navy hover:bg-navy/5 flex h-7 w-7 items-center justify-center rounded-full border text-sm leading-none"
                      aria-label={`Decrease ${extra.name}`}
                    >
                      −
                    </button>
                    <span className="text-navy w-6 text-center text-sm font-bold">{qty}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        updateQty(extra.id, 1);
                      }}
                      className="border-navy/15 text-navy hover:bg-navy/5 flex h-7 w-7 items-center justify-center rounded-full border text-sm leading-none"
                      aria-label={`Increase ${extra.name}`}
                    >
                      +
                    </button>
                  </span>
                )}
              </span>
            </label>
          );
        }
        return (
          <div
            key={extra.id}
            className={`rounded-2xl border p-3 transition-colors ${sidebar ? '' : 'hover:bg-navy/5'} ${checked ? 'border-gold/30 bg-gold/5' : 'border-navy/10'}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(extra)}
                  className="border-navy/30 text-navy focus:ring-gold/40 accent-navy mt-1 h-5 w-5 rounded"
                  aria-label={extra.name}
                />
                <div className="min-w-0">
                  <p className="text-navy font-medium">{extra.name}</p>
                  <p className="text-navy/60 truncate text-sm">{extra.desc}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant="navy">{extra.unit}</Badge>
                    <span className="font-display text-navy text-lg font-semibold">
                      {fmtPrice(extra.price, currency)}
                    </span>
                  </div>
                </div>
              </div>
              {checked && (
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => updateQty(extra.id, -1)}
                    aria-label={`Decrease ${extra.name}`}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M5 12h14" />
                    </svg>
                  </Button>
                  <span className="text-navy w-10 text-center font-semibold">{qty}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => updateQty(extra.id, 1)}
                    aria-label={`Increase ${extra.name}`}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </Button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
