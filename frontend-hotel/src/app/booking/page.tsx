import type { Metadata } from 'next';
import { Suspense } from 'react';
import HeaderTheme from '@/components/layout/HeaderTheme';
import BookingFlow from '@/components/booking/BookingFlow';

export const metadata: Metadata = {
  title: 'Booking — Executive Hotel',
  description:
    'Complete your booking at Executive Hotel — guest details and payment in two steps. Live rates, real confirmations.',
};

type BookingSearchParams = Promise<{
  room?: string | string[];
  plan?: string | string[];
  extras?: string | string[];
  checkin?: string | string[];
  checkout?: string | string[];
}>;

export default async function BookingPage({ searchParams }: { searchParams: BookingSearchParams }) {
  const sp = await searchParams;
  const room = typeof sp.room === 'string' ? sp.room : '';
  const plan = typeof sp.plan === 'string' ? sp.plan : '';
  const extras = typeof sp.extras === 'string' ? sp.extras : '';

  return (
    <>
      <HeaderTheme theme="light" />
      <div className="mx-auto max-w-7xl px-4 pt-28 pb-24 sm:px-6 lg:px-8 lg:pt-36 lg:pb-20">
        {/* Suspense defers BookingFlow past SSR like the other booking flows
            (reservation/confirmation): the Apollo client is browser-only, so a
            server render of useApollo() must not fail the route. */}
        <Suspense fallback={null}>
          <BookingFlow roomId={room} planId={plan} initialExtras={extras} />
        </Suspense>
      </div>
    </>
  );
}
