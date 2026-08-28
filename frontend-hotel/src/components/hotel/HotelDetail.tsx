import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import HeaderTheme from '@/components/layout/HeaderTheme';
import HotelRoomGate from '@/components/hotel/HotelRoomGate';
import Breadcrumb from '@/components/ui/Breadcrumb';
import { Stars } from '@/components/ui/Stars';
import { Badge } from '@/components/ui/Badge';
import { PhotoGallery } from '@/components/ui/PhotoGallery';
import { ReadMore } from '@/components/ui/ReadMore';
import { ShareButton } from '@/components/ui/ShareButton';
import { readStateFromURL } from '@/lib/dates';
import { formatDate, formatPrice } from '@/lib/format';
import { hotelRoomURL } from '@/lib/links';
import { getHotelDetails, getRoomTypes, getStay, type HotelDetailsResult } from '@/services/catalog';

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
  clock: 'M12 6v6l4 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  pin: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7Zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z',
};

/* Policy icon keys (admin-editable free text, see hotel_policies.icon) that
   don't share a name with an ICON key above. */
const POLICY_ICON_ALIAS: Record<string, string> = { child: 'kids' };

function policyIcon(icon: string | null | undefined) {
  const key = icon ? (POLICY_ICON_ALIAS[icon] ?? icon) : 'check';
  return ICON[key] ?? ICON.check;
}

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

/* Amenity.category (business/general/room/wellness — DB-backed) grouped under
   friendly labels, in a fixed reading order; anything uncategorized or with an
   unrecognized category falls back to "General" rather than being dropped. */
const AMENITY_CATEGORY_ORDER = ['general', 'room', 'wellness', 'business'];
const AMENITY_CATEGORY_LABELS: Record<string, string> = {
  general: 'General',
  room: 'In every room',
  wellness: 'Wellness & leisure',
  business: 'Business',
};

function groupAmenities(amenities: HotelDetailsResult['hotel']['amenities']) {
  const groups = new Map<string, typeof amenities>();
  for (const a of amenities) {
    const key = a.category ?? 'general';
    const bucket = groups.get(key);
    if (bucket) bucket.push(a);
    else groups.set(key, [a]);
  }
  const order = [
    ...AMENITY_CATEGORY_ORDER,
    ...[...groups.keys()].filter((k) => !AMENITY_CATEGORY_ORDER.includes(k)),
  ];
  return order
    .filter((k) => groups.has(k))
    .map((k) => ({ key: k, label: AMENITY_CATEGORY_LABELS[k] ?? k, items: groups.get(k)! }));
}

/* What a guest scans for first, in priority order — the rest are still all
   there under "View all amenities", just not fighting for first attention. */
const POPULAR_AMENITY_PRIORITY = [
  'wi-fi',
  'wifi',
  'pool',
  'swimming',
  'restaurant',
  'parking',
  'spa',
  'gym',
  'fitness',
  'air condition',
  'room service',
  'breakfast',
  'bar',
  'concierge',
  'front desk',
  'airport',
];

function popularAmenities(amenities: HotelDetailsResult['hotel']['amenities'], take = 8) {
  const ranked = [...amenities].sort((a, b) => {
    const ai = POPULAR_AMENITY_PRIORITY.findIndex((p) => a.name.toLowerCase().includes(p));
    const bi = POPULAR_AMENITY_PRIORITY.findIndex((p) => b.name.toLowerCase().includes(p));
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });
  return ranked.slice(0, take);
}

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

/* Section chrome shared by every content block below the fold — one eyebrow +
   heading treatment applied consistently instead of each section inventing
   its own. */
