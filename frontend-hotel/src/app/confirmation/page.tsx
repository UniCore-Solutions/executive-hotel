import type { Metadata } from 'next';
import { Suspense } from 'react';
import HeaderTheme from '@/components/layout/HeaderTheme';
import ConfirmationFlow from '@/components/booking/ConfirmationFlow';

export const metadata: Metadata = {
  title: 'Booking confirmed — Executive Boutique Hotel Rabat',
  description:
    'Your booking at Executive Boutique Hotel Rabat is confirmed. Manage your stay, add extras or download your details anytime.',
};

export default function ConfirmationPage() {
  return (
    <>
      <HeaderTheme theme="light" />
      <div className="mx-auto max-w-4xl px-4 pt-28 pb-20 sm:px-6 lg:px-8 lg:pt-36">
        <Suspense fallback={null}>
          <ConfirmationFlow />
        </Suspense>
      </div>
    </>
  );
}
