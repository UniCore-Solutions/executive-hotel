'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useHotelScope } from '@/context/HotelScopeContext';

export function HotelSwitcher() {
  const { hotels, loading, activeHotelId, selectHotel } = useHotelScope();

  if (loading) return null;
  if (hotels.length === 0) return null;

  return (
    <Select value={activeHotelId ?? undefined} onValueChange={selectHotel}>
      <SelectTrigger className="w-56 bg-white" aria-label="Active hotel">
        <SelectValue placeholder="Select a hotel" />
      </SelectTrigger>
      <SelectContent>
        {hotels.map((hotel) => (
          <SelectItem key={hotel.id} value={hotel.id}>
            {hotel.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}