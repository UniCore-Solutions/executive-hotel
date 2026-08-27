import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import HeaderTheme from '@/components/layout/HeaderTheme';
import HotelRoomGate from '@/components/hotel/HotelRoomGate';
import Breadcrumb from '@/components/ui/Breadcrumb';
import { Stars } from '@/components/ui/Stars';
import { Badge } from '@/components/ui/Badge';
import { readStateFromURL } from '@/lib/dates';
import { formatDate, formatPrice } from '@/lib/format';
import { getHotelDetails, getRoomTypes, getStay } from '@/services/catalog';

/* Hotel amenity icon paths (24×24 stroke). */
const ICON: Record<string, string> = {
  wifi: 'M5 12.5a10.5 10.5 0 0 1 14 0M8.5 16a5.5 5.5 0 0 1 7 0M12 19.5h.01',
  car: 'M4 16.5V12l2-5h12l2 5v4.5M4 16.5h16M4 16.5v2M20 16.5v2M7 13.5h.01M17 13.5h.01',
  snow: 'M12 2v20M22 12H2M18 6l-6 6 6 6M6 18l6-6-6-6',
  sun: 'M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4M12 8.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Z',
  utensils: 'M7 3v5m0 0v13m0-13H4V3m3 5h3V3M17 3v18m-3-18c2.5 0 4 2 4 5h-4V3Z',
  coffee:
    'M5 10h11v5.5a5 5 0 0 1-5 5H9.5a4.5 4.5 0 0 1-4.5-4.5V10ZM16 12.5h1.5a2.5 2.5 0 0 1 0 5H16M3.5 4.5c1 .8 1 2.3 0 3.2M7.5 4.5c1 .8 1 2.3 0 3.2',
  lock: 'M7 11V8a5 5 0 0 1 10 0v3M5 11h14v9H5v-9ZM12 14.5V17',
  tv: 'M4.5 7h15a1 1 0 0 1 1 1v9.5a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1ZM8 21.5h8M12 18.5v3',
  shower: 'M12 3c3.5 0 3.5 4.5 0 4.5S8.5 3 12 3ZM12 7.5V12.5M12 12.5 7.5 21h9L12 12.5Z',
  drop: 'M12 2.5c0 4-4.5 7-4.5 11a4.5 4.5 0 0 0 9 0c0-4-4.5-7-4.5-11Z',
  bed: 'M3 18v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6M3 18h18M5 14v4M19 14v4',
  bell: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0',
  tag: 'M12 2 2 12l10 10 10-10L12 2Zm0 0v6m0 4h.01',
  map: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7Zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z',
  headset: 'M3 18v-6a9 9 0 0 1 18 0v6M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3v5ZM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3v5Z',
  check: 'm5 12.5 4.5 4.5L19 7.5',
  users: 'M17 21v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1m9-13a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Zm7 6.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Zm2 6.5v-1a3.5 3.5 0 0 0-3-3.45',
  shuttle:
    'M4 16V8a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v8M4 16h16M4 16l-1 2h1M20 16l1 2h-1M8 20h.01M16 20h.01',
  kids: 'M9 12a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Zm11 0a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0ZM5 21v-1a4 4 0 0 1 4-4h2a4 4 0 0 1 4 4v1',
  paw: 'M11 4a2 2 0 1 1 4 0v1a2 2 0 0 1-4 0V4Zm-4 3a2 2 0 1 1 4 0v1a2 2 0 0 1-4 0V7Zm10 0a2 2 0 1 1 4 0v1a2 2 0 0 1-4 0V7Zm-5 6a2 2 0 1 1 4 0v4a6 6 0 0 1-4 0v-4Zm-4 2a2 2 0 1 1 4 0v2a6 6 0 0 1-4 0v-2Zm10 0a2 2 0 1 1 4 0v2a6 6 0 0 1-4 0v-2Z',
  candle:
    'M12 2v4m0 12v4M8 6l2 2m4-2-2 2M6 12H2m20 0h-4M7.8 7.8l-2.8-2.8m14 2.8 2.8-2.8M7.8 16.2l-2.8 2.8m14-2.8 2.8 2.8',
  fire: 'M12 2c1 3-2 6-2 9a4 4 0 1 0 8 0c0-3-3-6-2-9h-4Z',
  leaf: 'M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75',
};

