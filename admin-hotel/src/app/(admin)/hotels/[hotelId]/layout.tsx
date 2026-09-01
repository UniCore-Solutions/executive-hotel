'use client';

import { use, type ReactNode } from 'react';
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
  const hotel = data?.adminHotel;

  if (loading) {
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
