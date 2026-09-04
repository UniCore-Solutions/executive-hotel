'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

/** Search + filter bar shared by every list screen. Search is debounced
    locally and only pushes to URL state (and therefore triggers a fetch)
    once the guest stops typing (§O — "search should feel fast and natural").
    `searchValue`/`onSearchChange` are optional — omit both to render a
    filters-only bar with no search box, for a query with no search arg at
    all (e.g. `adminReviews`: hotelId/status/page only, no `search` — see
    review.graphqls) rather than wiring a search box to nothing. */
export function DataTableToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search…',
  filters,
  actions,
}: {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filters?: ReactNode;
  actions?: ReactNode;
}) {
  const hasSearch = onSearchChange !== undefined;
  // Adjusted during render (not in an effect) when the external URL value
  // changes underneath us — e.g. a filter reset elsewhere clearing `q`.
  const [prevSearchValue, setPrevSearchValue] = useState(searchValue ?? '');
  const [local, setLocal] = useState(searchValue ?? '');
  if ((searchValue ?? '') !== prevSearchValue) {
    setPrevSearchValue(searchValue ?? '');
    setLocal(searchValue ?? '');
  }

  const debounced = useDebouncedValue(local, 350);

  useEffect(() => {
    if (hasSearch && debounced !== (searchValue ?? '')) onSearchChange(debounced);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-wrap items-center gap-2">
        {hasSearch ? (
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={local}
              onChange={(e) => setLocal(e.target.value)}
              placeholder={searchPlaceholder}
              className="pl-8"
              aria-label="Search"
            />
            {local ? (
              <button
                type="button"
                onClick={() => setLocal('')}
                aria-label="Clear search"
                className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-ink"
              >
                <X className="size-3.5" />
              </button>
            ) : null}
          </div>
        ) : null}
        {filters}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
