import type { Metadata } from 'next';
import HeaderTheme from '@/components/layout/HeaderTheme';
import AccountFlow from '@/components/account/AccountFlow';

export const metadata: Metadata = {
  title: 'Guest account — Executive Boutique Hotel Rabat',
  description:
    'Sign in to your Executive Boutique Hotel Rabat guest account to manage bookings and preferences.',
};

export default function AccountPage() {
  return (
    <>
      <HeaderTheme theme="light" />
      <div className="mx-auto max-w-3xl px-4 pt-28 pb-20 sm:px-6 lg:px-8 lg:pt-36">
        <AccountFlow />
      </div>
    </>
  );
}
