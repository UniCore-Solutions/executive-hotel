'use client';

/* /hotel?roomId=… and /hotel?hotelid=…&roomId=… — the selected room's full details
   render inline on the hotel page (D-26), reusing RoomDetails. No roomId (or
   unknown id) renders nothing. With hotelId (backend mode) the room is resolved
   through the catalog gateway instead of the fixture. */

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { PROPERTY } from '@/data';
import RoomDetails from '@/components/room/RoomDetails';

export default function HotelRoomGate({
  hotelId,
  hotelName,
}: {
  hotelId?: string;
  hotelName?: string;
}) {
  const sp = useSearchParams();
  const roomId = sp.get('roomId') ?? '';

  useEffect(() => {
    if (!roomId) return;
    const el = document.getElementById('room-detail');
    if (el) {
      setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
  }, [roomId]);

  if (!roomId) return null;

  const backend = Boolean(hotelId);
  if (!backend && !PROPERTY.rooms.some((r) => r.id === roomId)) return null;

  const plan = sp.get('plan') ?? '';
  const extras = sp.get('extras') ?? '';
  const hasGuestParams = ['adults', 'children', 'rooms'].some((k) => sp.get(k) !== null);

  return (
    <div id="room-detail">
      <RoomDetails
        roomId={roomId}
        initialPlan={plan}
        initialExtras={extras}
        hasGuestParams={hasGuestParams}
        hotelId={hotelId}
        hotelName={hotelName}
      />
    </div>
  );
}
