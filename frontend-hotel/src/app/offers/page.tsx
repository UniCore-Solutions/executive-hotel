import type { Metadata } from 'next';
import Link from 'next/link';
import HeaderTheme from '@/components/layout/HeaderTheme';
import OffersGrid from '@/components/offers/OffersGrid';

export const metadata: Metadata = {
  title: 'Offers — Executive Hotel',
  description:
    'Current offers at Executive Hotel, Lisbon: seasonal savings and direct rates. Book direct for the best rate.',
};

export default function OffersPage() {
  return (
    <>
      <HeaderTheme theme="light" />
      <div className="mx-auto max-w-7xl px-4 pt-28 pb-20 sm:px-6 lg:px-8 lg:pt-36">
        <nav className="text-navy/45 mb-4 text-xs" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-navy">
            Home
          </Link>{' '}
          <span className="mx-1">/</span> <span className="text-navy/70">Offers</span>
        </nav>
        <p className="eyebrow text-gold-dark text-[11px] font-semibold tracking-[0.3em] uppercase">
          Direct rates
        </p>
        <h1 className="font-display text-navy mt-2 text-3xl font-semibold lg:text-4xl">
          Offers &amp; promo codes
        </h1>
        <p className="text-navy/60 mt-3 max-w-2xl text-sm">
          Enter the code at any step of booking — your price is quoted with the discount before you
          pay. Codes never stack; the best applicable offer wins.
        </p>

        <OffersGrid />

        <div className="bg-navy-dark relative mt-12 overflow-hidden rounded-3xl p-8 text-white lg:p-10">
          <div className="relative">
            <p className="font-display max-w-xl text-2xl font-semibold">Best-rate promise</p>
            <p className="mt-3 max-w-xl text-sm text-white/70">
              Book directly with us and you will always have the best available rate for your dates.
              Find it cheaper elsewhere and we will match it, and take 10% off the difference.
            </p>
            <a
              href="/search"
              className="bg-gold text-navy-dark hover:bg-gold-light mt-6 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-xs font-bold tracking-widest uppercase transition-colors"
            >
              Check your dates →
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
