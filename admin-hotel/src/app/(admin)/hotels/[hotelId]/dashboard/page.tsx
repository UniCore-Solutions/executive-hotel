'use client';

import { use } from 'react';
import Link from 'next/link';
import { CalendarCheck, CalendarX, DoorClosed, DoorOpen, TrendingUp, Wallet } from 'lucide-react';
import { useQuery } from '@apollo/client/react';
import { AdminDashboardDocument, type AdminDashboardQuery } from '@/graphql/generated/graphql';
import { PageHeader } from '@/components/shared/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/ErrorState';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Money } from '@/components/shared/Money';
import { MetricCard } from '@/components/modules/dashboard/MetricCard';
import { OpsReservationCard } from '@/components/modules/dashboard/OpsReservationCard';
import { formatDate, formatMoney } from '@/lib/format';
import { useSession } from '@/context/SessionContext';
import { visibleTo } from '@/components/layout/nav-items';

/**
 * Role-aware dashboard composition — reuses nav-items.ts's `visibleTo()`
 * convention (declare `roles?`, missing = everyone, super_admin = always
 * everyone) applied to dashboard *sections* instead of nav links. Same
 * caveat as that file: UX-only, a judgement call about who plausibly needs
 * what, not itself a security boundary — the real guard is
 * BookingService's CurrentUserAccessor checks on every write.
 *
 *   - hotel_admin, super_admin: everything.
 *   - reception_staff, reservation_agent: arrivals/departures front-and-
 *     center with full actions (assign room, check in/out); pending
 *     payments/invoices hidden (not their job).
 *   - finance_staff: pending payments/invoices + revenue prominent (shown
 *     first); arrivals/departures visible but read-only — no action
 *     buttons.
 *   - revenue_manager: occupancy/available/sold-out/revenue prominent
 *     (shown first); arrivals/departures visible but secondary, and
 *     read-only (assigning rooms/checking guests in is a front-desk job).
 *   - content_manager: reduced view — occupancy metrics and recent
 *     reservations only, matching this role's existing exclusion from the
 *     Inventory nav group.
 */
const OPS_SECTION = {
  roles: ['hotel_admin', 'reception_staff', 'reservation_agent', 'finance_staff', 'revenue_manager'],
};
const OPS_ACTIONS = { roles: ['hotel_admin', 'reception_staff', 'reservation_agent'] };
const OPS_FIRST = { roles: ['hotel_admin', 'reception_staff', 'reservation_agent'] };
const REVENUE_SECTION = {
  roles: ['hotel_admin', 'reception_staff', 'reservation_agent', 'finance_staff', 'revenue_manager'],
};
const PENDING_SECTION = { roles: ['hotel_admin', 'finance_staff'] };

