import type { Metadata } from 'next';
import Link from 'next/link';
import HeaderTheme from '@/components/layout/HeaderTheme';
import BookingFlow from '@/components/booking/BookingFlow';

export const metadata: Metadata = {
  title: 'Booking — Executive Boutique Hotel Rabat',
  description:
    'Complete your booking at Executive Boutique Hotel Rabat — guest details and secure (simulated) payment. Free cancellation on most rates.',
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
      <div className="mx-auto max-w-7xl px-4 pt-28 pb-20 sm:px-6 lg:px-8 lg:pt-36">
        <nav className="text-navy/45 mb-4 text-xs" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-navy">
            Home
          </Link>{' '}
          <span className="mx-1">/</span>{' '}
          <Link href="/search" className="hover:text-navy">
            Rooms &amp; availability
          </Link>{' '}
          <span className="mx-1">/</span> <span className="text-navy/70">Booking</span>
        </nav>

        <BookingFlow roomId={room} planId={plan} initialExtras={extras} />
      </div>
    </>
  );
}
