'use client';

import { use } from 'react';
import Link from 'next/link';
import { CalendarCheck, CalendarX, DoorClosed, TrendingUp, Wallet } from 'lucide-react';
import { useQuery } from '@apollo/client/react';
import { AdminDashboardDocument } from '@/graphql/generated/graphql';
import { PageHeader } from '@/components/shared/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/ErrorState';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Money } from '@/components/shared/Money';
import { MetricCard } from '@/components/modules/dashboard/MetricCard';
import { formatDate } from '@/lib/format';

export default function DashboardPage({ params }: { params: Promise<{ hotelId: string }> }) {
  const { hotelId } = use(params);
  const { data, loading, error, refetch } = useQuery(AdminDashboardDocument, { variables: { hotelId } });

  const dashboard = data?.adminDashboard;

  return (
    <>
      <PageHeader title="Dashboard" description="Today at a glance." />

      {error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
            ) : (
              <>
                <MetricCard icon={CalendarCheck} label="Arrivals today" value={String(dashboard?.arrivalsToday ?? 0)} />
                <MetricCard icon={CalendarX} label="Departures today" value={String(dashboard?.departuresToday ?? 0)} />
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
                  icon={Wallet}
                  label="Revenue (captured)"
                  value={dashboard ? new Intl.NumberFormat('en-MA', { maximumFractionDigits: 0 }).format(dashboard.revenueTotal) + ' MAD' : '—'}
                  tone="success"
                />
              </>
            )}
          </div>

          {!loading && dashboard ? (
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
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
          ) : null}

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
