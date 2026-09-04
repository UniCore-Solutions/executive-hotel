import type { Metadata } from 'next';
import { Suspense } from 'react';
import HeaderTheme from '@/components/layout/HeaderTheme';
import OAuthCallbackFlow from '@/components/account/OAuthCallbackFlow';

export const metadata: Metadata = {
  title: 'Signing you in — Executive Hotel',
  robots: { index: false, follow: false },
};

export default function OAuthCallbackPage() {
  return (
    <>
      <HeaderTheme theme="light" />
      <div className="mx-auto max-w-3xl px-4 pt-28 pb-20 sm:px-6 lg:px-8 lg:pt-36">
        <Suspense fallback={null}>
          <OAuthCallbackFlow />
        </Suspense>
      </div>
    </>
  );
}
