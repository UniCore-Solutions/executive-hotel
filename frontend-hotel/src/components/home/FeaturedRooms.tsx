/* Homepage "featured rooms" section — curated room types from the backend.
   Cards link to the owning hotel page with the room selected. */
import { formatPrice } from '@/lib/format';
import type { HomepageRoomType } from '@/services/homepage';

export default function FeaturedRooms({ roomTypes }: { roomTypes: HomepageRoomType[] }) {
  return (
    <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {roomTypes.map((room) => {
        const image = room.media[0];
        const href = `/hotel?hotelid=${room.hotelId}&roomId=${room.id}`;
        return (
          <article
            key={room.id}
            className="group border-navy/10 hover:shadow-navy/10 flex flex-col overflow-hidden rounded-3xl border bg-white shadow-sm transition-shadow hover:shadow-2xl"
          >
            <a href={href} className="relative block aspect-[4/3] overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image?.url ?? ''}
                alt={image?.altText ?? room.name}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </a>
            <div className="flex flex-1 flex-col gap-1.5 p-5">
              <h3 className="font-display text-navy text-lg leading-snug font-semibold">
                <a href={href} className="hover:text-gold-dark transition-colors">
                  {room.name}
                </a>
              </h3>
              <p className="text-navy/55 text-xs">
                {room.hotelName}
                {room.viewType ? ` · ${room.viewType}` : ''}
              </p>
              <p className="text-navy/55 text-xs">
                {[room.bedConfiguration, room.sizeSqm ? `${room.sizeSqm} m²` : '']
                  .filter(Boolean)
                  .join(' · ')}
                {room.maxAdults ? ` · up to ${room.maxAdults} adults` : ''}
                {room.maxChildren ? ` + ${room.maxChildren} child` : ''}
              </p>
              {room.description ? (
                <p className="text-navy/70 mt-1 line-clamp-2 text-sm">{room.description}</p>
              ) : null}
              <div className="mt-auto flex items-center justify-between gap-3 pt-4">
                {room.pricePerNight ? (
                  <p className="text-navy/70 text-sm">
                    from{' '}
                    <strong className="font-display text-navy text-lg">
                      {formatPrice(room.pricePerNight, room.currencyCode)}
                    </strong>
                    <span className="text-navy/45 text-xs"> /night</span>
                  </p>
                ) : (
                  <span />
                )}
                <a
                  href={href}
                  className="text-navy hover:text-gold-dark inline-flex items-center gap-1.5 text-xs font-bold tracking-widest uppercase transition-colors"
                >
                  View room →
                </a>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}