const HOTEL_AMENITY_ICONS: Array<[string, string]> = [
  ['wi-fi', 'wifi'],
  ['wifi', 'wifi'],
  ['parking', 'car'],
  ['air condition', 'snow'],
  ['heating', 'snow'],
  ['minibar', 'coffee'],
  ['safe', 'lock'],
  ['tv', 'tv'],
  ['television', 'tv'],
  ['flat-screen', 'tv'],
  ['bathrobe', 'shower'],
  ['slipper', 'shower'],
  ['shower', 'shower'],
  ['spa', 'drop'],
  ['sauna', 'fire'],
  ['hammam', 'fire'],
  ['pool', 'sun'],
  ['swimming', 'sun'],
  ['restaurant', 'utensils'],
  ['bar', 'coffee'],
  ['breakfast', 'coffee'],
  ['coffee', 'coffee'],
  ['desk', 'sun'],
  ['terrace', 'sun'],
  ['luggage', 'lock'],
  ['concierge', 'headset'],
  ['front desk', 'headset'],
  ['24-hour', 'headset'],
  ['kids', 'kids'],
  ['child', 'kids'],
  ['pet', 'paw'],
  ['laundry', 'drop'],
  ['iron', 'drop'],
  ['shuttle', 'shuttle'],
  ['airport', 'shuttle'],
  ['gym', 'users'],
  ['fitness', 'users'],
  ['garden', 'leaf'],
  ['balcony', 'sun'],
  ['kettle', 'coffee'],
  ['bath', 'shower'],
  ['beach', 'sun'],
  ['view', 'sun'],
  ['sea', 'sun'],
  ['lake', 'sun'],
  ['mountain', 'sun'],
  ['golf', 'sun'],
];

