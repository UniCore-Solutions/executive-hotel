'use client';

/* Searchable country combobox — options come from the backend `countries`
   query (code + name + calling code). Flags are emoji derived from the ISO
   code. Replaces the native <select> so the guest can type to filter a
   244-entry list. Keyboard: Escape closes, Enter picks the highlighted
   option, ArrowUp/ArrowDown move through the filtered list. */

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  getCountries,
  countryLabel,
  countryDialLabel,
  countryDialCode,
  type CountryRef,
} from '@/services/countries';

/** What the guest is actually choosing, which decides how options read:
    - `country` — the country itself (residence, nationality). "🇲🇦 Morocco".
    - `phone`   — a dial code. Trigger shows "🇲🇦 +212" to stay narrow beside
                  the number input; options keep the name so the choice is
                  unambiguous: "🇲🇦 Morocco (+212)". */
export type CountryComboboxVariant = 'country' | 'phone';

interface CountryComboboxProps {
  value: string;
  onChange: (code: string) => void;
  id?: string;
  variant?: CountryComboboxVariant;
  placeholder?: string;
  className?: string;
  /** Replaces the default trigger styling. Used by PhoneField, which draws one
      border around the group and needs a borderless segment inside it. */
  triggerClassName?: string;
  /** Accessible name for the trigger. Required by the `phone` variant, whose
      trigger text is only a flag and a dial code. */
  ariaLabel?: string;
}

/* Matching is scored rather than boolean so the obvious answer sits at the
   top: typing "ma" must offer Morocco (code MA) before Madagascar, and "212"
   must offer Morocco before Guatemala (+502 does not contain 212, but longer
   dial codes can share a substring). 0 means "no match".

   The two query shapes are kept apart deliberately. A digits-only query is
   about the dial code — matching it against names would be noise. A query
   containing letters is about the name or the ISO code, and must never be
   stripped down to its digits: doing that yields "" for "mor", and every
   calling code contains "", which is why the list used to stop filtering. */
