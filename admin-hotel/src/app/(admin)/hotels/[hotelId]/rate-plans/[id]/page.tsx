'use client';

import { use, useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@apollo/client/react';
import { AdminRatePlansDocument } from '@/graphql/generated/graphql';
import { PageHeader } from '@/components/shared/PageHeader';
import { ErrorState } from '@/components/shared/ErrorState';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { RatePlanDetailsForm } from '@/components/modules/rate-plans/RatePlanDetailsForm';
import { RatePlanPricingPanel } from '@/components/modules/rate-plans/RatePlanPricingPanel';

export default function RatePlanEditPage({ params }: { params: Promise<{ hotelId: string; id: string }> }) {
  const { hotelId, id } = use(params);
  const { data, loading, error, refetch } = useQuery(AdminRatePlansDocument, { variables: { hotelId } });

  const liveRatePlan = data?.adminHotel?.ratePlans.find((rp) => rp.id === id);
  // Buffered against the plan momentarily disappearing from `data` during a
  // background `refetch()` (every link/unlink/price save calls one via
  // `onChanged`). Gating the Tabs below on live `data`/`loading` directly
  // unmounted them on every such refetch — confirmed with Playwright
  // (`Save prices` visibly threw the active tab back to "Details" every
  // time) — because the ternary's "not found" branch rendered for one
  // frame in between, and remounting <Tabs> resets it to
  // `defaultValue="details"`. Once we've seen a real plan, keep showing it
  // until a *new* one replaces it; never clear it back to undefined.
  const [ratePlan, setRatePlan] = useState(liveRatePlan);
  // "Adjusting state during render" (not an effect — react-hooks flags
  // setState-in-effect as a cascading-render smell) — react.dev's own
  // pattern for buffering against a prop/query value that goes away
  // between renders: https://react.dev/learn/you-might-not-need-an-effect
  const [prevLiveRatePlan, setPrevLiveRatePlan] = useState(liveRatePlan);
  if (liveRatePlan !== prevLiveRatePlan) {
    setPrevLiveRatePlan(liveRatePlan);
    if (liveRatePlan) setRatePlan(liveRatePlan);
  }

  const roomTypeOptions = useMemo(
    () => (data?.adminHotel?.roomTypes ?? []).map((rt) => ({ value: rt.id, label: rt.name })),
    [data],
  );

  return (
    <>
      <PageHeader
        title={ratePlan?.name ?? 'Rate plan'}
        breadcrumb={
          <Link href={`/hotels/${hotelId}/rate-plans`} className="hover:text-ink hover:underline">
            Rate Plans
          </Link>
        }
        actions={ratePlan ? <StatusBadge domain="catalog" value={ratePlan.status} /> : undefined}
      />

      {!ratePlan && loading ? (
        <div className="space-y-4">
          <Skeleton className="h-9 w-full max-w-md" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : !ratePlan && error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : !ratePlan ? (
        <ErrorState error={new Error('Rate plan not found.')} />
      ) : (
        <Tabs defaultValue="details">
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="pricing">Room type & pricing ({ratePlan.links.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="details">
            <Card className="max-w-2xl">
              <RatePlanDetailsForm hotelId={hotelId} ratePlan={ratePlan} onSaved={() => void refetch()} />
            </Card>
          </TabsContent>

          <TabsContent value="pricing">
            <RatePlanPricingPanel
              ratePlanId={ratePlan.id}
              links={ratePlan.links}
              roomTypeOptions={roomTypeOptions}
              onChanged={() => void refetch()}
            />
          </TabsContent>
        </Tabs>
      )}
    </>
  );
}
