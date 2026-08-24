/* Homepage "featured hotels" section — curated hotels from the backend. */
import { Stars } from '@/components/ui/Stars';
import { formatPrice } from '@/lib/format';
import type { HomepageHotel } from '@/services/homepage';

export default function FeaturedHotels({ hotels }: { hotels: HomepageHotel[] }) {
  return (
    <section
      id="hotels"
      className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24"
      aria-labelledby="hotels-title"
    >
      <div className="flex items-end justify-between gap-6">
        <div>
          <p className="eyebrow text-gold-dark text-[11px] font-semibold tracking-[0.3em] uppercase">
            The collection
          </p>
          <h2
            id="hotels-title"
            className="font-display text-navy mt-2 text-3xl font-semibold lg:text-4xl"
          >
            Stay somewhere new
          </h2>
        </div>
        <span className="text-navy/45 hidden text-sm sm:block">
          {hotels.length} {hotels.length === 1 ? 'destination' : 'destinations'}
        </span>
      </div>
      <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {hotels.map((hotel) => {
          const image = hotel.media[0];
          return (
            <article
              key={hotel.id}
              className="group border-navy/10 hover:shadow-navy/10 flex flex-col overflow-hidden rounded-3xl border bg-white shadow-sm transition-shadow hover:shadow-2xl"
            >
              <a href={`/hotel?hotelid=${hotel.id}`} className="relative block aspect-[4/3] overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image?.url ?? ''}
                  alt={image?.altText ?? `${hotel.name} — ${hotel.city}`}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <span className="bg-navy-dark/70 absolute bottom-3 left-3 rounded-full px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
                  {hotel.starRating ? `${hotel.starRating}★` : hotel.hotelType}
                </span>
              </a>
              <div className="flex flex-1 flex-col gap-1.5 p-5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-display text-navy text-lg leading-snug font-semibold">
                    <a href={`/hotel?hotelid=${hotel.id}`} className="hover:text-gold-dark transition-colors">
                      {hotel.name}
                    </a>
                  </h3>
                  {hotel.averageRating ? (
                    <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-emerald-700">
                      <Stars rating={hotel.averageRating} size="sm" />
                      {hotel.averageRating.toFixed(1)}
                    </span>
                  ) : null}
                </div>
                <p className="text-navy/55 text-xs">
                  {hotel.city}
                  {hotel.countryCode ? `, ${hotel.countryCode}` : ''}
                </p>
                {hotel.description ? (
                  <p className="text-navy/70 mt-1 line-clamp-2 text-sm">{hotel.description}</p>
                ) : null}
                <div className="mt-auto flex items-center justify-between gap-3 pt-4">
                  {hotel.fromPricePerNight ? (
                    <p className="text-navy/70 text-sm">
                      from{' '}
                      <strong className="font-display text-navy text-lg">
                        {formatPrice(hotel.fromPricePerNight, hotel.defaultCurrency)}
                      </strong>
                      <span className="text-navy/45 text-xs"> /night</span>
                    </p>
                  ) : (
                    <span />
                  )}
                  <a
                    href={`/hotel?hotelid=${hotel.id}`}
                    className="text-navy hover:text-gold-dark inline-flex items-center gap-1.5 text-xs font-bold tracking-widest uppercase transition-colors"
                  >
                    View hotel →
                  </a>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}