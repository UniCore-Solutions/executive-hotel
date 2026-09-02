import type { RoomRow } from '@/components/modules/rooms/columns';

/** Shared by every rooms table (the merged Room Types page's "All rooms" tab
    and a single room type's own Rooms tab) so the sort vocabulary and
    comparison logic don't drift between the two. */
export const ROOM_SORT_OPTIONS: { value: string; label: string }[] = [
  { value: 'roomNumber-asc', label: 'Room number (A–Z)' },
  { value: 'roomNumber-desc', label: 'Room number (Z–A)' },
  { value: 'roomType-asc', label: 'Room type (A–Z)' },
  { value: 'status-asc', label: 'Status (A–Z)' },
  { value: 'createdAt-desc', label: 'Newest first' },
  { value: 'createdAt-asc', label: 'Oldest first' },
];

export function compareRooms(a: RoomRow, b: RoomRow, field: string): number {
  switch (field) {
    case 'roomType':
      return a.roomTypeName.localeCompare(b.roomTypeName);
    case 'status':
      return a.status.localeCompare(b.status);
    case 'createdAt':
      return a.createdAt.localeCompare(b.createdAt);
    case 'roomNumber':
    default:
      return a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true });
  }
}