const hotelAmenityIcon = (name: string) => {
  const k = HOTEL_AMENITY_ICONS.find(([re]) => name.toLowerCase().includes(re.toLowerCase()));
  return ICON[k ? k[1] : 'check'];
};

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function HotelDetail({
  hotelId,
  searchParams,
}: {
  hotelId: string;
  searchParams: SearchParams;
}) {
  const state = readStateFromURL(
    new URLSearchParams(
      Object.fromEntries(
        Object.entries(searchParams)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => [k, firstParam(v) ?? ''])
      )
    )
  );

  const [details, stay] = await Promise.all([
    getHotelDetails(hotelId),
    getStay(hotelId, {
      checkin: state.checkin,
      checkout: state.checkout,
      adults: state.adults,
      children: state.children,
      rooms: state.rooms,
    }),
  ]);
  if (!details || details.hotel.status !== 'active') notFound();
  const { hotel, experiences, restaurants, faqs, reviews } = details;

  const rooms =
    stay?.rooms ??
    (await getRoomTypes(hotelId)).map((room) => ({
      room,
      availability: 'available' as const,
      plans: [] as { price: number }[],
      fits: true,
    }));

  const image = hotel.media[0];
  const starText =
    hotel.starRating ? `${hotel.starRating} star${hotel.starRating === 1 ? '' : 's'}` : 'Hotel';

  return (
    <>
      <HeaderTheme theme="dark" />

      {/* hero */}
      <section data-hero className="relative h-[56vh] min-h-[340px] overflow-hidden sm:h-[64vh] sm:min-h-[420px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image?.url ?? ''}
          alt={image?.altText ?? `${hotel.name} — ${hotel.city ?? ''}`}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="from-navy-dark/85 via-navy-dark/30 to-navy-dark/20 absolute inset-0 bg-gradient-to-t"></div>
        <div className="relative z-10 mx-auto flex h-full max-w-7xl flex-col justify-end px-4 pb-12 sm:px-6 lg:px-8">
          <p className="eyebrow text-gold-light text-[11px] font-semibold tracking-[0.3em] uppercase">
            {hotel.brand ?? 'The collection'} · {hotel.city ?? ''} · {starText}
          </p>
          <h1 className="font-display mt-2 text-4xl font-semibold text-white lg:text-5xl">
            {hotel.name}
          </h1>
          <p className="mt-3 max-w-2xl text-white/80">{hotel.description}</p>
          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-white/85">
            {hotel.averageRating ? (
              <span className="inline-flex items-center gap-1.5">
                <Stars rating={hotel.averageRating} size="sm" />
                <strong>{hotel.averageRating.toFixed(1)}</strong>
              </span>
            ) : null}
            {hotel.addressLine1 ? (
              <>
                <span className="hidden opacity-40 sm:inline">|</span>
                <span>{hotel.addressLine1}</span>
              </>
            ) : null}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="pt-8">
          <Breadcrumb
            items={[
              { label: 'Home', href: '/' },
              { label: hotel.name, href: '/' },
              ...(firstParam(searchParams.roomid)
                ? [{ label: 'Room details' }]
                : []),
            ]}
          />
        </div>

        {/* ======================= SELECTED ROOM (?roomId=…) ======================= */}
        <Suspense fallback={null}>
          <HotelRoomGate hotelId={hotelId} hotelName={hotel.name} />
        </Suspense>

        {/* about */}
        <section className="py-12 lg:py-16">
          <p className="eyebrow text-gold-dark text-[11px] font-semibold tracking-[0.3em] uppercase">
            About
          </p>
          <h2 className="font-display text-navy mt-2 text-3xl font-semibold">
            {hotel.name}
          </h2>
          <p className="text-navy/70 mt-4 max-w-3xl leading-relaxed">{hotel.description}</p>
          <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-4">
            {[
              ['Check-in', hotel.checkInTime ?? '15:00'],
              ['Check-out', hotel.checkOutTime ?? '11:00'],
              ['Phone', hotel.phone ?? '—'],
              ['Email', hotel.email ?? '—'],
            ].map(([label, value]) => (
              <div key={label} className="border-navy/8 border-b pb-3">
                <dt className="text-navy/45 text-xs font-semibold tracking-widest uppercase">
                  {label}
                </dt>
                <dd className="text-navy mt-1 font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* rooms with live availability */}
        <section id="rooms" className="border-navy/10 border-t py-12 lg:py-16">
          <div className="flex items-end justify-between gap-6">
            <div>
              <p className="eyebrow text-gold-dark text-[11px] font-semibold tracking-[0.3em] uppercase">
                Stay
              </p>
              <h2 className="font-display text-navy mt-2 text-3xl font-semibold">
                Rooms &amp; suites
              </h2>
            </div>
            <Link
              href="/search"
              className="text-navy hover:text-gold-dark hidden items-center gap-2 text-sm font-semibold transition-colors sm:inline-flex"
            >
              Check availability →
            </Link>
          </div>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {rooms.map(({ room, availability, plans }) => {
              const price =
                plans.length > 0
                  ? Math.min(...plans.map((p) => p.price))
                  : room.pricePerNight;
              const roomHref = `/hotel?hotelid=${hotelId}&roomId=${room.id}`;
              return (
                <article
                  key={room.id}
                  className="group border-navy/10 hover:shadow-navy/10 flex flex-col overflow-hidden rounded-3xl border bg-white shadow-sm transition-shadow hover:shadow-2xl"
                >
                  <Link
                    href={roomHref}
                    scroll={false}
                    className="relative block aspect-[4/3] overflow-hidden"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={room.images[0] ?? ''}
                      alt={room.name}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <span className="absolute top-3 left-3">
                      <Badge variant={availability}>
                        {availability === 'available'
                          ? 'Available'
                          : availability === 'few'
                            ? 'Few rooms left'
                            : 'Sold out'}
                      </Badge>
                    </span>
                  </Link>
                  <div className="flex flex-1 flex-col gap-1.5 p-5">
                    <h3 className="font-display text-navy text-lg leading-snug font-semibold">
                      <Link
                        href={roomHref}
                        scroll={false}
                        className="hover:text-gold-dark transition-colors"
                      >
                        {room.name}
                      </Link>
                    </h3>
                    <p className="text-navy/55 text-xs">
                      {[room.bed, room.size, room.view].filter(Boolean).join(' · ')}
                      {room.capacity.adults
                        ? ` · up to ${room.capacity.adults} adults${room.capacity.children ? ` + ${room.capacity.children} child` : ''}`
                        : ''}
                    </p>
                    {room.description ? (
                      <p className="text-navy/70 mt-1 line-clamp-2 text-sm">{room.description}</p>
                    ) : null}
                    <div className="mt-auto flex items-center justify-between gap-3 pt-4">
                      <p className="text-navy/70 text-sm">
                        from{' '}
                        <strong className="font-display text-navy text-lg">
                          {formatPrice(price, room.currencyCode ?? hotel.defaultCurrency)}
                        </strong>
                        <span className="text-navy/45 text-xs"> /night</span>
                      </p>
                      <Link
                        href={roomHref}
                        scroll={false}
                        className="bg-navy hover:bg-navy-light shadow-navy/15 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold tracking-widest text-white uppercase shadow-lg transition-colors"
                      >
                        View room
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* amenities */}
        {hotel.amenities.length ? (
          <section id="amenities" className="border-navy/10 border-t py-12 lg:py-16">
            <p className="eyebrow text-gold-dark text-[11px] font-semibold tracking-[0.3em] uppercase">
              What this place offers
            </p>
            <h2 className="font-display text-navy mt-2 text-3xl font-semibold">
              Amenities &amp; services
            </h2>
            <div className="mt-8 grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
              {hotel.amenities.map((a) => (
                <div key={a.id} className="flex items-center gap-4">
                  <span className="bg-navy-dark text-gold-light flex h-12 w-12 shrink-0 items-center justify-center rounded-xl">
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path d={hotelAmenityIcon(a.name)} />
                    </svg>
                  </span>
                  <span className="text-navy text-[15px] font-medium">{a.name}</span>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* experiences */}
        {experiences.length ? (
          <section className="border-navy/10 border-t py-12 lg:py-16">
            <p className="eyebrow text-gold-dark text-[11px] font-semibold tracking-[0.3em] uppercase">
              Around town
            </p>
            <h2 className="font-display text-navy mt-2 text-3xl font-semibold">Experiences</h2>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {experiences.map((e) => (
                <div key={e.name} className="border-navy/10 rounded-3xl border bg-white p-6">
                  <h3 className="font-display text-navy text-lg font-semibold">{e.name}</h3>
                  <p className="text-navy/60 mt-1.5 text-sm">{e.desc}</p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* restaurants */}
        {restaurants.length ? (
          <section className="border-navy/10 border-t py-12 lg:py-16">
            <p className="eyebrow text-gold-dark text-[11px] font-semibold tracking-[0.3em] uppercase">
              Dining
            </p>
            <h2 className="font-display text-navy mt-2 text-3xl font-semibold">
              Restaurants &amp; bars
            </h2>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {restaurants.map((r) => (
                <div key={r.id} className="border-navy/10 rounded-3xl border bg-white p-6">
                  <h3 className="font-display text-navy text-lg font-semibold">{r.name}</h3>
                  {r.cuisineType ? (
                    <p className="text-gold-dark mt-1 text-[11px] font-semibold tracking-wider uppercase">
                      {r.cuisineType}
                    </p>
                  ) : null}
                  {r.description ? (
                    <p className="text-navy/60 mt-2.5 text-sm">{r.description}</p>
                  ) : null}
                  {r.openingHours || r.location ? (
                    <dl className="text-navy/50 mt-4 space-y-1.5 text-xs">
                      {r.openingHours ? (
                        <div className="flex justify-between gap-2">
                          <dt>Hours</dt>
                          <dd className="text-right">{r.openingHours}</dd>
                        </div>
                      ) : null}
                      {r.location ? (
                        <div className="flex justify-between gap-2">
                          <dt>Location</dt>
                          <dd className="text-right">{r.location}</dd>
                        </div>
                      ) : null}
                    </dl>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* FAQ */}
        {faqs.length ? (
          <section id="faq" className="border-navy/10 border-t py-12 lg:py-16">
            <p className="eyebrow text-gold-dark text-[11px] font-semibold tracking-[0.3em] uppercase">
              Good to know
            </p>
            <h2 className="font-display text-navy mt-2 text-3xl font-semibold">
              Frequently asked questions
            </h2>
            <dl className="mt-8 grid gap-x-8 gap-y-6 sm:grid-cols-2">
              {faqs.map((f) => (
                <div key={f.id}>
                  <dt className="text-navy font-medium">{f.question}</dt>
                  <dd className="text-navy/65 mt-1.5 text-sm">{f.answer}</dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}

        {/* reviews */}
        {reviews.length ? (
          <section className="bg-paper border-navy/10 border-y">
            <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
              <p className="eyebrow text-gold-dark text-[11px] font-semibold tracking-[0.3em] uppercase">
                Guest book
              </p>
              <h2 className="font-display text-navy mt-2 text-3xl font-semibold">
                In their words
              </h2>
              <div
                className="no-scrollbar snap-x-mandatory mt-8 flex gap-5 overflow-x-auto pb-2"
                role="region"
                aria-label="Guest reviews"
                tabIndex={0}
              >
                {reviews.map((rv) => (
                  <article
                    key={rv.title || rv.text}
                    className="snap-card border-navy/10 flex w-[85%] shrink-0 flex-col rounded-3xl border bg-white p-6 shadow-sm sm:w-[380px]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="bg-navy text-gold-light font-display flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold">
                          {(rv.author || 'G')
                            .split(' ')
                            .map((w) => w[0])
                            .slice(0, 2)
                            .join('')
                            .toUpperCase()}
                        </span>
                        <div>
                          <p className="text-navy text-sm font-semibold">{rv.author}</p>
                          <p className="text-navy/50 text-[11px]">Verified stay</p>
                        </div>
                      </div>
                      <Stars rating={rv.rating} size="sm" />
                    </div>
                    {rv.title ? (
                      <h3 className="font-display text-navy mt-4 font-semibold">{rv.title}</h3>
                    ) : null}
                    <p className="text-navy/65 mt-1.5 text-sm">{rv.text}</p>
                    <p className="text-navy/40 mt-auto pt-4 text-[11px]">
                      {formatDate(rv.date)}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {/* CTA */}
        <section className="bg-navy-dark my-12 rounded-3xl p-8 text-white sm:p-10">
          <div className="flex flex-col items-start gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="eyebrow text-gold-light text-[11px] font-semibold tracking-[0.3em] uppercase">
                Plan your stay
              </p>
              <h2 className="font-display mt-2 text-2xl font-semibold lg:text-3xl">
                Book {hotel.name}
              </h2>
              <p className="mt-2 text-sm text-white/70">
                Check live availability for your dates — the price is always quoted before you pay.
              </p>
            </div>
            <Link
              href="/search"
              className="bg-gold text-navy-dark hover:bg-gold-light inline-flex items-center justify-center gap-2 rounded-xl px-7 py-3.5 text-xs font-bold tracking-widest uppercase transition-colors"
            >
              Search availability
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}