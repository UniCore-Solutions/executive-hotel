import { redirect, notFound } from 'next/navigation';
import { RoomTypeByIdDocument } from '@/graphql/generated/graphql';
import { gqlRequest } from '@/services/graphqlClient';

/* Room state lives on the hotel page via query params (/hotel?roomId=… and
   /hotel?hotelid=…&roomId=…, D-26). This route is kept only so legacy/external links
   keep working — it redirects to the hotel page with the room selected.
   The owning hotel is resolved through the catalog gateway;
   unknown ids result in a 404. */

export default async function RoomPage({
  params,
  searchParams,
}: {
  params: Promise<{ roomId: string }>;
  searchParams: Promise<{ plan?: string | string[]; extras?: string | string[] }>;
}) {
  const { roomId } = await params;
  const sp = await searchParams;
  const q = new URLSearchParams({ roomId });
  if (typeof sp.plan === 'string' && sp.plan) q.set('plan', sp.plan);
  if (typeof sp.extras === 'string' && sp.extras) q.set('extras', sp.extras);

  let hotelId: string | null = null;
  try {
    const rt = (await gqlRequest(RoomTypeByIdDocument, { id: roomId })).roomType;
    if (rt && rt.status === 'active') hotelId = rt.hotelId;
  } catch {
    /* gateway unreachable — 404 */
  }
  if (hotelId) {
    q.set('roomId', roomId);
    redirect(`/hotel?hotelid=${hotelId}&${q.toString()}`);
  }
  notFound();
}