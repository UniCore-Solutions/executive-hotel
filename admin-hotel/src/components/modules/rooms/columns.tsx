import type { ColumnDef } from '@tanstack/react-table';
import { Pencil } from 'lucide-react';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/format';

export interface RoomRow {
  id: string;
  roomNumber: string;
  floor?: string | null;
  status: string;
  housekeepingStatus: string;
  maintenanceStatus: string;
  createdAt: string;
  roomTypeId: string;
  roomTypeName: string;
}

export function buildRoomColumns(onEdit: (row: RoomRow) => void): ColumnDef<RoomRow, unknown>[] {
  return [
    {
      id: 'roomNumber',
      header: 'Room',
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-ink">{row.original.roomNumber}</p>
          {row.original.floor ? <p className="text-xs text-muted-foreground">Floor {row.original.floor}</p> : null}
        </div>
      ),
    },
    {
      id: 'roomType',
      header: 'Room type',
      cell: ({ row }) => <span className="text-sm text-ink">{row.original.roomTypeName}</span>,
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge domain="room" value={row.original.status} />,
    },
    {
      id: 'housekeeping',
      header: 'Housekeeping',
      cell: ({ row }) => <StatusBadge domain="housekeeping" value={row.original.housekeepingStatus} />,
    },
    {
      id: 'maintenance',
      header: 'Maintenance',
      cell: ({ row }) => <StatusBadge domain="maintenance" value={row.original.maintenanceStatus} />,
    },
    {
      id: 'createdAt',
      header: 'Added',
      cell: ({ row }) => <span className="text-xs text-muted-foreground">{formatDate(row.original.createdAt)}</span>,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <Button
          size="iconSm"
          variant="ghost"
          aria-label={`Edit room ${row.original.roomNumber}`}
          onClick={(e) => {
            e.stopPropagation();
            onEdit(row.original);
          }}
        >
          <Pencil className="size-3.5" />
        </Button>
      ),
    },
  ];
}
