'use client';

import { useMemo, useState } from 'react';
import { ScrollText } from 'lucide-react';
import { useQuery } from '@apollo/client/react';
import { AdminAuditLogsDocument, AdminHotelsDocument } from '@/graphql/generated/graphql';
import { useTableState } from '@/hooks/useTableState';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/data-table/DataTable';
import { DataTablePagination } from '@/components/data-table/DataTablePagination';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { humanizeEnum } from '@/lib/format';
import { buildAuditColumns, type AuditLogRow } from '@/components/modules/audit/columns';

const PAGE_SIZE = 20;
const PLATFORM_WIDE = '__platform__';

/**
 * `adminAuditLogs` (`audit.graphqls`) takes only a `page` cursor — no
 * search/filter args of its own, unlike `adminReservations`/`adminGuests`/
 * `adminPayments` which all gained real server-side `search`/`sort`
 * (docs/ADMIN_REBUILD_PROGRESS.md, J-1). So pagination here is real and
 * server-side (each page is a genuine `LIMIT`/`OFFSET` round trip against
 * the full platform-wide table), but the filters below only ever narrow
 * the ~20 rows already on screen — they cannot find a row on a page that
 * hasn't been fetched yet. That's stated in the UI, not just here, so
 * nobody mistakes this for a real search across the whole audit trail.
 */
export function AuditLogClient() {
  const { page, setPage } = useTableState();
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [resourceTypeFilter, setResourceTypeFilter] = useState('all');
  const [resultFilter, setResultFilter] = useState('all');
  const [hotelFilter, setHotelFilter] = useState('all');

  const { data, loading, error, refetch } = useQuery(AdminAuditLogsDocument, {
    variables: { page: { page, size: PAGE_SIZE } },
  });

  // Real hotel names for the filter and the table's Hotel column — a
  // second, independent query (not derived from whatever happens to be on
  // the current audit page), so the hotel list is always complete even if
  // no row for a given hotel has loaded yet.
  const { data: hotelsData } = useQuery(AdminHotelsDocument, {
    variables: { page: { page: 0, size: 100 } },
  });
  const hotelNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const h of hotelsData?.adminHotels.items ?? []) map.set(h.id, h.name);
    return map;
  }, [hotelsData]);

  const items = useMemo(() => data?.adminAuditLogs.items ?? [], [data]);
  const total = data?.adminAuditLogs.total ?? 0;

  const actionOptions = useMemo(() => Array.from(new Set(items.map((i) => i.action))).sort(), [items]);
  const resourceTypeOptions = useMemo(
    () => Array.from(new Set(items.map((i) => i.resourceType))).sort(),
    [items],
  );
  const resultOptions = useMemo(() => Array.from(new Set(items.map((i) => i.result))).sort(), [items]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((row: AuditLogRow) => {
      if (actionFilter !== 'all' && row.action !== actionFilter) return false;
      if (resourceTypeFilter !== 'all' && row.resourceType !== resourceTypeFilter) return false;
      if (resultFilter !== 'all' && row.result !== resultFilter) return false;
      if (hotelFilter !== 'all') {
        if (hotelFilter === PLATFORM_WIDE ? row.hotelId != null : row.hotelId !== hotelFilter) return false;
      }
      if (q) {
        const haystack = [row.actorEmail, row.action, row.resourceType, row.resourceId].join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [items, search, actionFilter, resourceTypeFilter, resultFilter, hotelFilter]);

  const columns = useMemo(() => buildAuditColumns(hotelNameById), [hotelNameById]);
  const filtersActive =
    search.trim() !== '' || actionFilter !== 'all' || resourceTypeFilter !== 'all' || resultFilter !== 'all' || hotelFilter !== 'all';

  return (
    <>
      <PageHeader
        title="Audit Log"
        description="Every recorded admin action across the platform — super_admin only."
      />

      <div className="mb-2 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter actor, action or resource id…"
            className="max-w-xs"
            aria-label="Filter loaded rows"
          />
          <div className="w-40">
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger size="sm" aria-label="Filter by action">
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                {actionOptions.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-40">
            <Select value={resourceTypeFilter} onValueChange={setResourceTypeFilter}>
              <SelectTrigger size="sm" aria-label="Filter by resource type">
                <SelectValue placeholder="Resource" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All resources</SelectItem>
                {resourceTypeOptions.map((r) => (
                  <SelectItem key={r} value={r}>
                    {humanizeEnum(r)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-36">
            <Select value={resultFilter} onValueChange={setResultFilter}>
              <SelectTrigger size="sm" aria-label="Filter by result">
                <SelectValue placeholder="Result" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All results</SelectItem>
                {resultOptions.map((r) => (
                  <SelectItem key={r} value={r}>
                    {humanizeEnum(r)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-48">
            <Select value={hotelFilter} onValueChange={setHotelFilter}>
              <SelectTrigger size="sm" aria-label="Filter by hotel">
                <SelectValue placeholder="Hotel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All hotels</SelectItem>
                <SelectItem value={PLATFORM_WIDE}>Platform-wide</SelectItem>
                {(hotelsData?.adminHotels.items ?? []).map((h) => (
                  <SelectItem key={h.id} value={h.id}>
                    {h.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <p className="mb-4 text-xs text-muted-foreground">
        These filters only narrow the {items.length} rows already loaded on this page — they don&apos;t search the
        full audit trail. Page through with the controls below to see more, or clear a filter to see everything
        that&apos;s loaded.
      </p>

      <DataTable
        columns={columns}
        data={rows}
        loading={loading}
        error={error}
        onRetry={() => void refetch()}
        emptyIcon={ScrollText}
        emptyTitle={filtersActive ? 'No loaded rows match these filters' : 'No audit entries yet'}
        emptyDescription={
          filtersActive
            ? 'Clear a filter, or page to load more rows to filter.'
            : 'Audit entries appear here as admin actions are taken across the platform.'
        }
      />

      {!loading && !error && total > 0 ? (
        <DataTablePagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} loading={loading} />
      ) : null}
    </>
  );
}
