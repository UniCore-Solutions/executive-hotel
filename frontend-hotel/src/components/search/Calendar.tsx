'use client';

/* Shared range-selection calendar — port of renderCalendar (common.js, SEARCH-1).
   Static two-month view; drives checkin/checkout; optional built-in confirm bar. */
import { Button } from '@/components/ui/button';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  addDays,
  addMonths,
  startOfDay,
  toISODate,
  fmt,
  fmtShort,
  nightsBetween,
  MONTHS,
  DOW,
} from '@/lib/dates';

interface CalendarProps {
  checkin: Date | null;
  checkout: Date | null;
  /** Called after a day is picked (state already mutated by the host). */
  onPick: (day: Date) => void;
  /** Show the built-in confirmation bar (default true). Hosts with their own
      Apply action (e.g. room page) pass confirm={false}. */
  confirm?: boolean;
  onConfirm?: () => void;
  className?: string;
}

function buildMonth(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7;
  const cells: (Date | null)[] = Array(lead).fill(null);
  for (let d = 1; d <= new Date(year, month + 1, 0).getDate(); d++)
    cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export default function Calendar({
  checkin,
  checkout,
  onPick,
  confirm = true,
  onConfirm,
  className = '',
}: CalendarProps) {
  const today = startOfDay(new Date());
  const [calBase, setCalBase] = useState<Date | null>(null);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  /* Keep the current view static while picking check-in; re-anchor once a range exists. */
  const base = useMemo(() => {
    if (calBase && !checkout) return calBase;
    const anchor = checkin && checkout ? checkin : addDays(today, 1);
    const b = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    return b;
  }, [calBase, checkin, checkout, today]);

  useEffect(() => {
    if (calBase === null || !checkout) {
      const t = setTimeout(() => setCalBase(base), 0);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base]);

  const nights = nightsBetween(checkin, checkout);

  let hint: ReactNode;
  const strong = (s: string) => <strong className="text-navy font-semibold">{s}</strong>;
  if (!checkin) hint = 'Select your check-in date';
  else if (checkin && !checkout)
    hint = <>Check-in {strong(fmtShort(checkin))} — now select your check-out date</>;
  else
    hint = (
      <>
        Check-in {strong(fmtShort(checkin))} · Check-out {strong(fmtShort(checkout))} · {nights}{' '}
        {nights === 1 ? 'night' : 'nights'}
      </>
    );

  const months = [base, addMonths(base, 1)];

  const handleDay = (d: Date) => {
    setHoverDate(null);
    onPick(startOfDay(d));
  };

  return (
    <div ref={rootRef} className={className}>
      <div
        className="bg-paper border-navy/10 mb-4 flex items-center justify-between gap-3 rounded-2xl border px-4 py-2.5"
        data-cal-status
      >
        <p className="text-navy/60 text-[13px]">{hint}</p>
        {checkin ? (
          <span className="text-navy/45 shrink-0 text-[11px] font-semibold">
            {checkout ? 'Range set — confirm or adjust' : 'Step 1 of 2'}
          </span>
        ) : null}
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        {months.map((m) => {
          const cells = buildMonth(m.getFullYear(), m.getMonth());
          return (
            <div key={`${m.getFullYear()}-${m.getMonth()}`}>
              <p className="text-navy mb-3 text-center text-sm font-semibold">
                {MONTHS[m.getMonth()]} {m.getFullYear()}
              </p>
              <div className="grid grid-cols-7 gap-y-1 text-center">
                {DOW.map((d) => (
                  <span
                    key={d}
                    className="text-navy/40 py-1 text-[10px] font-semibold tracking-wider uppercase"
                  >
                    {d}
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-y-1 text-center">
                {cells.map((d, i) => {
                  if (!d) return <span key={`e${i}`} className="h-9" />;
                  const iso = toISODate(d);
                  const disabled = +d < +today;
                  const isStart = checkin && +d === +checkin;
                  const isEnd = checkout && +d === +checkout;
                  const inBand =
                    !!checkin && !checkout && !!hoverDate && +d > +checkin && +d <= +hoverDate;
                  const middle = checkin && checkout && +d > +checkin && +d < +checkout;
                  const cls = [
                    'day-cell h-9 text-[13px] rounded-full',
                    disabled
                      ? 'text-navy/20 cursor-default'
                      : 'text-navy cursor-pointer hover:bg-navy/10',
                    isStart || isEnd
                      ? 'bg-navy text-white font-semibold shadow-md shadow-navy/20'
                      : '',
                    inBand ? 'bg-gold-light/30 font-semibold' : '',
                    middle ? 'bg-navy/8 font-semibold' : '',
                  ]
                    .filter(Boolean)
                    .join(' ');
                  return (
                    <button
                      key={iso}
                      type="button"
                      data-day={iso}
                      className={cls}
                      disabled={disabled}
                      aria-label={fmt(d)}
                      onMouseEnter={() => {
                        if (!disabled) setHoverDate(d);
                      }}
                      onClick={() => handleDay(d)}
                    >
                      {d.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      {confirm ? (
        <div
          className={`border-navy/10 mt-4 flex items-center justify-between gap-3 border-t pt-4 ${checkin && checkout ? '' : 'hidden'}`}
          data-cal-confirm
        >
          <p className="text-navy/70 text-sm">
            {checkin && checkout
              ? `${fmtShort(checkin)} – ${fmtShort(checkout)} · ${nights} ${nights === 1 ? 'night' : 'nights'}`
              : ''}
          </p>
          <Button
            type="button"
            id="cal-confirm-btn"
            onClick={onConfirm}
            size="sm"
            className="shadow-navy/20 shrink-0"
          >
            Confirm dates
          </Button>
        </div>
      ) : null}
    </div>
  );
}
