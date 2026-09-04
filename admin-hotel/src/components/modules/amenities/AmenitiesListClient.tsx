'use client';

import { useMemo, useState } from 'react';
import { Plus, Sparkles } from 'lucide-react';
import { useQuery } from '@apollo/client/react';
import { AdminAmenityCatalogDocument } from '@/graphql/generated/graphql';
import { useTableState } from '@/hooks/useTableState';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/data-table/DataTable';
import { DataTableToolbar } from '@/components/data-table/DataTableToolbar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { AMENITY_CATEGORIES } from '@/schemas/amenities';
import { amenityColumns, type AmenityRow } from './columns';
import { AmenityFormSheet } from './AmenityFormSheet';

const CATEGORY_OPTIONS = [{ value: 'all', label: 'All categories' }, ...AMENITY_CATEGORIES];

/**
 * Global, platform-wide catalog (not hotel-scoped) — the shared list every
 * hotel/room-type amenities picker draws from. Reached from a hotel's own
 * workspace nav (Inventory group), not the top-level "Platform" section —
 * any `hotel_admin`, not just `super_admin`, can create/edit here
 * (`CurrentUserAccessor.requireHotelAdminOrSuperAdmin`), and an addition
 * from inside one hotel's context is immediately usable by every other
 * hotel too, since the catalog itself isn't owned by any single hotel.
 * `adminAmenities` has no search args, so this fetches the full catalog
 * (`includeInactive: true`, for the management view — pickers elsewhere use
 * the default active-only variant) and filters client-side, same honesty
 * tradeoff as the Hotels list (NEW-3).
 */
export function AmenitiesListClient() {
  // Reuses `useTableState`'s generic `status`/`setStatus` URL-state slot as
  // the category filter — same mechanism the Reviews page uses for
  // moderation status, repurposed here since this list's one filter is
  // category, not status.
  const { search, setSearch, status: category, setStatus: setCategory } = useTableState();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AmenityRow | null>(null);

  const { data, loading, error, refetch } = useQuery(AdminAmenityCatalogDocument);

  const rows = useMemo(() => {
    const items = data?.adminAmenities ?? [];
    const byCategory = category && category !== 'all' ? items.filter((a) => a.category === category) : items;
    const q = search.trim().toLowerCase();
    const filtered = q ? byCategory.filter((a) => a.name.toLowerCase().includes(q)) : byCategory;
    return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
  }, [data, search, category]);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(row: AmenityRow) {
    setEditing(row);
    setFormOpen(true);
  }

  return (
    <>
      <PageHeader
        title="Amenities"
        description="Shared across every hotel — anything added or changed here is immediately available to every other hotel's own amenities picker too, not just the one you got here from."
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="size-4" />
            New amenity
          </Button>
        }
      />

      <div className="mb-4">
        <DataTableToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search amenities…"
          filters={
            <div className="w-full max-w-48">
              <Select value={category || 'all'} onValueChange={(v) => setCategory(v === 'all' ? '' : v)}>
                <SelectTrigger size="sm" aria-label="Filter by category">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          }
        />
      </div>

      <DataTable
        columns={amenityColumns}
        data={rows}
        loading={loading}
        error={error}
        onRetry={() => void refetch()}
        onRowClick={openEdit}
        emptyIcon={Sparkles}
        emptyTitle={search || category ? 'No amenities match your filters' : 'No amenities yet'}
        emptyDescription={search || category ? 'Try a different name or category.' : 'Create the first one.'}
      />

      <AmenityFormSheet open={formOpen} onOpenChange={setFormOpen} amenity={editing} />
    </>
  );
}
