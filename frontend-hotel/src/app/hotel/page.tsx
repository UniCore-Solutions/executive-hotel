import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { PROPERTY } from '@/data';
import HeaderTheme from '@/components/layout/HeaderTheme';
import RoomsGrid from '@/components/home/RoomsGrid';
import HotelRoomGate from '@/components/hotel/HotelRoomGate';
import HotelDetail from '@/components/hotel/HotelDetail';
import { Icon } from '@/components/ui/Icon';
import type { IconName } from '@/constants/icons';
import { Stars } from '@/components/ui/Stars';
import { getHotelById } from '@/services/catalog';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function firstParam(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const LEGACY_METADATA: Metadata = {
  title: 'About the hotel — Executive Boutique Hotel Rabat',
  description:
    "Executive Boutique Hotel Rabat — 4-star rooms with free Wi-Fi in Rabat's Agdal district. Restaurant serving French, Mediterranean and Moroccan cuisine, free buffet breakfast and free private parking.",
};

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const sp = await searchParams;
  const hotelId = firstParam(sp.hotelid);
  if (hotelId && UUID_RE.test(hotelId)) {
    const hotel = await getHotelById(hotelId);
    return {
      title: hotel && 'status' in hotel ? `${hotel.name} — rooms & availability` : 'Hotel',
    };
  }
  return LEGACY_METADATA;
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

const POLICY_ICONS: Record<string, IconName> = {
  clock: 'clock',
  child: 'child',
  paw: 'paw',
  cigarette: 'cigarette',
  car: 'car',
};

export default async function HotelPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const hotelId = firstParam(sp.hotelid);
  if (hotelId) {
    if (!UUID_RE.test(hotelId)) notFound();
    return <HotelDetail hotelId={hotelId} searchParams={sp} />;
  }
  return <HotelLegacyPage />;
}

