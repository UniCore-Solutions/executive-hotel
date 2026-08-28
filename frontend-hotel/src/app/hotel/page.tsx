import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import HotelDetail from '@/components/hotel/HotelDetail';
import { getHotelById, getCanonicalHotelId } from '@/services/catalog';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function firstParam(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
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
  return { title: 'Hotel' };
}

export default async function HotelPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const hotelId = firstParam(sp.hotelid);
  if (hotelId) {
    if (!UUID_RE.test(hotelId)) notFound();
    return <HotelDetail hotelId={hotelId} searchParams={sp} />;
  }
  // Single-hotel platform: /hotel without a hotelid resolves to the one
  // canonical property (query params preserved — old room deep links work).
  const canonicalId = await getCanonicalHotelId();
  const rest = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (k === 'hotelid') continue;
    if (Array.isArray(v)) v.forEach((x) => rest.append(k, x));
    else if (v !== undefined) rest.set(k, v);
  }
  const q = rest.toString();
  redirect(`/hotel?hotelid=${canonicalId}${q ? `&${q}` : ''}`);
}
