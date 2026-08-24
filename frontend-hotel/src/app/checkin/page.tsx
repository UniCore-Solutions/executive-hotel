import type { Metadata } from 'next';
import { Suspense } from 'react';
import HeaderTheme from '@/components/layout/HeaderTheme';
import CheckinFlow from '@/components/booking/CheckinFlow';

export const metadata: Metadata = {
  title: 'Online check-in — Executive Boutique Hotel Rabat',
  description:
    'Check in online before your stay at Executive Boutique Hotel Rabat — confirm your details and arrival time in two minutes.',
};

export default function CheckinPage() {
  return (
    <>
      <HeaderTheme theme="light" />
      <div className="mx-auto max-w-2xl px-4 pt-28 pb-20 sm:px-6 lg:px-8 lg:pt-36">
        <p className="eyebrow text-gold-dark text-[11px] font-semibold tracking-[0.3em] uppercase">
          Arrivals
        </p>
        <h1 className="font-display text-navy mt-2 text-3xl font-semibold lg:text-4xl">
          Online check-in
        </h1>
        <Suspense fallback={null}>
          <CheckinFlow />
        </Suspense>
      </div>
    </>
  );
}
