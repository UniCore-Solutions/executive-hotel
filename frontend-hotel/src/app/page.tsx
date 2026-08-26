import type { Metadata } from 'next';
import Link from 'next/link';
import { OFFERS, PROPERTY } from '@/data';
import HeaderTheme from '@/components/layout/HeaderTheme';
import StickySearchBar from '@/components/home/StickySearchBar';
import RoomsGrid from '@/components/home/RoomsGrid';
import FeaturedHotels from '@/components/home/FeaturedHotels';
import FeaturedRooms from '@/components/home/FeaturedRooms';
import FeaturedReviews from '@/components/home/FeaturedReviews';
import RecentActivity from '@/components/home/RecentActivity';
import NewsletterForm from '@/components/home/NewsletterForm';
import { Stars } from '@/components/ui/Stars';
import { Icon } from '@/components/ui/Icon';
import { getPlatformContent, type FeaturedExperience } from '@/services/platform';
import { getHomepage } from '@/services/homepage';
import { formatPrice } from '@/lib/format';
import type { IconName } from '@/constants/icons';

const HERO_FALLBACK_IMAGE =
  'https://cf.bstatic.com/xdata/images/hotel/max1024x768/572984359.jpg?k=c319f2502790e9a3a12181017bfb98066f040aebf48c6f02f4665c04a5aad074&o=';

export const metadata: Metadata = {
  title: 'Executive Boutique Hotel Rabat — 4★ in the Agdal district',
  description:
    'Executive Boutique Hotel Rabat — 4-star rooms with free Wi-Fi in the Agdal district, a restaurant serving French, Mediterranean and Moroccan cuisine, a free buffet breakfast and free private parking.',
  openGraph: {
    title: 'Executive Boutique Hotel Rabat — Agdal',
    description:
      "4-star comfort in Rabat's Agdal district — free Wi-Fi, free parking, a restaurant serving French, Mediterranean and Moroccan cuisine, and a free buffet breakfast.",
  },
};

const EXP_ICONS: Record<string, React.ReactNode> = {
  eye: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Zm9.5 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
    />
  ),
  utensils: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      d="M7 3v5m0 0v13m0-13H4V3m3 5h3V3M17 3v18m-3-18c2.5 0 4 2 4 5h-4V3Z"
    />
  ),
  pin: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"
    />
  ),
  spa: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      d="M12 21a9 9 0 0 0 9-9c-5 0-9 4-9 9Zm0 0a9 9 0 0 1-9-9c5 0 9 4 9 9Zm0-9a4 4 0 0 1 4-4 4 4 0 0 1-4 4Zm0 0a4 4 0 0 1-4-4 4 4 0 0 1 4 4Z"
    />
  ),
};

