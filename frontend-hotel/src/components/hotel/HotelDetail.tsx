import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import HeaderTheme from '@/components/layout/HeaderTheme';
import HotelRoomGate from '@/components/hotel/HotelRoomGate';
import { Stars } from '@/components/ui/Stars';
import { Badge } from '@/components/ui/Badge';
import { readStateFromURL } from '@/lib/dates';
import { formatDate, formatPrice } from '@/lib/format';
import {
  getExperiences,
  getHotelById,
  getReviews,
  getRoomTypes,
  getStay,
} from '@/services/catalog';

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
  const hotel = await getHotelById(hotelId);
  if (!hotel || !('status' in hotel) || hotel.status !== 'active') notFound();

  const state = readStateFromURL(
    new URLSearchParams(
      Object.fromEntries(
        Object.entries(searchParams)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => [k, firstParam(v) ?? ''])
      )
    )
  );

  const [stay, experiences, reviews] = await Promise.all([
    getStay(hotelId, {
      checkin: state.checkin,
      checkout: state.checkout,
      adults: state.adults,
      children: state.children,
      rooms: state.rooms,
    }),
    getExperiences(hotelId),
    getReviews(hotelId),
  ]);

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
        <nav className="text-navy/45 pt-8 text-xs" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-navy">
            Home
          </Link>{' '}
          <span className="mx-1">/</span>{' '}
          <span className="text-navy/70">{hotel.name}</span>
        </nav>

        {/* ======================= SELECTED ROOM (?roomId=…) ======================= */}
        <Suspense fallback={null}>
          <HotelRoomGate hotelId={hotelId} />
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
          {hotel.amenities.length ? (
            <div className="mt-8 flex flex-wrap gap-2">
              {hotel.amenities.map((a) => (
                <span
                  key={a.id}
                  className="text-navy bg-paper border-navy/10 inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold"
                >
                  <span className="text-gold-dark">✦</span>
                  {a.name}
                </span>
              ))}
            </div>
          ) : null}
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
              return (
                <article
                  key={room.id}
                  className="group border-navy/10 hover:shadow-navy/10 flex flex-col overflow-hidden rounded-3xl border bg-white shadow-sm transition-shadow hover:shadow-2xl"
                >
                  <a
                    href={`/hotel?hotelid=${hotelId}&roomId=${room.id}`}
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
                  </a>
                  <div className="flex flex-1 flex-col gap-1.5 p-5">
                    <h3 className="font-display text-navy text-lg leading-snug font-semibold">
                      <a
                        href={`/hotel?hotelid=${hotelId}&roomId=${room.id}`}
                        className="hover:text-gold-dark transition-colors"
                      >
                        {room.name}
                      </a>
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
                      <a
                        href={`/hotel?hotelid=${hotelId}&roomId=${room.id}`}
                        className="bg-navy hover:bg-navy-light shadow-navy/15 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold tracking-widest text-white uppercase shadow-lg transition-colors"
                      >
                        View room
                      </a>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

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