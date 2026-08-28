'use client';

/* /hotel?hotelid=…&roomId=… — the selected room's full details render inline
   on the hotel page (D-26), reusing RoomDetails. The room is always resolved
   through the catalog gateway (single-hotel platform: /hotel without a
   hotelid redirects server-side to the canonical property). */

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
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
