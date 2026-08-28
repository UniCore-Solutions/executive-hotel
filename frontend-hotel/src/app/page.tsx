import type { Metadata } from 'next';
import Link from 'next/link';
import HeaderTheme from '@/components/layout/HeaderTheme';
import StickySearchBar from '@/components/home/StickySearchBar';
import FeaturedRooms from '@/components/home/FeaturedRooms';
import FeaturedReviews from '@/components/home/FeaturedReviews';
import RecentActivity from '@/components/home/RecentActivity';
import NewsletterForm from '@/components/home/NewsletterForm';
import { Stars } from '@/components/ui/Stars';
import { Icon } from '@/components/ui/Icon';
import { getPlatformContent, type FeaturedExperience } from '@/services/platform';
import { getHomepage } from '@/services/homepage';
import { getCanonicalHotel } from '@/services/canonicalHotel';
import { getRoomTypes, getOffers, getHotelDetails } from '@/services/catalog';
import { formatPrice } from '@/lib/format';
import type { IconName } from '@/constants/icons';

/* Single-hotel platform home page. Every section is sourced from the backend
   (canonical hotel + platform content). There is no hotel collection and no
   fixture fallback: if the backend cannot provide the data, the error
   boundary renders the real failure state. */

const HERO_FALLBACK_IMAGE =
  'https://cf.bstatic.com/xdata/images/hotel/max1024x768/572984359.jpg?k=c319f2502790e9a3a12181017bfb98066f040aebf48c6f02f4665c04a5aad074&o=';

