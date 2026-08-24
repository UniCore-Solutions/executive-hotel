'use client';

/* Mobile search sheet (Airbnb-style bottom sheet) — port of sheetHTML/bindSheet
   (common.js). Mounted once in the root layout; opened via the search pill. */
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSearch } from '@/context/SearchContext';
import { useToast } from '@/context/ToastContext';
import { useLang } from '@/hooks/useLang';
import { fmtShort, stateToQuery } from '@/lib/dates';
import { recordSearch } from '@/services/activity';
import { PROPERTY } from '@/data';
import Calendar from '@/components/search/Calendar';
import { Button } from '@/components/ui/button';

export default function SearchSheet() {
  const router = useRouter();
  const { state, setDate, setGuests, setChildrenAges, setPromo, errors, sheetOpen, closeSheet } =
    useSearch();
  const { t } = useLang();
  const { toast } = useToast();
  const [calOpen, setCalOpen] = useState(false);
  const [promoInput, setPromoInput] = useState(state.promo);
  const [everOpened, setEverOpened] = useState(false);
  const [slideOpen, setSlideOpen] = useState(false);

  const open = sheetOpen && slideOpen;

  useEffect(() => {
    if (sheetOpen) {
      document.body.style.overflow = 'hidden';
      const t = setTimeout(() => {
        setCalOpen(false);
        setEverOpened(true);
      }, 0);
      const raf = requestAnimationFrame(() => setSlideOpen(true));
      return () => {
        clearTimeout(t);
        cancelAnimationFrame(raf);
      };
    }
    document.body.style.overflow = '';
    const t = setTimeout(() => setSlideOpen(false), 0);
    return () => {
      clearTimeout(t);
      document.body.style.overflow = '';
    };
  }, [sheetOpen]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeSheet();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, closeSheet]);

  const pick = (day: Date) => {
    if (!state.checkin || (state.checkin && state.checkout && +day <= +state.checkin)) {
      setDate(day, null);
    } else if (!state.checkout) {
      setDate(
        +day <= +state.checkin ? day : state.checkin,
        +day <= +state.checkin ? state.checkin : day
      );
    } else if (+day < +state.checkout) {
      setDate(state.checkin, day);
    } else {
      setDate(state.checkin, day);
    }
  };

  const submit = () => {
    const errs = errors();
    if (errs.length) {
      toast({ message: errs.join(' '), type: 'error', title: 'Please complete your search' });
      return;
    }
    setPromo(promoInput, true);
    closeSheet();
    recordSearch(state);
    router.push(`/search${stateToQuery({ ...state, promo: promoInput.trim().toUpperCase() })}`);
  };

  const step = (key: 'adults' | 'children' | 'rooms', dir: number) => {
    const limits = { adults: [1, 9] as const, children: [0, 6] as const, rooms: [1, 5] as const };
    const lo = limits[key][0];
    const hi = limits[key][1];
    const cur = state[key] ?? 0;
    const next = Math.min(hi, Math.max(lo, cur + dir));
    if (next === cur) return;
    if (key === 'adults') setGuests({ adults: next });
    else if (key === 'children') setGuests({ children: next });
    else setGuests({ rooms: next });
  };

  if (!everOpened) return null;

  return (
    <div
      id="search-sheet"
      role="dialog"
      aria-modal="true"
      aria-label="Search availability"
      className={`fixed inset-x-0 bottom-0 z-[70] max-h-[92vh] overflow-y-auto rounded-t-3xl bg-white shadow-2xl transition-transform duration-300 ${open ? '' : 'pointer-events-none translate-y-full'}`}
    >
      <div className="border-navy/10 sticky top-0 flex items-center justify-between rounded-t-3xl border-b bg-white/95 px-5 py-3 backdrop-blur">
        <p className="text-navy text-sm font-bold tracking-widest uppercase">Edit search</p>
        <Button
          type="button"
          id="sheet-close"
          onClick={closeSheet}
          variant="ghost"
          size="icon"
          className="hover:bg-navy/10 rounded-full"
          aria-label="Close search"
        >
          ✕
        </Button>
      </div>
      <div className="space-y-5 p-5">
        <div className="bg-navy-dark flex items-center gap-3 rounded-2xl px-4 py-3 text-white">
          <span className="bg-gold/15 border-gold/30 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border">
            <svg
              className="text-gold-light h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
                d="M17.7 8.5a5.7 5.7 0 1 0-11.4 0c0 4.6 5.7 10.5 5.7 10.5s5.7-5.9 5.7-10.5ZM12 10.7a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4Z"
              />
            </svg>
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold">
              {PROPERTY.name} · {PROPERTY.city}
            </p>
            <p className="truncate text-[11px] text-white/60">72 Rue Oued Sebou, {PROPERTY.area}</p>
          </div>
        </div>

        <div>
          <p className="text-navy/45 mb-2 text-[11px] font-semibold tracking-[0.14em] uppercase">
            {t('dates')}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              id="sheet-date-trigger"
              onClick={() => setCalOpen((v) => !v)}
              className="bg-paper border-navy/15 rounded-2xl border px-4 py-3 text-left"
            >
              <span className="text-navy/45 block text-[10px] font-semibold tracking-widest uppercase">
                Check-in
              </span>
              <span
                id="sheet-checkin-value"
                className="text-navy mt-0.5 block text-sm font-semibold"
              >
                {state.checkin ? fmtShort(state.checkin) : 'Select'}
              </span>
            </button>
            <button
              type="button"
              id="sheet-date-trigger2"
              onClick={() => setCalOpen((v) => !v)}
              className="bg-paper border-navy/15 rounded-2xl border px-4 py-3 text-left"
            >
              <span className="text-navy/45 block text-[10px] font-semibold tracking-widest uppercase">
                Check-out
              </span>
              <span
                id="sheet-checkout-value"
                className="text-navy mt-0.5 block text-sm font-semibold"
              >
                {state.checkout ? fmtShort(state.checkout) : 'Select'}
              </span>
            </button>
          </div>
          {calOpen && (
            <div id="sheet-calendar" className="mt-3">
              <Calendar
                checkin={state.checkin}
                checkout={state.checkout}
                onPick={pick}
                onConfirm={() => setCalOpen(false)}
              />
            </div>
          )}
        </div>

        <div>
          <p className="text-navy/45 mb-2 text-[11px] font-semibold tracking-[0.14em] uppercase">
            {t('guests')}
          </p>
          <div className="bg-paper border-navy/10 divide-navy/8 divide-y rounded-2xl border px-4">
            {state.children > 0 && (
              <div className="bg-paper/70 grid gap-2 rounded-2xl p-3">
                {Array.from({ length: state.children }, (_, i) => {
                  const age = state.childrenAges[i] ?? 4;
                  return (
                    <div key={i} className="flex items-center justify-between gap-2">
                      <span className="text-navy text-xs font-semibold">Child {i + 1}</span>
                      <select
                        value={age}
                        onChange={(e) => {
                          const ages = [...(state.childrenAges.length ? state.childrenAges : [])];
                          while (ages.length <= i) ages.push(4);
                          ages[i] = parseInt(e.target.value, 10);
                          setChildrenAges(ages);
                        }}
                        className="border-navy/15 rounded-xl border bg-white px-2 py-1.5 text-xs font-medium"
                        aria-label={`Age of child ${i + 1}`}
                      >
                        {Array.from({ length: 18 }, (_, a) => (
                          <option key={a} value={a}>
                            {a} yrs
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            )}
            {(['adults', 'children', 'rooms'] as const).map((key) => (
              <div key={key} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="text-navy text-sm font-semibold">
                    {key === 'adults' ? 'Adults' : key === 'children' ? 'Children' : 'Rooms'}
                  </p>
                  <p className="text-navy/50 text-xs">
                    {key === 'adults'
                      ? 'Age 18+'
                      : key === 'children'
                        ? 'Ages required'
                        : '1–5 rooms'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    onClick={() => step(key, -1)}
                    variant="outline"
                    size="icon"
                    className="rounded-full text-lg"
                    aria-label={`Decrease ${key.toLowerCase()}`}
                  >
                    −
                  </Button>
                  <span data-val={key} className="text-navy w-8 text-center text-sm font-bold">
                    {state[key]}
                  </span>
                  <Button
                    type="button"
                    onClick={() => step(key, 1)}
                    variant="outline"
                    size="icon"
                    className="rounded-full text-lg"
                    aria-label={`Increase ${key.toLowerCase()}`}
                  >
                    +
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="text-navy/45 mb-2 text-[11px] font-semibold tracking-[0.14em] uppercase">
            {t('promo')}
          </p>
          <input
            id="sheet-promo"
            value={promoInput}
            onChange={(e) => setPromoInput(e.target.value.trim().toUpperCase())}
            placeholder="Code, e.g. SUMMER2026"
            className="bg-paper border-navy/15 text-navy focus:ring-gold/40 w-full rounded-2xl border px-4 py-3 text-sm font-medium focus:ring-2 focus:outline-none"
          />
        </div>

        <Button
          type="button"
          id="sheet-search"
          onClick={submit}
          size="lg"
          className="shadow-navy/25 w-full rounded-2xl py-4 text-sm"
        >
          {t('searchRooms')}
        </Button>
        <p className="text-navy/45 text-center text-[11px]">
          Free cancellation on most rates · No payment needed to check availability
        </p>
      </div>
    </div>
  );
}