export function matchRank(c: CountryRef, q: string): number {
  const dial = (c.callingCode ?? '').replace(/\D/g, '');
  const digits = q.replace(/\D/g, '');
  const isNumeric = digits.length > 0 && !/[a-z]/.test(q);

  if (isNumeric) {
    if (!dial) return 0;
    if (dial === digits) return 100;
    if (dial.startsWith(digits)) return 80;
    return dial.includes(digits) ? 40 : 0;
  }

  const name = c.name.toLowerCase();
  const code = c.code.toLowerCase();
  if (code === q) return 100;
  if (name === q) return 95;
  if (name.startsWith(q)) return 80;
  if (code.startsWith(q)) return 70;
  /* Word-start hits ("guinea" → Papua New Guinea) beat mid-word ones. */
  if (new RegExp(`\\b${escapeRe(q)}`).test(name)) return 60;
  return name.includes(q) ? 30 : 0;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const ARROW_DOWN = 'ArrowDown';
const ARROW_UP = 'ArrowUp';
const ENTER = 'Enter';
const ESCAPE = 'Escape';

export function CountryCombobox({
  value,
  onChange,
  id,
  variant = 'country',
  placeholder = 'Select country…',
  className = '',
  triggerClassName = '',
  ariaLabel,
}: CountryComboboxProps) {
  const uid = useId();
  const listId = `country-list-${uid}`;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [countries, setCountries] = useState<CountryRef[] | null>(null);
  const [highlight, setHighlight] = useState(0);
  const [loadError, setLoadError] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const optionId = (i: number) => `${listId}-opt-${i}`;

  const isPhone = variant === 'phone';
  const triggerLabel = isPhone ? countryDialCode : countryLabel;
  const optionLabel = isPhone ? countryDialLabel : countryLabel;

  useEffect(() => {
    let alive = true;
    getCountries()
      .then((list) => alive && setCountries(list))
      .catch(() => alive && setLoadError('Countries could not be loaded — please try again.'));
    return () => {
      alive = false;
    };
  }, []);

  const selected = countries?.find((c) => c.code === value);

  const filtered = useMemo(() => {
    if (!countries) return [];
    const q = query.trim().toLowerCase();
    if (!q) return countries;
    return countries
      .map((c) => ({ c, rank: matchRank(c, q) }))
      .filter((m) => m.rank > 0)
      .sort((a, b) => b.rank - a.rank || a.c.name.localeCompare(b.c.name))
      .map((m) => m.c);
  }, [countries, query]);

  /* Close on outside click / Escape. */
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ESCAPE) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  /* Keyboard navigation must not walk the highlight off-screen in a 245-entry
     list, so the active option is scrolled into view as it moves. */
  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [open, highlight]);

  const openPanel = () => {
    setOpen(true);
    setQuery('');
    setHighlight(Math.max(0, countries?.findIndex((c) => c.code === value) ?? 0));
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const pick = (code: string) => {
    onChange(code);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === ARROW_DOWN || ENTER === e.key) {
        e.preventDefault();
        openPanel();
      }
      return;
    }
    if (e.key === ARROW_DOWN) {
      e.preventDefault();
      setHighlight((h) => Math.min(filtered.length - 1, h + 1));
    } else if (e.key === ARROW_UP) {
      e.preventDefault();
      setHighlight((h) => Math.max(0, h - 1));
    } else if (e.key === ENTER) {
      e.preventDefault();
      const hit = filtered[highlight];
      if (hit) pick(hit.code);
    } else if (e.key === ESCAPE) {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        id={id}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={openPanel}
        onKeyDown={onKeyDown}
        aria-label={ariaLabel}
        className={
          triggerClassName ||
          `bg-paper border-navy/15 focus-visible:ring-gold/40 hover:border-navy/25 flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none`
        }
      >
        <span className={`min-w-0 truncate ${selected ? 'text-navy' : 'text-navy/40'}`}>
          {selected ? triggerLabel(selected) : placeholder}
        </span>
        <svg
          className={`text-navy/40 h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open ? (
        <div
          className="border-navy/10 shadow-navy/15 absolute z-50 mt-1.5 w-full min-w-[17rem] overflow-hidden rounded-2xl border bg-white shadow-xl"
        >
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={filtered[highlight] ? optionId(highlight) : undefined}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setHighlight(0);
            }}
            onKeyDown={onKeyDown}
            placeholder={isPhone ? 'Search country or code…' : 'Search name or code…'}
            className="bg-paper border-navy/10 placeholder:text-navy/35 w-full border-b px-3.5 py-3 text-sm focus:outline-none"
          />
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label="Countries"
            className="max-h-60 overflow-y-auto py-1"
          >
            {loadError ? (
              <li className="text-clay px-3.5 py-2.5 text-xs">{loadError}</li>
            ) : !countries ? (
              <li className="text-navy/45 px-3.5 py-2.5 text-xs">Loading countries…</li>
            ) : filtered.length === 0 ? (
              <li className="text-navy/45 px-3.5 py-2.5 text-xs">No country matches “{query}”.</li>
            ) : (
              filtered.map((c, i) => (
                <li
                  key={c.code}
                  id={optionId(i)}
                  data-active={i === highlight}
                  role="option"
                  aria-selected={c.code === value}
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => pick(c.code)}
                  className={`flex cursor-pointer items-center justify-between gap-2 px-3.5 py-2.5 text-sm ${
                    i === highlight ? 'bg-gold/[0.12]' : ''
                  } ${c.code === value ? 'text-navy font-semibold' : 'text-navy/80'}`}
                >
                  <span className="min-w-0 truncate">{optionLabel(c)}</span>
                  {c.code === value ? (
                    <svg className="text-gold-dark h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m5 12.5 4.5 4.5L19 7.5" />
                    </svg>
                  ) : null}
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