export async function generateMetadata(): Promise<Metadata> {
  try {
    const hotel = await getCanonicalHotel();
    return {
      title: `${hotel.name} — ${hotel.city ?? 'rooms & availability'}`,
      description: hotel.description ?? `${hotel.name} — direct booking, live availability.`,
      openGraph: {
        title: `${hotel.name} — ${hotel.city ?? ''}`,
        description: hotel.description ?? undefined,
        type: 'website',
        siteName: hotel.name,
      },
    };
  } catch {
    return { title: 'Hotel' };
  }
}

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
  const hotel = await getCanonicalHotel();
  const [platform, homepage, details] = await Promise.all([
    getPlatformContent(),
    getHomepage(),
    getHotelDetails(hotel.id).catch(() => null),
  ]);
  const hero = platform.hero;
  const featuredExperiences = platform.featuredExperiences;
  const [roomTypes, offers] = await Promise.all([
    getRoomTypes(hotel.id),
    getOffers(hotel.id).catch(() => []),
  ]);

  const rating = hotel.averageRating ?? null;
  const reviewCount = details?.reviewsCount ?? 0;
  const address = [
    hotel.addressLine1,
    hotel.addressLine2,
    hotel.city,
    hotel.countryCode,
  ].filter(Boolean).join(', ');

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
          alt={hero?.imageAlt ?? `${hotel.name} — ${hotel.city}`}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="from-navy-dark/70 via-navy-dark/40 to-navy-dark/25 absolute inset-0 bg-gradient-to-t" />
        <div
          aria-hidden="true"
          className="from-navy-dark/60 absolute inset-x-0 top-0 h-44 bg-gradient-to-b to-transparent"
        />

        <div className="relative mx-auto flex w-full max-w-7xl flex-col justify-end px-4 pt-28 pb-12 sm:px-6 lg:px-8 lg:pt-40 lg:pb-20">
          <p className="eyebrow text-gold-light text-[11px] font-semibold tracking-[0.3em] uppercase">
            {hero?.eyebrow ?? [hotel.city, hotel.countryCode].filter(Boolean).join(' · ')}
          </p>
          <h1 className="font-display mt-3 max-w-3xl text-3xl leading-[1.15] font-semibold text-white sm:mt-4 sm:text-5xl sm:leading-[1.05] lg:text-6xl">
            {hero?.title ?? hotel.name}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/85 sm:mt-5 sm:text-base sm:leading-relaxed lg:text-lg">
            {hero?.subtitle ?? hotel.description}
          </p>

          <StickySearchBar />

          <div
            className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2 text-[13px] leading-snug text-white/80 sm:mt-6 sm:flex sm:flex-wrap sm:items-center sm:gap-x-6 sm:gap-y-2 sm:text-sm sm:leading-normal"
            data-hero-facts
          >
            {rating !== null ? (
              <span className="inline-flex items-center gap-1.5">
                <svg className="text-gold-light h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 1.5 12.6 7l6 .6-4.5 4 1.3 5.9L10 14.4 4.6 17.5 6 11.6 1.5 7.6l6-.6L10 1.5Z" />
                </svg>
                <strong>{rating.toFixed(1)}</strong>
              </span>
            ) : null}
            <span>
              <strong>{reviewCount}</strong> guest reviews
            </span>
            <span className="hidden opacity-40 sm:inline">|</span>
            <span>
              {roomTypes.length} room type{roomTypes.length === 1 ? '' : 's'} &amp; suites
            </span>
            <span className="hidden opacity-40 sm:inline">|</span>
            <span>Check-in {hotel.checkInTime ?? '15:00'}</span>
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
          <div className="border-navy/10 mt-10 rounded-3xl border bg-white p-10 text-center">
            <p className="font-display text-navy text-xl font-semibold">No rooms yet</p>
            <p className="text-navy/60 mt-2 text-sm">
              Check back soon — availability is published as rooms become bookable.
            </p>
          </div>
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
            Around {hotel.city ?? 'the hotel'}
          </p>
          <h2 id="exp-title" className="font-display mt-2 text-3xl font-semibold lg:text-4xl">
            Experiences
          </h2>
          <p className="mt-3 max-w-2xl text-white/60">
            {hotel.description}
          </p>
          <div
            className={`mt-10 grid gap-5 sm:grid-cols-2 ${homepage.experiences.length || featuredExperiences?.length ? 'lg:grid-cols-3' : 'lg:grid-cols-4'}`}
          >
            {homepage.experiences.length
              ? homepage.experiences.map((e) => {
                  const price =
                    e.priceAmount == null ? null : formatPrice(e.priceAmount, e.currencyCode);
                  return (
                    <a
                      key={e.id}
                      href={`/hotel?hotelid=${hotel.id}`}
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
                      {e.location ? (
                        <p className="mt-1 text-xs text-white/40">{e.location}</p>
                      ) : null}
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
              : null}
          </div>
        </div>
      </section>

      {/* ======================= FACILITIES ======================= */}
      {hotel.amenities.length ? (
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
                href={`/hotel?hotelid=${hotel.id}#facilities`}
                className="text-navy hover:text-gold-dark hidden items-center gap-2 text-sm font-semibold transition-colors sm:inline-flex"
              >
                All facilities <span aria-hidden="true">→</span>
              </Link>
            </div>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {hotel.amenities.map((a) => (
                <div key={a.id} className="border-navy/10 bg-paper rounded-3xl border p-6">
                  <span className="bg-gold/15 border-gold/30 text-gold-dark flex h-10 w-10 items-center justify-center rounded-full border">
                    <Icon name={a.icon as IconName} className="h-5 w-5" />
                  </span>
                  <h3 className="font-display text-navy mt-4 text-lg font-semibold">{a.name}</h3>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* ======================= OFFERS ======================= */}
      {offers.length ? (
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
            {offers.map((o) => (
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
      ) : null}

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
            {rating !== null ? (
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="font-display text-navy text-4xl font-semibold">
                    {rating.toFixed(1)}
                  </p>
                  <p className="text-navy/55 text-xs">from {reviewCount} guest reviews</p>
                </div>
                <Stars rating={rating} size="lg" />
              </div>
            ) : null}
          </div>
          {homepage.reviews.length ? (
            <FeaturedReviews reviews={homepage.reviews} />
          ) : (
            <div className="border-navy/10 mt-10 rounded-3xl border bg-white p-10 text-center">
              <p className="font-display text-navy text-xl font-semibold">No reviews yet</p>
              <p className="text-navy/60 mt-2 text-sm">
                Be the first to share your stay.
              </p>
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
              {hotel.city ?? hotel.name}
            </h2>
            <p className="text-navy/65 mt-4 max-w-lg">{address}</p>
          </div>
          <div className="shadow-navy/20 relative overflow-hidden rounded-3xl shadow-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={hotel.media[0]?.url ?? HERO_FALLBACK_IMAGE}
              alt={hotel.media[0]?.altText ?? `${hotel.name} — ${hotel.city}`}
              loading="lazy"
              className="h-[320px] w-full object-cover lg:h-[400px]"
            />
            <div className="from-navy-dark/80 absolute inset-x-0 bottom-0 bg-gradient-to-t to-transparent p-5">
              <p className="text-sm font-semibold text-white">{hotel.name}</p>
              <p className="text-xs text-white/70">{address}</p>
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
            News &amp; offers from {hotel.name}
          </h2>
          <p className="text-navy/60 mx-auto mt-3 max-w-lg">
            Monthly letters from {hotel.city ?? hotel.name} — new offers and seasonal rates.
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
              Your room is waiting in {hotel.city ?? hotel.name}
            </h2>
            <p className="mt-3 text-white/70">{address}</p>
            <div className="mt-5 flex items-center gap-3">
              {rating !== null ? (
                <>
                  <span className="inline-flex items-center gap-1.5 text-white/85">
                    <Stars rating={rating} size="sm" />
                    <strong>{rating.toFixed(1)}</strong>
                  </span>
                  <span className="opacity-40">|</span>
                </>
              ) : null}
              <span>{reviewCount} guest reviews</span>
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
