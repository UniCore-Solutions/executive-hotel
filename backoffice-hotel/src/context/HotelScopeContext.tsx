'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { proxyRequest } from '@/lib/api';
import { AdminHotelsDocument } from '@/graphql/generated/graphql';
import { useSession } from '@/context/SessionContext';

const STORAGE_KEY = 'bo_active_hotel';

interface HotelScope {
  hotels: { id: string; name: string }[];
  loading: boolean;
  activeHotelId: string | null;
  selectHotel: (id: string) => void;
}

const HotelScopeContext = createContext<HotelScope | null>(null);

export function HotelScopeProvider({ children }: { children: ReactNode }) {
  const { me } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlHotel = searchParams.get('hotel');

  const { data, isLoading } = useQuery({
    queryKey: ['hotelScope'],
    queryFn: () =>
      proxyRequest(AdminHotelsDocument, { page: { page: 0, size: 100 } }).then(
        (d) => d.adminHotels.items,
      ),
    enabled: !!me,
  });

  const [localHotel, setLocalHotel] = useState<string | null>(
    () => (typeof window === 'undefined' ? null : window.localStorage.getItem(STORAGE_KEY)),
  );

  const activeHotelId = useMemo(() => {
    if (urlHotel) return urlHotel;
    if (localHotel) return localHotel;
    const first = me?.hotelIds?.[0] ?? null;
    if (first && data?.some((h) => h.id === first)) return first;
    return data?.[0]?.id ?? null;
  }, [urlHotel, localHotel, me, data]);

  const selectHotel = useCallback(
    (id: string) => {
      window.localStorage.setItem(STORAGE_KEY, id);
      setLocalHotel(id);
      const params = new URLSearchParams(searchParams.toString());
      params.set('hotel', id);
      router.replace(`?${params.toString()}`);
    },
    [router, searchParams],
  );

  const value = useMemo(
    () => ({
      hotels: data ?? [],
      loading: isLoading,
      activeHotelId,
      selectHotel,
    }),
    [data, isLoading, activeHotelId, selectHotel],
  );

  return <HotelScopeContext.Provider value={value}>{children}</HotelScopeContext.Provider>;
}

export function useHotelScope(): HotelScope {
  const ctx = useContext(HotelScopeContext);
  if (!ctx) throw new Error('useHotelScope must be used within HotelScopeProvider');
  return ctx;
}