function SectionHeading({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-gold-dark text-[11px] font-semibold tracking-[0.3em] uppercase">
          {eyebrow}
        </p>
        <h2 className="font-display text-navy mt-2 text-[1.75rem] font-semibold sm:text-3xl">
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
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
  // A room is selected: RoomDetails (below, via HotelRoomGate) owns the page and
  // fetches its own stay/availability data — the hotel-level "Rooms & suites" grid
  // this would otherwise feed is hidden, so skip the fetch entirely rather than pay
  // for data nothing renders.
  const hasRoomId = Boolean(firstParam(searchParams.roomId));

  const [details, stay] = await Promise.all([
    getHotelDetails(hotelId),
    hasRoomId
      ? Promise.resolve(null)
      : getStay(hotelId, {
          checkin: state.checkin,
          checkout: state.checkout,
          adults: state.adults,
          children: state.children,
          rooms: state.rooms,
        }),
  ]);
  if (!details || details.hotel.status !== 'active') notFound();
  const { hotel, experiences, restaurants, faqs, policies, reviews, reviewsCount } = details;

  const rooms =
    stay ??
    (await getRoomTypes(hotelId)).map((room) => ({
      room,
      availability: 'available' as const,
      plans: [] as { price: number }[],
      fits: true,
    }));

  const starText =
    hotel.starRating ? `${hotel.starRating}-star hotel` : 'Hotel';
  const fullAddress = [hotel.addressLine1, hotel.addressLine2, hotel.city]
    .filter(Boolean)
    .join(', ');
  // Identity-level location: neighborhood + city, not the full street address
  // (that's the dedicated Location section further down) — gives immediate
  // "where is this" context without repeating the same string twice.
  const shortLocation =
    [hotel.addressLine2, hotel.city].filter(Boolean).join(', ') || hotel.city || fullAddress;
  const hasStayInfo = Boolean(hotel.checkInTime || hotel.checkOutTime);
  const hasContactInfo = Boolean(hotel.phone || hotel.email);
  const galleryPhotos = hotel.media.map((m) => ({
    url: m.url,
    alt: m.altText ?? `${hotel.name} — ${hotel.city ?? ''}`,
  }));
  const popular = popularAmenities(hotel.amenities);

  // No map embed/tile widget: this app has no maps API key configured and public
  // keyless map-image services proved unreliable in testing — a broken image box
  // would be worse than no visual at all here. The "Open in Maps" link below is
  // a real, working action (opens OpenStreetMap centered on the hotel), so that
  // becomes the section's visual anchor instead of a decorative preview.
  const hasCoords = hotel.latitude != null && hotel.longitude != null;
  const mapViewUrl = hasCoords
    ? `https://www.openstreetmap.org/?mlat=${hotel.latitude}&mlon=${hotel.longitude}#map=16/${hotel.latitude}/${hotel.longitude}`
    : '';

  return (
    <>
      {/* Solid header (light theme): the gallery below starts under the fixed
          header (pt-28 offsets its height) and reads as one self-contained
          section — the navigation never overlaps the photos. */}
      <HeaderTheme theme="light" />

      {/* gallery + identity are the HOTEL experience: when a room is selected
          the room view owns the top of the page (RoomDetails renders its own
          header + breadcrumb), so none of this hotel-level chrome is shown. */}
      {!hasRoomId ? (
        <>
          {/* gallery — the page's first section, below the header */}
          <div className="mx-auto max-w-7xl px-4 pt-28 sm:px-6 lg:px-8">
            <PhotoGallery photos={galleryPhotos} />
          </div>

          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="pt-5">
              <Breadcrumb
                items={[
                  { label: 'Home', href: '/' },
                  { label: hotel.name, href: '/' },
                ]}
              />
            </div>

            {/* identity — name dominant; a short neighborhood/city location sits
                right under it (its own line, per booking-platform convention),
                with rating/category as secondary, scannable metadata below that.
                The full street address lives only in the Location section further
                down, so this never repeats it verbatim. */}
            <div className="border-navy/10 mt-4 flex flex-col gap-5 border-b pb-8 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h1 className="font-display text-navy text-3xl font-semibold sm:text-4xl lg:text-[2.75rem]">
                  {hotel.name}
                </h1>
                {shortLocation ? (
                  <p className="text-navy/65 mt-2 flex items-center gap-1.5 text-sm">
                    <svg
                      className="text-gold-dark h-4 w-4 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d={ICON.pin} />
                    </svg>
                    {shortLocation}
                  </p>
                ) : null}
                <div className="text-navy/70 mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                  {hotel.averageRating ? (
                    <span className="inline-flex items-center gap-2">
                      <Stars rating={hotel.averageRating} size="sm" />
                      <strong className="text-navy font-semibold">
                        {hotel.averageRating.toFixed(1)}
                      </strong>
                      <span className="text-navy/50">
                        ({reviewsCount} review{reviewsCount === 1 ? '' : 's'})
                      </span>
                    </span>
                  ) : null}
                  {hotel.averageRating ? <span className="text-navy/30" aria-hidden="true">·</span> : null}
                  <span>
                    {hotel.brand ?? 'The collection'} · {starText}
                  </span>
                </div>
              </div>
              <ShareButton className="border-navy/12 shrink-0 self-start border" />
            </div>
          </div>
        </>
      ) : null}

      {/* ======================= SELECTED ROOM (?roomId=…) ======================= */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Suspense fallback={null}>
          <HotelRoomGate hotelId={hotelId} hotelName={hotel.name} />
        </Suspense>
      </div>

      {!hasRoomId && (
        <>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {/* about — description is the section's own visual weight; stay
                info and contact are practical, secondary facts placed
                alongside it on desktop (mirroring the room page's "room
                details / good to know" split), stacked below it on mobile.
                No card, no background box — typography and one divider carry
                the hierarchy, and either half disappears entirely if the
                hotel has nothing real to show there. */}
            {hotel.description || hasStayInfo || hasContactInfo ? (
              <section className="py-12 lg:py-14">
                <SectionHeading eyebrow="Overview" title="About this hotel" />
                <div
                  className={
                    hotel.description && (hasStayInfo || hasContactInfo)
                      ? 'mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-14'
                      : 'mt-8'
                  }
                >
                  {hotel.description ? (
                    <ReadMore
                      text={hotel.description}
                      lines={5}
                      className="text-navy/70 max-w-2xl text-[15px] leading-relaxed"
                    />
                  ) : null}
                  {hasStayInfo || hasContactInfo ? (
                    <div
                      className={
                        hotel.description
                          ? 'border-navy/10 space-y-8 lg:border-l lg:pl-10'
                          : 'flex flex-col gap-8 sm:flex-row sm:gap-14'
                      }
                    >
                      {hasStayInfo ? (
                        <div>
                          <h3 className="text-navy/45 text-xs font-semibold tracking-widest uppercase">
                            Stay information
                          </h3>
                          <div className="mt-4 grid grid-cols-2 gap-4">
                            {hotel.checkInTime ? (
                              <div>
                                <dt className="text-navy/45 text-[11px] font-semibold tracking-wide uppercase">
                                  Check-in
                                </dt>
                                <dd className="text-navy mt-1 text-sm font-semibold">
                                  From {hotel.checkInTime}
                                </dd>
                              </div>
                            ) : null}
                            {hotel.checkOutTime ? (
                              <div>
                                <dt className="text-navy/45 text-[11px] font-semibold tracking-wide uppercase">
                                  Check-out
                                </dt>
                                <dd className="text-navy mt-1 text-sm font-semibold">
                                  Until {hotel.checkOutTime}
                                </dd>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ) : null}
                      {hasContactInfo ? (
                        <div>
                          <h3 className="text-navy/45 text-xs font-semibold tracking-widest uppercase">
                            Contact
                          </h3>
                          <div className="mt-4 space-y-3">
                            {hotel.phone ? (
                              <a
                                href={`tel:${hotel.phone.replace(/[\s()-]/g, '')}`}
                                className="group focus-visible:ring-gold/50 flex items-center gap-3 rounded-lg py-1 outline-none focus-visible:ring-2"
                              >
                                <span className="bg-gold/12 text-gold-dark flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
                                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d={ICON.headset} />
                                  </svg>
                                </span>
                                <span>
                                  <span className="text-navy/45 block text-[11px] font-semibold tracking-wide uppercase">
                                    Phone
                                  </span>
                                  <span className="text-navy group-hover:text-gold-dark block text-sm font-semibold transition-colors">
                                    {hotel.phone}
                                  </span>
                                </span>
                              </a>
                            ) : null}
                            {hotel.email ? (
                              <a
                                href={`mailto:${hotel.email}`}
                                className="group focus-visible:ring-gold/50 flex items-center gap-3 rounded-lg py-1 outline-none focus-visible:ring-2"
                              >
                                <span className="bg-gold/12 text-gold-dark flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
                                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4 6h16v12H4V6Zm0 0 8 7 8-7" />
                                  </svg>
                                </span>
                                <span className="min-w-0">
                                  <span className="text-navy/45 block text-[11px] font-semibold tracking-wide uppercase">
                                    Email
                                  </span>
                                  <span className="text-navy group-hover:text-gold-dark block truncate text-sm font-semibold transition-colors">
                                    {hotel.email}
                                  </span>
                                </span>
                              </a>
                            ) : null}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </section>
            ) : null}

            {/* amenities */}
            {hotel.amenities.length ? (
              <section id="amenities" className="border-navy/10 border-t py-12 lg:py-14">
                <SectionHeading eyebrow="What this place offers" title="Amenities & services" />
                <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-4">
                  {popular.map((a) => (
                    <div key={a.id} className="flex items-center gap-3">
                      <span className="bg-navy-dark text-gold-light flex h-11 w-11 shrink-0 items-center justify-center rounded-full">
                        <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d={hotelAmenityIcon(a.name)} />
                        </svg>
                      </span>
                      <span className="text-navy text-sm leading-snug font-medium">{a.name}</span>
                    </div>
                  ))}
                </div>
                {hotel.amenities.length > popular.length ? (
                  <details className="group mt-8">
                    <summary className="text-navy border-navy/15 hover:border-navy/30 inline-flex cursor-pointer list-none items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-bold tracking-widest uppercase transition-colors [&::-webkit-details-marker]:hidden">
                      View all {hotel.amenities.length} amenities
                      <svg
                        className="h-3.5 w-3.5 transition-transform group-open:rotate-180"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m6 9 6 6 6-6" />
                      </svg>
                    </summary>
                    <div className="mt-8 space-y-9">
                      {groupAmenities(hotel.amenities).map((group) => (
                        <div key={group.key}>
                          <h3 className="text-navy/45 text-xs font-semibold tracking-widest uppercase">
                            {group.label}
                          </h3>
                          <div className="mt-4 grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
                            {group.items.map((a) => (
                              <div key={a.id} className="flex items-center gap-4">
                                <span className="bg-navy-dark text-gold-light flex h-11 w-11 shrink-0 items-center justify-center rounded-full">
                                  <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d={hotelAmenityIcon(a.name)} />
                                  </svg>
                                </span>
                                <span className="text-navy text-[15px] font-medium">{a.name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </details>
                ) : null}
              </section>
            ) : null}

            {/* rooms with live availability */}
            <section id="rooms" className="border-navy/10 border-t py-12 lg:py-14">
              <SectionHeading
                eyebrow="Stay"
                title="Rooms & suites"
                action={
                  <Link
                    href="/search"
                    className="text-navy hover:text-gold-dark hidden items-center gap-2 text-sm font-semibold transition-colors sm:inline-flex"
                  >
                    Check availability →
                  </Link>
                }
              />
              <p className="text-navy/55 mt-3 text-sm">
                Prices shown are per night, from — open a room to see the exact total for your
                dates, taxes &amp; fees included.
              </p>
              <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {rooms.map(({ room, availability, plans }) => {
                  const price =
                    plans.length > 0
                      ? Math.min(...plans.map((p) => p.price))
                      : room.pricePerNight;
                  // The stay state rides along so the guest never loses their
                  // chosen dates when they open a room (matches search cards).
                  const roomHref = hotelRoomURL(state, hotelId, room.id);
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
                            {/* Per-night rate straight from the backend — the
                                authoritative total for the stay comes from the
                                quote engine on the room page, never a local
                                price × nights multiplication. */}
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

            {/* location */}
            {fullAddress ? (
              <section className="border-navy/10 border-t py-12 lg:py-14">
                <SectionHeading eyebrow="Find us" title="Location" />
                <div className="border-navy/10 bg-paper mt-8 flex flex-col items-start gap-5 rounded-2xl border p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
                  <div className="flex items-start gap-4">
                    <span className="bg-navy-dark text-gold-light flex h-12 w-12 shrink-0 items-center justify-center rounded-full">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d={ICON.pin} />
                      </svg>
                    </span>
                    <div>
                      <p className="text-navy text-base font-medium">{fullAddress}</p>
                      <p className="text-navy/55 mt-1 text-sm">
                        {hotel.brand ?? 'The collection'} · {hotel.city ?? ''}
                      </p>
                    </div>
                  </div>
                  {hasCoords ? (
                    <a
                      href={mapViewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-navy hover:bg-navy-light shadow-navy/15 focus-visible:ring-gold/50 inline-flex shrink-0 items-center gap-2 self-stretch rounded-xl px-5 py-3 text-xs font-bold tracking-widest text-white uppercase shadow-lg outline-none transition-colors focus-visible:ring-2 sm:self-auto"
                    >
                      Get directions
                      <span className="sr-only"> (opens in a new tab)</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 17 17 7M8 7h9v9" />
                      </svg>
                    </a>
                  ) : null}
                </div>
              </section>
            ) : null}

            {/* experiences */}
            {experiences.length ? (
              <section className="border-navy/10 border-t py-12 lg:py-14">
                <SectionHeading eyebrow="Around town" title="Experiences" />
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
              <section className="border-navy/10 border-t py-12 lg:py-14">
                <SectionHeading eyebrow="Dining" title="Restaurants & bars" />
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

            {/* policies — expandable rows, not a card grid */}
            {policies.length ? (
              <section className="border-navy/10 border-t py-12 lg:py-14">
                <SectionHeading eyebrow="House rules" title="Policies" />
                <div className="border-navy/10 mt-8 divide-y rounded-2xl border">
                  {policies.map((p) => (
                    <details key={p.id} className="group px-5 py-4 first:rounded-t-2xl last:rounded-b-2xl open:bg-paper/60">
                      <summary className="flex cursor-pointer list-none items-center gap-4 [&::-webkit-details-marker]:hidden">
                        <span className="bg-gold/12 text-gold-dark flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
                          <svg className="h-[17px] w-[17px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d={policyIcon(p.icon)} />
                          </svg>
                        </span>
                        <span className="text-navy flex-1 text-sm font-semibold">{p.name}</span>
                        <svg
                          className="text-navy/40 h-4 w-4 shrink-0 transition-transform group-open:rotate-180"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m6 9 6 6 6-6" />
                        </svg>
                      </summary>
                      <p className="text-navy/65 mt-3 pl-[52px] text-sm leading-relaxed">{p.value}</p>
                    </details>
                  ))}
                </div>
              </section>
            ) : null}

            {/* FAQ — same expandable-row pattern as Policies, for one consistent
                disclosure idiom across the page */}
            {faqs.length ? (
              <section id="faq" className="border-navy/10 border-t py-12 lg:py-14">
                <SectionHeading eyebrow="Good to know" title="Frequently asked questions" />
                <div className="border-navy/10 mt-8 divide-y rounded-2xl border">
                  {faqs.map((f) => (
                    <details key={f.id} className="group px-5 py-4 first:rounded-t-2xl last:rounded-b-2xl open:bg-paper/60">
                      <summary className="text-navy flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold [&::-webkit-details-marker]:hidden">
                        {f.question}
                        <svg
                          className="text-navy/40 h-4 w-4 shrink-0 transition-transform group-open:rotate-180"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m6 9 6 6 6-6" />
                        </svg>
                      </summary>
                      <p className="text-navy/65 mt-3 text-sm leading-relaxed">{f.answer}</p>
                    </details>
                  ))}
                </div>
              </section>
            ) : null}

            {/* reviews */}
            {reviews.length ? (
              <section className="border-navy/10 -mx-4 border-t px-4 py-12 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 lg:py-14">
                <SectionHeading eyebrow="Guest book" title="In their words" />
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
                      <p className="text-navy/40 mt-auto pt-4 text-[11px]">{formatDate(rv.date)}</p>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        </>
      )}
    </>
  );
}
