import type { Metadata } from 'next';
import { BK, PROPERTY } from '@/data';
import HeaderTheme from '@/components/layout/HeaderTheme';
import SearchBar from '@/components/search/SearchBar';
import DiscoverSection from '@/components/home/DiscoverSection';
import { Stars } from '@/components/ui/Stars';

export const metadata: Metadata = {
  title: 'Executive Boutique Hotel Rabat — Discover new ways to stay',
  description:
    'Discover new ways to stay at Executive Boutique Hotel Rabat — rooms, suites and hotel offers designed around the way you want to travel, in the Agdal district.',
};

const P = PROPERTY;

export default function IndexTwoPage() {
  return (
    <>
      <HeaderTheme theme="dark" />
      {/* ======================= HERO ======================= */}
      <section
        data-hero
        className="bg-navy-dark relative flex min-h-dvh items-start"
        aria-label="Welcome"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={BK.bedroomBlueChairs}
          alt="Bedroom with a bed and two blue chairs at Executive Boutique Hotel Rabat"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="from-navy-dark/80 via-navy-dark/35 to-navy-dark/10 absolute inset-0 bg-gradient-to-b" />

        <div className="relative mx-auto flex w-full max-w-7xl flex-col px-4 pt-32 sm:px-6 lg:px-8 lg:pt-44">
          <p className="eyebrow text-gold-light text-[11px] font-semibold tracking-[0.3em] uppercase">
            Executive Boutique Hotel · Agdal
          </p>
          <h1 className="font-display mt-3 max-w-3xl text-3xl leading-[1.15] font-semibold text-white sm:mt-4 sm:text-5xl sm:leading-[1.05] lg:text-6xl">
            A boutique stay in the heart of Rabat.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/85 sm:mt-5 sm:text-base sm:leading-relaxed lg:text-lg">
            Four-star comfort in the Agdal district — air-conditioned rooms, a restaurant serving
            French, Mediterranean and Moroccan cuisine, and a free buffet breakfast.
          </p>

          <div id="searchbar" className="mt-8 w-full max-w-4xl lg:mt-12" data-hero-search>
            <SearchBar className="w-full" />
          </div>

          <div
            className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2 text-[13px] leading-snug text-white/80 sm:mt-6 sm:flex sm:flex-wrap sm:items-center sm:gap-x-6 sm:gap-y-2 sm:text-sm sm:leading-normal"
            data-hero-facts
          >
            <span className="inline-flex items-center gap-1.5">
              <svg className="text-gold-light h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 1.5 12.6 7l6 .6-4.5 4 1.3 5.9L10 14.4 4.6 17.5 6 11.6 1.5 7.6l6-.6L10 1.5Z" />
              </svg>
              <strong>{P.rating.toFixed(1)}</strong>
            </span>
            <span>
              <strong>{P.reviewCount}</strong> guest reviews
            </span>
            <span className="hidden opacity-40 sm:inline">|</span>
            <span>{P.rooms.length} room types &amp; suites</span>
            <span className="hidden opacity-40 sm:inline">|</span>
            <span>Check-in 15:00</span>
          </div>
        </div>
      </section>

      {/* ======================= INTRO ======================= */}
      <section
        className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24"
        aria-labelledby="intro-title"
      >
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="eyebrow text-gold-dark text-[11px] font-semibold tracking-[0.3em] uppercase">
              The hotel
            </p>
            <h2
              id="intro-title"
              className="font-display text-navy mt-2 text-3xl font-semibold lg:text-4xl"
            >
              Where Rabat feels like home
            </h2>
            <p className="text-navy/70 mt-5 leading-relaxed">{P.longDescription}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {P.highlights.map((h) => (
                <span
                  key={h}
                  className="text-navy bg-paper border-navy/10 inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold"
                >
                  <span className="text-gold-dark">✦</span>
                  {h}
                </span>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={BK.lobbyWaitingArea}
              alt="Lobby waiting area with chairs and tables at Executive Boutique Hotel Rabat"
              loading="lazy"
              className="shadow-navy/15 aspect-[3/4] rounded-3xl object-cover shadow-xl"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={BK.roomWhiteBedDressing}
              alt="Room with a white bed and a dressing area at Executive Boutique Hotel Rabat"
              loading="lazy"
              className="shadow-navy/15 mt-8 aspect-[3/4] rounded-3xl object-cover shadow-xl"
            />
          </div>
        </div>
      </section>

      {/* ======================= DISCOVER ======================= */}
      <DiscoverSection />

      {/* ======================= PLAN YOUR STAY ======================= */}
      <section className="bg-navy-dark text-white" aria-labelledby="plan-title">
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-8 px-4 py-16 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8 lg:py-20">
          <div className="max-w-2xl">
            <p className="eyebrow text-gold-light text-[11px] font-semibold tracking-[0.3em] uppercase">
              Plan your stay
            </p>
            <h2 id="plan-title" className="font-display mt-2 text-3xl font-semibold lg:text-4xl">
              Your room is waiting in the Agdal quarter
            </h2>
            <p className="mt-3 text-white/70">
              72 Rue Oued Sebou, 10106 Rabat — steps from Mohammed V University and the National
              Library, with free private parking on site.
            </p>
            <div className="mt-5 flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 text-white/85">
                <Stars rating={P.rating} size="sm" />
                <strong>{P.rating.toFixed(1)}</strong>
              </span>
              <span className="opacity-40">|</span>
              <span>{P.reviewCount} guest reviews</span>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-3">
            <a
              href="/search"
              className="bg-gold text-navy-dark hover:bg-gold-light inline-flex items-center justify-center gap-2 rounded-xl px-7 py-3.5 text-xs font-bold tracking-widest uppercase transition-colors"
            >
              Search availability
            </a>
            <a
              href="/offers"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 bg-transparent px-7 py-3.5 text-xs font-bold tracking-widest text-white/85 uppercase transition-colors hover:bg-white/10"
            >
              View offers
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
