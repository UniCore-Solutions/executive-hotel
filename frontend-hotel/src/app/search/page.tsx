import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import HeaderTheme from '@/components/layout/HeaderTheme';
import SearchBar from '@/components/search/SearchBar';
import SearchResults from '@/components/search/SearchResults';

export const metadata: Metadata = {
  title: 'Rooms & availability — Executive Hotel',
  description:
    'Search live availability and book directly at Executive Hotel — air-conditioned rooms with free Wi-Fi in the Agdal district. Free cancellation on most plans.',
};

export default function SearchPage() {
  return (
    <>
      <HeaderTheme theme="light" />
      <div className="mx-auto max-w-7xl px-4 pt-28 pb-16 sm:px-6 lg:px-8 lg:pt-36">
        <nav className="text-navy/45 mb-4 text-xs" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-navy">
            Home
          </Link>{' '}
          <span className="mx-1">/</span>{' '}
          <span className="text-navy/70">Rooms &amp; availability</span>
        </nav>
        <p className="eyebrow text-gold-dark text-[11px] font-semibold tracking-[0.3em] uppercase">
          Check in with us
        </p>
        <h1 className="font-display text-navy mt-2 text-3xl font-semibold lg:text-4xl">
          Rooms for your stay
        </h1>
        <p className="text-navy/60 mt-3 max-w-2xl text-sm">
          Live availability for your dates. Every rate below is the best available once a promo code
          applies — the final price is always quoted before you pay.
        </p>

        <div
          id="searchbar"
          className="border-navy/10 shadow-navy/5 mt-8 rounded-3xl border bg-white p-3 shadow-md"
          aria-label="Search"
        >
          <SearchBar className="w-full" />
        </div>

        <Suspense fallback={null}>
          <SearchResults />
        </Suspense>
      </div>
    </>
  );
}