function HotelLegacyPage() {
  const P = PROPERTY;
  const flatFaq = Object.entries(P.faq).flatMap(([topic, items]) =>
    items.map((f) => ({ ...f, topic }))
  );

  return (
    <>
      <HeaderTheme theme="dark" />
      {/* hero */}
      <section data-hero className="relative h-[64vh] min-h-[420px] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://cf.bstatic.com/xdata/images/hotel/max1024x768/576912115.jpg?k=3a21a2147228c930cc1321494aac9d1bfe1af6c8c4e5c7fe51758a348f2b78b3&o="
          alt="Living room with couches and chairs at Executive Boutique Hotel Rabat"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="from-navy-dark/85 via-navy-dark/30 to-navy-dark/20 absolute inset-0 bg-gradient-to-t"></div>
        <div className="relative z-10 mx-auto flex h-full max-w-7xl flex-col justify-end px-4 pb-12 sm:px-6 lg:px-8">
          <p className="eyebrow text-gold-light text-[11px] font-semibold tracking-[0.3em] uppercase">
            {P.brand} · {P.city}
          </p>
          <h1 className="font-display mt-2 text-4xl font-semibold text-white lg:text-5xl">
            {P.name}
          </h1>
          <p className="mt-3 max-w-2xl text-white/80">{P.description}</p>
          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-white/85">
            <span className="inline-flex items-center gap-1.5">
              <Stars rating={P.rating} size="sm" />
              <strong>{P.rating.toFixed(1)}</strong> · {P.reviewCount} guest reviews
            </span>
            <span className="hidden opacity-40 sm:inline">|</span>
            <span>{P.location.address}</span>
          </div>
        </div>
      </section>

      {/* ======================= SELECTED ROOM (?roomId=…) ======================= */}
      <Suspense fallback={null}>
        <HotelRoomGate />
      </Suspense>

      {/* story */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="eyebrow text-gold-dark text-[11px] font-semibold tracking-[0.3em] uppercase">
              Our story
            </p>
            <h2 className="font-display text-navy mt-2 text-3xl font-semibold lg:text-4xl">
              In the heart of Rabat
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
              src="https://cf.bstatic.com/xdata/images/hotel/max1024x768/572979710.jpg?k=28183c9921918bf87bc3195a46554a65a84eafffb9d3a4f5274533e971def62a&o="
              alt="Room with a bed, a desk and a TV at Executive Boutique Hotel Rabat"
              className="shadow-navy/15 aspect-[3/4] rounded-3xl object-cover shadow-xl"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://cf.bstatic.com/xdata/images/hotel/max1024x768/572984057.jpg?k=376fcf6b7d645d777fcbef5edbe1e58d5e2dd478457547702da11cf4f39bcbc3&o="
              alt="Bedroom with a bed and two blue chairs at Executive Boutique Hotel Rabat"
              className="shadow-navy/15 mt-8 aspect-[3/4] rounded-3xl object-cover shadow-xl"
            />
          </div>
        </div>
      </section>

      {/* facilities (nav target) */}
      <section id="facilities" className="border-navy/10 border-y bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="font-display text-navy text-3xl font-semibold">
            Facilities &amp; services
          </h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {P.facilities.map((f) => (
              <div key={f.name} className="border-navy/10 bg-paper rounded-3xl border p-6">
                <h3 className="font-display text-navy text-lg font-semibold">{f.name}</h3>
                <p className="text-navy/60 mt-1.5 text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* gallery */}
      <section className="bg-navy-dark relative overflow-hidden text-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="flex items-end justify-between gap-6">
            <div>
              <p className="eyebrow text-gold-light text-[11px] font-semibold tracking-[0.3em] uppercase">
                Gallery
              </p>
              <h2 className="font-display mt-2 text-3xl font-semibold lg:text-4xl">
                Inside the hotel
              </h2>
            </div>
            <p className="hidden max-w-xs text-sm text-white/60 sm:block">
              Rooms, common spaces and the restaurant — a look around before you arrive.
            </p>
          </div>
          <div
            className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
            role="region"
            aria-label="Hotel photo gallery"
            tabIndex={0}
          >
            {P.gallery.map((g, i) => (
              <div
                key={`${g.src}-${i}`}
                className={`group relative overflow-hidden rounded-3xl ${
                  i === 0 ? 'col-span-2 row-span-2' : ''
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={g.src}
                  alt={g.alt}
                  loading="lazy"
                  className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04] ${
                    i === 0 ? '' : 'aspect-square'
                  }`}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* rooms (nav target) */}
      <section id="rooms" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="flex items-end justify-between gap-6">
          <div>
            <p className="eyebrow text-gold-dark text-[11px] font-semibold tracking-[0.3em] uppercase">
              Stay
            </p>
            <h2 className="font-display text-navy mt-2 text-3xl font-semibold lg:text-4xl">
              Rooms &amp; suites
            </h2>
          </div>
          <a
            href="/search"
            className="text-navy hover:text-gold-dark hidden items-center gap-2 text-sm font-semibold transition-colors sm:inline-flex"
          >
            Check availability →
          </a>
        </div>
        <RoomsGrid variant="hotel" />
      </section>

      {/* dining */}
      <section className="bg-navy-dark relative overflow-hidden text-white">
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <p className="eyebrow text-gold-light text-[11px] font-semibold tracking-[0.3em] uppercase">
            Dining
          </p>
          <h2 className="font-display mt-2 text-3xl font-semibold lg:text-4xl">Eat with us</h2>
          <p className="mt-3 max-w-2xl text-white/60">
            French, Mediterranean and Moroccan cuisine at the hotel restaurant, with vegetarian and
            halal options on request.
          </p>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {P.restaurants.map((r) => (
              <div key={r.name} className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
                <h3 className="font-display text-lg font-semibold">{r.name}</h3>
                <p className="text-gold-light mt-1 text-[11px] tracking-wider uppercase">
                  {r.type}
                </p>
                <p className="mt-2.5 text-sm text-white/65">{r.desc}</p>
                {r.hours ? (
                  <dl className="mt-4 space-y-1.5 text-xs text-white/50">
                    <div className="flex justify-between gap-2">
                      <dt>Hours</dt>
                      <dd className="text-right">{r.hours}</dd>
                    </div>
                    {r.dress ? (
                      <div className="flex justify-between gap-2">
                        <dt>Dress code</dt>
                        <dd>{r.dress}</dd>
                      </div>
                    ) : null}
                    {r.reservation ? (
                      <div className="flex justify-between gap-2">
                        <dt>Reservations</dt>
                        <dd>Recommended</dd>
                      </div>
                    ) : null}
                  </dl>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* experiences (nav target) */}
      <section id="experiences" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <p className="eyebrow text-gold-dark text-[11px] font-semibold tracking-[0.3em] uppercase">
          Around Rabat
        </p>
        <h2 className="font-display text-navy mt-2 text-3xl font-semibold lg:text-4xl">
          Experiences
        </h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {P.experiences.map((e) => (
            <div key={e.name} className="border-navy/10 rounded-3xl border bg-white p-6">
              <span className="bg-gold/15 border-gold/30 text-gold-dark flex h-10 w-10 items-center justify-center rounded-full border">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {EXP_ICONS[e.icon] || EXP_ICONS.eye}
                </svg>
              </span>
              <h3 className="font-display text-navy mt-4 text-lg font-semibold">{e.name}</h3>
              <p className="text-navy/60 mt-1.5 text-sm">{e.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* reviews (nav target) */}
      <section id="reviews" className="bg-paper border-navy/10 border-y">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="eyebrow text-gold-dark text-[11px] font-semibold tracking-[0.3em] uppercase">
                Guest book
              </p>
              <h2 className="font-display text-navy mt-2 text-3xl font-semibold lg:text-4xl">
                In their words
              </h2>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="font-display text-navy text-4xl font-semibold">
                  {P.rating.toFixed(1)}
                </p>
                <p className="text-navy/55 text-xs">
                  {P.reviewCount} guest reviews · rated 4.4/5 · 8.8/10 on Booking.com
                </p>
              </div>
              <Stars rating={P.rating} size="lg" />
            </div>
          </div>
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
        </div>
      </section>

      {/* policies */}
      <section className="border-navy/10 border-y bg-white" aria-labelledby="policies-title">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between gap-6">
            <div>
              <p className="eyebrow text-gold-dark text-[11px] font-semibold tracking-[0.3em] uppercase">
                Good to know
              </p>
              <h2
                id="policies-title"
                className="font-display text-navy mt-2 text-3xl font-semibold lg:text-4xl"
              >
                Hotel policies
              </h2>
            </div>
            <p className="text-navy/55 hidden max-w-xs text-sm sm:block">
              House rules and arrival details, so you know what to expect.
            </p>
          </div>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {P.policies.map((p) => (
              <div key={p.name} className="border-navy/10 bg-paper rounded-3xl border p-6">
                <span className="bg-gold/15 border-gold/30 text-gold-dark flex h-10 w-10 items-center justify-center rounded-full border">
                  <Icon name={POLICY_ICONS[p.icon] ?? 'check'} className="h-5 w-5" />
                </span>
                <h3 className="font-display text-navy mt-4 text-lg font-semibold">{p.name}</h3>
                <p className="text-navy/60 mt-1.5 text-sm">{p.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* location + FAQ preview */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <p className="eyebrow text-gold-dark text-[11px] font-semibold tracking-[0.3em] uppercase">
              Find us
            </p>
            <h2 className="font-display text-navy mt-2 text-3xl font-semibold">
              In the Agdal quarter
            </h2>
            <p className="text-navy/65 mt-4 text-sm">{P.location.address}</p>
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
          <div>
            <div className="flex items-center justify-between">
              <p className="eyebrow text-gold-dark text-[11px] font-semibold tracking-[0.3em] uppercase">
                Good to know
              </p>
              <a
                href="/faq"
                className="text-navy hover:text-gold-dark text-sm font-semibold transition-colors"
              >
                All questions →
              </a>
            </div>
            <h2 className="font-display text-navy mt-2 text-3xl font-semibold">Frequently asked</h2>
            <div className="divide-navy/10 mt-6 divide-y">
              {flatFaq.slice(0, 4).map((f) => (
                <details key={f.q} className="group py-4">
                  <summary className="text-navy hover:text-gold-dark flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold transition-colors">
                    <span>{f.q}</span>
                    <span className="text-gold-dark text-sm transition-transform group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="text-navy/60 mt-2.5 pr-8 text-sm leading-relaxed">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ======================= BOOKING CTA ======================= */}
      <section className="bg-navy-dark text-white" aria-labelledby="hotel-cta-title">
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-8 px-4 py-16 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8 lg:py-20">
          <div className="max-w-2xl">
            <p className="eyebrow text-gold-light text-[11px] font-semibold tracking-[0.3em] uppercase">
              Plan your stay
            </p>
            <h2
              id="hotel-cta-title"
              className="font-display mt-2 text-3xl font-semibold lg:text-4xl"
            >
              Book your room in the Agdal quarter
            </h2>
            <p className="mt-3 text-white/70">
              Check live availability for your dates or explore the current offers — the price is
              always quoted before you pay.
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