export default function DashboardPage({ params }: { params: Promise<{ hotelId: string }> }) {
  const { hotelId } = use(params);
  const { data, loading, error, refetch } = useQuery(AdminDashboardDocument, { variables: { hotelId } });
  const { me } = useSession();
  const roles = me?.roles ?? [];

  const dashboard = data?.adminDashboard;

  const showOps = visibleTo(OPS_SECTION, roles);
  const showOpsActions = showOps && visibleTo(OPS_ACTIONS, roles);
  const showRevenue = visibleTo(REVENUE_SECTION, roles);
  const showPending = visibleTo(PENDING_SECTION, roles);
  const opsFirst = visibleTo(OPS_FIRST, roles);

  const opsSection =
    showOps && !loading && dashboard ? (
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <OpsList
          title="Arrivals today"
          icon={CalendarCheck}
          hotelId={hotelId}
          kind="arrival"
          reservations={dashboard.arrivalsTodayList}
          showActions={showOpsActions}
        />
        <OpsList
          title="Departures today"
          icon={CalendarX}
          hotelId={hotelId}
          kind="departure"
          reservations={dashboard.departuresTodayList}
          showActions={showOpsActions}
        />
      </div>
    ) : null;

  const pendingSection =
    showPending && !loading && dashboard ? (
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <MetricCard
          icon={Wallet}
          label="Awaiting online payment"
          value={String(dashboard.pendingPayments)}
          footnote="Includes pay-at-property stays, which owe nothing online by design — not all a collections risk."
        />
        <MetricCard
          icon={Wallet}
          label="Not yet invoiced"
          value={String(dashboard.pendingInvoices)}
          footnote="Confirmed reservations without an invoice on file. Invoicing has not been exercised on this platform yet."
        />
      </div>
    ) : null;

  return (
    <>
      <PageHeader title="Dashboard" description="Today at a glance." />

      {error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
            ) : (
              <>
                <MetricCard
                  icon={DoorClosed}
                  label="Available tonight"
                  value={String(dashboard?.availableTonight ?? 0)}
                  footnote={dashboard?.soldOutTonight ? `${dashboard.soldOutTonight} room type(s) sold out` : 'No room types sold out'}
                  tone="info"
                />
                <MetricCard
                  icon={TrendingUp}
                  label="Occupancy tonight"
                  value={`${(dashboard?.occupancyPct ?? 0).toFixed(0)}%`}
                  tone="gold"
                />
                <MetricCard
                  icon={DoorOpen}
                  label="In-house tonight"
                  value={String(dashboard?.inHouseToday ?? 0)}
                  footnote="Reservations currently checked in at this hotel."
                />
                {showRevenue ? (
                  <MetricCard
                    icon={Wallet}
                    label="Revenue (captured)"
                    value={dashboard ? formatMoney(dashboard.revenueTotal) : '—'}
                    tone="success"
                  />
                ) : null}
              </>
            )}
          </div>

          {opsFirst ? (
            <>
              {opsSection}
              {pendingSection}
            </>
          ) : (
            <>
              {pendingSection}
              {opsSection}
            </>
          )}

          <div className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink">Recent reservations</h2>
              <Link href={`/hotels/${hotelId}/reservations`} className="text-xs font-medium text-info hover:underline">
                View all
              </Link>
            </div>
            <div className="overflow-hidden rounded-lg border border-border bg-card">
              {loading ? (
                <div className="space-y-2 p-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : dashboard && dashboard.recentReservations.length > 0 ? (
                <ul className="divide-y divide-border">
                  {dashboard.recentReservations.map((r) => (
                    <li key={r.id}>
                      <Link
                        href={`/hotels/${hotelId}/reservations?ref=${r.reference}`}
                        className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-muted/40"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium text-ink">
                            {r.guest.firstName} {r.guest.lastName}
                            <span className="ml-2 font-mono text-xs text-muted-foreground">{r.reference}</span>
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {formatDate(r.checkInDate)} → {formatDate(r.checkOutDate)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <StatusBadge domain="reservation" value={r.status} />
                          <Money amount={r.totalAmount} className="text-right text-sm font-medium text-ink" />
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="p-6 text-center text-sm text-muted-foreground">No reservations yet.</p>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}

function OpsList({
  title,
  icon: Icon,
  hotelId,
  kind,
  reservations,
  showActions,
}: {
  title: string;
  icon: typeof CalendarCheck;
  hotelId: string;
  kind: 'arrival' | 'departure';
  reservations: AdminDashboardQuery['adminDashboard']['arrivalsTodayList'];
  showActions: boolean;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
        <h2 className="text-sm font-semibold text-ink">
          {title} <span className="font-normal text-muted-foreground">({reservations.length})</span>
        </h2>
      </div>
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {reservations.length > 0 ? (
          <ul className="divide-y divide-border">
            {reservations.map((r) => (
              <OpsReservationCard key={r.id} hotelId={hotelId} reservation={r} kind={kind} showActions={showActions} />
            ))}
          </ul>
        ) : (
          <p className="p-6 text-center text-sm text-muted-foreground">
            No {kind === 'arrival' ? 'arrivals' : 'departures'} today.
          </p>
        )}
      </div>
    </div>
  );
}
