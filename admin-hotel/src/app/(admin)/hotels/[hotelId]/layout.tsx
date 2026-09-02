'use client';

import { use, useState, type ReactNode } from 'react';
import { useQuery } from '@apollo/client/react';
import { AdminHotelHeaderDocument } from '@/graphql/generated/graphql';
import { WorkspaceHeader } from '@/components/layout/WorkspaceHeader';
import { ErrorState } from '@/components/shared/ErrorState';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Resolves and validates the hotel named by the URL before rendering any
 * hotel-scoped page underneath it. The backend's hotelAccess check
 * (CurrentUserAccessor.requireHotelAccess) is the actual authorization
 * boundary — this layout only turns its failure into an honest screen
 * instead of a broken page, matching CLAUDE.md's "backend is the source of
 * truth" rule.
 */
export default function HotelWorkspaceLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ hotelId: string }>;
}) {
  const { hotelId } = use(params);
  const { data, loading, error, refetch } = useQuery(AdminHotelHeaderDocument, { variables: { hotelId } });
  const liveHotel = data?.adminHotel;
  // Buffered against `adminHotel` transiently disappearing from the cache
  // during a background refetch — every hotel-scoped REST write (room
  // types, rooms, rate plans…) evicts the `adminHotel` field to keep its
  // own page's query honest (api/invalidation.ts), and that eviction hits
  // THIS query too, since it reads the same root field. Gating on `loading`
  // alone unmounted `children` on every such write — confirmed with
  // Playwright: saving a rate plan's prices fully remounted the page
  // underneath this layout, throwing an open Tabs view back to its default
  // tab. Once we've resolved a real hotel, keep rendering it (and
  // `children`) through any later background refetch; never fall back to
  // the skeleton just because one is in flight.
  const [hotel, setHotel] = useState(liveHotel);
  // "Adjusting state during render" (react.dev's own pattern — not an
  // effect, which react-hooks flags as a cascading-render smell for a
  // plain setState). `prevHotelId` is tracked separately from the buffer
  // itself so a genuine navigation to a *different* hotelId (not just a
  // background refetch of the same one) still clears immediately —
  // otherwise switching from a valid workspace straight to an
  // invalid/inaccessible hotelId would keep showing the previous hotel's
  // data instead of the "doesn't exist" error below.
  const [prevHotelId, setPrevHotelId] = useState(hotelId);
  const [prevLiveHotel, setPrevLiveHotel] = useState(liveHotel);
  if (hotelId !== prevHotelId) {
    setPrevHotelId(hotelId);
    setPrevLiveHotel(liveHotel);
    setHotel(undefined);
  } else if (liveHotel !== prevLiveHotel) {
    setPrevLiveHotel(liveHotel);
    if (liveHotel) setHotel(liveHotel);
  }

  if (!hotel && loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-14 w-full max-w-md" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!hotel) {
    return (
      <ErrorState
        error={error ?? new Error("This hotel doesn't exist, or you don't have access to it.")}
        onRetry={() => void refetch()}
      />
    );
  }

  return (
    <>
      <WorkspaceHeader hotel={hotel} />
      {children}
    </>
  );
}
