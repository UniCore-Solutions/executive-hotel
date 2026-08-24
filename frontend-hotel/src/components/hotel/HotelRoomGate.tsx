'use client';

/* /hotel?roomId=… and /hotel?hotelid=…&roomId=… — the selected room's full details
   render inline on the hotel page (D-26), reusing RoomDetails. No roomId (or
   unknown id) renders nothing. With hotelId (backend mode) the room is resolved
   through the catalog gateway instead of the fixture. */

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { PROPERTY } from '@/data';
import RoomDetails from '@/components/room/RoomDetails';

export default function HotelRoomGate({ hotelId }: { hotelId?: string }) {
  const sp = useSearchParams();
  const roomId = sp.get('roomId') ?? '';
  if (!roomId) return null;

  const backend = Boolean(hotelId);
  if (!backend && !PROPERTY.rooms.some((r) => r.id === roomId)) return null;

  const plan = sp.get('plan') ?? '';
  const extras = sp.get('extras') ?? '';
  const hasGuestParams = ['adults', 'children', 'rooms'].some((k) => sp.get(k) !== null);

  return (
    <div className="mx-auto max-w-7xl px-4 pt-12 pb-4 sm:px-6 lg:px-8 lg:pt-16">
      <nav className="text-navy/45 text-xs" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-navy">
          Home
        </Link>{' '}
        <span className="mx-1">/</span>{' '}
        {backend ? (
          <>
            <Link href={`/hotel?hotelid=${hotelId}`} className="hover:text-navy">
              Hotel
            </Link>
          </>
        ) : (
          <Link href="/hotel" className="hover:text-navy">
            Hotel
          </Link>
        )}{' '}
        <span className="mx-1">/</span> <span className="text-navy/70">Room details</span>
      </nav>
      <Link
        href={backend ? `/hotel?hotelid=${hotelId}#rooms` : '/hotel#rooms'}
        className="text-navy hover:text-gold-dark mt-3 inline-flex items-center gap-1.5 text-sm font-semibold transition-colors"
      >
        <span aria-hidden="true">←</span> Back to all rooms
      </Link>
      <RoomDetails
        roomId={roomId}
        initialPlan={plan}
        initialExtras={extras}
        hasGuestParams={hasGuestParams}
        hotelId={hotelId}
      />
    </div>
  );
}