export default async function HomePage() {
  const platform = await getPlatformContent();
  const hero = platform.hero;
  const featuredExperiences = platform.featuredExperiences;
  const homepage = await getHomepage();
  const P = PROPERTY;

  const featuredPrice = (e: FeaturedExperience) => {
    if (e.priceAmount === null) return null;
    const symbol = e.currencyCode === 'EUR' ? '€' : e.currencyCode ?? '';
    return `${symbol}${e.priceAmount}`;
  };

  return (
    <>
      <HeaderTheme theme="dark" />
      {/* ======================= HERO ======================= */}
      <section
        data-hero
        className="bg-navy-dark relative flex min-h-dvh items-stretch"
        aria-label="Welcome"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={hero?.imageUrl ?? HERO_FALLBACK_IMAGE}
          alt={hero?.imageAlt ?? 'Lobby with a wooden feature wall at Executive Boutique Hotel Rabat'}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="from-navy-dark/70 via-navy-dark/40 to-navy-dark/25 absolute inset-0 bg-gradient-to-t" />
        <div
          aria-hidden="true"
          className="from-navy-dark/60 absolute inset-x-0 top-0 h-44 bg-gradient-to-b to-transparent"
        />

        <div className="relative mx-auto flex w-full max-w-7xl flex-col justify-end px-4 pt-28 pb-12 sm:px-6 lg:px-8 lg:pt-40 lg:pb-20">
          <p className="eyebrow text-gold-light text-[11px] font-semibold tracking-[0.3em] uppercase">
            {hero?.eyebrow ?? 'Rabat · Agdal'}
          </p>
          <h1 className="font-display mt-3 max-w-3xl text-3xl leading-[1.15] font-semibold text-white sm:mt-4 sm:text-5xl sm:leading-[1.05] lg:text-6xl">
            {hero?.title ?? 'Four-star comfort in the heart of Rabat.'}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/85 sm:mt-5 sm:text-base sm:leading-relaxed lg:text-lg">
            {hero?.subtitle ??
              'Air-conditioned rooms with free Wi-Fi in the Agdal district — a restaurant serving French, Mediterranean and Moroccan cuisine, a free buffet breakfast and free private parking.'}
          </p>

          <StickySearchBar />

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

          {hero?.ctaLabel && hero.ctaTarget ? (
            <a
              href={hero.ctaTarget}
              className="bg-gold text-navy-dark hover:bg-gold-light mt-5 inline-flex w-fit items-center justify-center gap-2 rounded-xl px-6 py-3 text-xs font-bold tracking-widest uppercase transition-colors sm:mt-6"
            >
              {hero.ctaLabel}
            </a>
          ) : null}
        </div>
      </section>

      {/* ======================= RECENT ACTIVITY ======================= */}
      <RecentActivity />

      {/* ======================= FEATURED HOTELS (backend-curated) ======================= */}
      {homepage.hotels.length ? <FeaturedHotels hotels={homepage.hotels} /> : null}

      {/* ======================= ROOMS ======================= */}
      <section
        id="rooms"
        className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24"
        aria-labelledby="rooms-title"
      >
        <div className="flex items-end justify-between gap-6">
          <div>
            <p className="eyebrow text-gold-dark text-[11px] font-semibold tracking-[0.3em] uppercase">
              Stay
            </p>
            <h2
              id="rooms-title"
              className="font-display text-navy mt-2 text-3xl font-semibold lg:text-4xl"
            >
              Rooms &amp; suites
            </h2>
          </div>
          <a
            href="/search"
            className="text-navy hover:text-gold-dark hidden items-center gap-2 text-sm font-semibold transition-colors sm:inline-flex"
          >
            Check availability <span aria-hidden="true">→</span>
          </a>
        </div>
        {homepage.roomTypes.length ? (
          <FeaturedRooms roomTypes={homepage.roomTypes} />
        ) : (
          <RoomsGrid />
        )}
      </section>

      {/* ======================= EXPERIENCES ======================= */}
      <section
        className="bg-navy-dark relative overflow-hidden text-white"
        id="experiences"
        aria-labelledby="exp-title"
      >
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <p className="eyebrow text-gold-light text-[11px] font-semibold tracking-[0.3em] uppercase">
            Around Rabat
          </p>
          <h2 id="exp-title" className="font-display mt-2 text-3xl font-semibold lg:text-4xl">
            Experiences
          </h2>
          <p className="mt-3 max-w-2xl text-white/60">
            Rabat&apos;s great sights are all within a short ride from the hotel — the kasbah, the
            tower and the river.
          </p>
          <div
            className={`mt-10 grid gap-5 sm:grid-cols-2 ${homepage.experiences.length ? 'lg:grid-cols-3' : featuredExperiences?.length ? 'lg:grid-cols-3' : 'lg:grid-cols-4'}`}
          >
            {homepage.experiences.length
              ? homepage.experiences.map((e) => {
                  const price =
                    e.priceAmount == null ? null : formatPrice(e.priceAmount, e.currencyCode);
                  return (
                    <a
                      key={e.id}
                      href={`/hotel?hotelid=${e.hotelId}`}
                      className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 transition-colors hover:bg-white/[0.08]"
                    >
                      <span className="bg-gold/15 border-gold/30 text-gold-light flex h-10 w-10 items-center justify-center rounded-full border">
                        <svg
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          {EXP_ICONS.eye}
                        </svg>
                      </span>
                      <h3 className="font-display mt-4 text-lg font-semibold">{e.name}</h3>
                      <p className="mt-1.5 text-sm text-white/60">{e.description}</p>
                      {e.location ? <p className="mt-1 text-xs text-white/40">{e.location}</p> : null}
                      {price ? (
                        <p className="text-gold-light mt-3 text-sm font-semibold">{price}</p>
                      ) : null}
                      {e.durationMinutes ? (
                        <p className="mt-1 text-xs text-white/40">{e.durationMinutes} min</p>
                      ) : null}
                    </a>
                  );
                })
              : featuredExperiences?.length
                ? featuredExperiences.map((e) => {
                  const price = featuredPrice(e);
                  return (
                    <div
                      key={e.id}
                      className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 transition-colors hover:bg-white/[0.08]"
                    >
                      <span className="bg-gold/15 border-gold/30 text-gold-light flex h-10 w-10 items-center justify-center rounded-full border">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          {EXP_ICONS.eye}
                        </svg>
                      </span>
                      <h3 className="font-display mt-4 text-lg font-semibold">{e.name}</h3>
                      <p className="mt-1.5 text-sm text-white/60">{e.description}</p>
                      {price ? (
                        <p className="text-gold-light mt-3 text-sm font-semibold">{price}</p>
                      ) : null}
                      {e.durationMinutes ? (
                        <p className="mt-1 text-xs text-white/40">{e.durationMinutes} min</p>
                      ) : null}
                    </div>
                  );
                })
              : P.experiences.map((e) => (
                  <div
                    key={e.name}
                    className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 transition-colors hover:bg-white/[0.08]"
                  >
                    <span className="bg-gold/15 border-gold/30 text-gold-light flex h-10 w-10 items-center justify-center rounded-full border">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        {EXP_ICONS[e.icon] || EXP_ICONS.eye}
                      </svg>
                    </span>
                    <h3 className="font-display mt-4 text-lg font-semibold">{e.name}</h3>
                    <p className="mt-1.5 text-sm text-white/60">{e.desc}</p>
                  </div>
                ))}
          </div>
        </div>
      </section>

      {/* ======================= HIGHLIGHTS ======================= */}
      <section className="border-navy/10 border-y bg-white" aria-labelledby="hl-title">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="flex items-end justify-between gap-6">
            <div>
              <p className="eyebrow text-gold-dark text-[11px] font-semibold tracking-[0.3em] uppercase">
                Why stay with us
              </p>
              <h2
                id="hl-title"
                className="font-display text-navy mt-2 text-3xl font-semibold lg:text-4xl"
              >
                Facilities &amp; services
              </h2>
            </div>
            <Link
              href="/hotel#facilities"
              className="text-navy hover:text-gold-dark hidden items-center gap-2 text-sm font-semibold transition-colors sm:inline-flex"
            >
              All facilities <span aria-hidden="true">→</span>
            </Link>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {P.facilities.map((f) => (
              <div key={f.name} className="border-navy/10 bg-paper rounded-3xl border p-6">
                <span className="bg-gold/15 border-gold/30 text-gold-dark flex h-10 w-10 items-center justify-center rounded-full border">
                  <Icon name={f.icon as IconName} className="h-5 w-5" />
                </span>
                <h3 className="font-display text-navy mt-4 text-lg font-semibold">{f.name}</h3>
                <p className="text-navy/60 mt-1.5 text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ======================= OFFERS ======================= */}
      <section
        id="offers"
        className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24"
        aria-labelledby="offers-title"
      >
        <div className="flex items-end justify-between gap-6">
          <div>
            <p className="eyebrow text-gold-dark text-[11px] font-semibold tracking-[0.3em] uppercase">
              Value
            </p>
            <h2
              id="offers-title"
              className="font-display text-navy mt-2 text-3xl font-semibold lg:text-4xl"
            >
              Current offers
            </h2>
          </div>
          <a
            href="/offers"
            className="text-navy hover:text-gold-dark hidden items-center gap-2 text-sm font-semibold transition-colors sm:inline-flex"
          >
            All offers <span aria-hidden="true">→</span>
          </a>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {OFFERS.slice(0, 3).map((o) => (
            <a
              key={o.code}
              href="/offers"
              className="group border-navy/10 hover:shadow-navy/10 flex flex-col gap-3 rounded-3xl border bg-white p-6 shadow-sm transition-shadow hover:shadow-2xl"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-display text-gold-dark text-3xl font-semibold">
                  {o.badge}
                </span>
                <span className="text-navy/45 text-[11px] font-bold tracking-[0.18em] uppercase">
                  Code{' '}
                  <span className="text-navy bg-paper border-navy/10 rounded-lg border px-2 py-0.5">
                    {o.code}
                  </span>
                </span>
              </div>
              <h3 className="font-display text-navy group-hover:text-gold-dark text-xl font-semibold transition-colors">
                {o.title}
              </h3>
              <p className="text-navy/65 text-sm">{o.desc}</p>
              <div className="mt-auto flex flex-wrap gap-1.5">
                {o.conditions.slice(0, 2).map((c) => (
                  <span
                    key={c}
                    className="text-navy/55 bg-paper border-navy/8 rounded-full border px-2.5 py-1 text-[11px]"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* ======================= REVIEWS ======================= */}
      <section
        id="reviews"
        className="bg-paper border-navy/10 border-y overflow-hidden"
        aria-labelledby="reviews-title"
      >
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
<div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="eyebrow text-gold-dark text-[11px] font-semibold tracking-[0.3em] uppercase">
                  Guest book
                </p>
                <h2
                  id="reviews-title"
                  className="font-display text-navy mt-2 text-3xl font-semibold lg:text-4xl"
                >
                  In their words
                </h2>
              </div>
              {homepage.reviews.length ? null : (
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-display text-navy text-4xl font-semibold">
                      {P.rating.toFixed(1)}
                    </p>
                    <p className="text-navy/55 text-xs">from {P.reviewCount} guest reviews</p>
                  </div>
                  <Stars rating={P.rating} size="lg" />
                </div>
              )}
            </div>
            {homepage.reviews.length ? (
              <FeaturedReviews reviews={homepage.reviews} />
            ) : (
              <div
                className="no-scrollbar snap-x-mandatory mt-10 flex gap-5 overflow-x-auto pb-2"
                role="region"
                aria-label="Guest reviews"
                tabIndex={0}
              >
                {P.reviews.map((rv) => (
                  <article
                    key={rv.title}
                    className="snap-card border-navy/10 flex w-[85%] shrink-0 flex-col rounded-3xl border bg-white p-6 shadow-sm sm:w-[380px]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="bg-navy text-gold-light font-display flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold">
                          {rv.author
                            .split(' ')
                            .map((w) => w[0])
                            .slice(0, 2)
                            .join('')}
                        </span>
                        <div>
                          <p className="text-navy text-sm font-semibold">{rv.author}</p>
                          <p className="text-navy/50 text-[11px]">
                            {rv.country} · {rv.stay}
                          </p>
                        </div>
                      </div>
                      <Stars rating={rv.rating} size="sm" />
                    </div>
                    <h3 className="font-display text-navy mt-4 font-semibold">{rv.title}</h3>
                    <p className="text-navy/65 mt-1.5 text-sm">{rv.text}</p>
                    <p className="text-navy/40 mt-auto pt-4 text-[11px]">{rv.date}</p>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

      {/* ======================= LOCATION ======================= */}
      <section
        className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24"
        aria-labelledby="loc-title"
      >
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <p className="eyebrow text-gold-dark text-[11px] font-semibold tracking-[0.3em] uppercase">
              Find us
            </p>
            <h2
              id="loc-title"
              className="font-display text-navy mt-2 text-3xl font-semibold lg:text-4xl"
            >
              In the Agdal quarter
            </h2>
            <p className="text-navy/65 mt-4 max-w-lg">
              72 Rue Oued Sebou, 10106 Rabat, Morocco — steps from Mohammed V University and the
              National Library, with free private parking on site and Rabat-Ville station
              2.3&nbsp;km away.
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              {P.location.distances.map((d) => (
                <li
                  key={d.label}
                  className="border-navy/8 flex items-baseline justify-between gap-4 border-b pb-3"
                >
                  <span className="text-navy font-medium">{d.label}</span>
                  <span className="text-navy/55 text-right">{d.value}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="shadow-navy/20 relative overflow-hidden rounded-3xl shadow-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://cf.bstatic.com/xdata/images/hotel/max1024x768/576912113.jpg?k=e4a8439005872a2f65d93838b01e518ee5386fcf62eceaf457b1d91023f99a68&o="
              alt="Lobby waiting area with chairs and tables at Executive Boutique Hotel Rabat"
              loading="lazy"
              className="h-[320px] w-full object-cover lg:h-[400px]"
            />
            <div className="from-navy-dark/80 absolute inset-x-0 bottom-0 bg-gradient-to-t to-transparent p-5">
              <p className="text-sm font-semibold text-white">{P.name}</p>
              <p className="text-xs text-white/70">72 Rue Oued Sebou · Agdal, Rabat</p>
            </div>
          </div>
        </div>
      </section>

      {/* ======================= NEWSLETTER ======================= */}
      <section
        id="newsletter"
        className="bg-gold/[0.08] border-gold/20 border-t"
        aria-labelledby="nl-title"
      >
        <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6">
          <p className="eyebrow text-gold-dark text-[11px] font-semibold tracking-[0.3em] uppercase">
            Stay in touch
          </p>
          <h2
            id="nl-title"
            className="font-display text-navy mt-2 text-3xl font-semibold lg:text-4xl"
          >
            5% off your first direct booking
          </h2>
          <p className="text-navy/60 mx-auto mt-3 max-w-lg">
            Monthly letters from Rabat — new offers and seasonal rates. Use code{' '}
            <strong className="text-gold-dark">WELCOME5</strong> when you book.
          </p>
          <NewsletterForm />
        </div>
      </section>

      {/* ======================= FINAL CTA ======================= */}
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
