'use client';

/* Searchable country combobox — options come from the backend `countries`
   query (code + name + calling code). Flags are emoji derived from the ISO
   code. Replaces the native <select> so the guest can type to filter a
   245-entry list. Keyboard: Escape closes, Enter picks the highlighted
   option, ArrowUp/ArrowDown move through the filtered list. */

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { getCountries, flagEmoji, countryLabel, type CountryRef } from '@/services/countries';

interface CountryComboboxProps {
  value: string;
  onChange: (code: string) => void;
  id?: string;
  /** Show the calling code next to the name (phone-field variant). */
  showCallingCode?: boolean;
  placeholder?: string;
  className?: string;
}

const ARROW_DOWN = 'ArrowDown';
const ARROW_UP = 'ArrowUp';
const ENTER = 'Enter';
const ESCAPE = 'Escape';

export function CountryCombobox({
  value,
  onChange,
  id,
  showCallingCode = false,
  placeholder = 'Search country…',
  className = '',
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
    return countries.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        (c.callingCode ?? '').includes(q.replace(/\D/g, ''))
    );
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
        className="bg-paper border-navy/15 focus:ring-gold/40 flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium focus:ring-2 focus:outline-none"
      >
        <span className={selected ? 'text-navy' : 'text-navy/40'}>
          {selected
            ? `${flagEmoji(selected.code)} ${selected.name}${showCallingCode && selected.callingCode ? ` (+${selected.callingCode})` : ''}`
            : placeholder}
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
        <div className="shadow-navy/10 absolute z-50 mt-1.5 w-full overflow-hidden rounded-2xl border border-navy/10 bg-white shadow-xl">
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-autocomplete="list"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setHighlight(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Search country…"
            className="bg-paper border-b border-navy/10 w-full px-3.5 py-2.5 text-sm focus:outline-none"
          />
          <ul
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
                  role="option"
                  aria-selected={c.code === value}
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => pick(c.code)}
                  className={`flex cursor-pointer items-center justify-between gap-2 px-3.5 py-2 text-sm ${
                    i === highlight ? 'bg-gold/[0.12]' : ''
                  } ${c.code === value ? 'text-navy font-semibold' : 'text-navy/80'}`}
                >
                  <span className="min-w-0 truncate">{countryLabel(c)}</span>
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
