import type { Metadata } from 'next';
import { Suspense } from 'react';
import HeaderTheme from '@/components/layout/HeaderTheme';
import RetryPaymentFlow from '@/components/booking/RetryPaymentFlow';

export const metadata: Metadata = {
  title: 'Try another card — Executive Hotel',
  description: 'Retry payment for a held reservation at Executive Hotel.',
};

type RetrySearchParams = Promise<{
  ref?: string | string[];
  email?: string | string[];
}>;

export default async function RetryPaymentPage({ searchParams }: { searchParams: RetrySearchParams }) {
  const sp = await searchParams;
  const reference = String((Array.isArray(sp.ref) ? sp.ref[0] : sp.ref) ?? '').trim().toUpperCase();
  const email = String((Array.isArray(sp.email) ? sp.email[0] : sp.email) ?? '').trim().toLowerCase();

  return (
    <>
      <HeaderTheme theme="light" />
      <div className="mx-auto max-w-3xl px-4 pt-28 pb-24 sm:px-6 lg:px-8 lg:pt-36 lg:pb-20">
        <Suspense fallback={null}>
          <RetryPaymentFlow reference={reference} email={email} />
        </Suspense>
      </div>
    </>
  );
}
