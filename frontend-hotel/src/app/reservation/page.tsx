import type { Metadata } from 'next';
import { Suspense } from 'react';
import HeaderTheme from '@/components/layout/HeaderTheme';
import ReservationFlow from '@/components/booking/ReservationFlow';

export const metadata: Metadata = {
  title: 'My reservation — Executive Hotel',
  description:
    'Look up your reservation at Executive Hotel with your reference and email — view your stay, add extras or cancel.',
};

export default function ReservationPage() {
  return (
    <>
      <HeaderTheme theme="light" />
      <div className="mx-auto max-w-4xl px-4 pt-28 pb-20 sm:px-6 lg:px-8 lg:pt-36">
        <p className="eyebrow text-gold-dark text-[11px] font-semibold tracking-[0.3em] uppercase">
          Guest services
        </p>
        <h1 className="font-display text-navy mt-2 text-3xl font-semibold lg:text-4xl">
          My reservation
        </h1>
        <div className="mt-8">
          <Suspense fallback={null}>
            <ReservationFlow />
          </Suspense>
        </div>
      </div>
    </>
  );
}
