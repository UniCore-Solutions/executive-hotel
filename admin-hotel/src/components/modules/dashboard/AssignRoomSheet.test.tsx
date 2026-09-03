import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AssignRoomSheet } from './AssignRoomSheet';
import type { EligibleRoom } from '@/api/rest/endpoints/reservations';

const toast = vi.fn();
const invalidateGraphql = vi.fn();
const eligibleRooms = vi.fn();
const assignRoom = vi.fn();

vi.mock('@/api/apollo/provider', () => ({ useApollo: () => ({}) }));
vi.mock('@/context/ToastContext', () => ({ useToast: () => ({ toast }) }));
vi.mock('@/api/invalidation', () => ({ invalidateGraphql: (...args: unknown[]) => invalidateGraphql(...args) }));
vi.mock('@/api/rest/endpoints/reservations', () => ({
  eligibleRooms: (...args: unknown[]) => eligibleRooms(...args),
  assignRoom: (...args: unknown[]) => assignRoom(...args),
}));

const BASE_PROPS = {
  reservationId: 'res-1',
  roomLineId: 'line-1',
  roomTypeId: 'rt-1',
  roomTypeName: 'Deluxe Sea View',
  checkInDate: '2026-09-10',
  checkOutDate: '2026-09-12',
  open: true,
  onOpenChange: vi.fn(),
  onAssigned: vi.fn(),
};

function renderSheet(props: Partial<React.ComponentProps<typeof AssignRoomSheet>> = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <AssignRoomSheet {...BASE_PROPS} {...props} />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  toast.mockClear();
  invalidateGraphql.mockClear();
  eligibleRooms.mockReset();
  assignRoom.mockReset();
});

describe('AssignRoomSheet — loading and empty states', () => {
  it('shows an error message when the eligible-rooms fetch fails, and disables Assign', async () => {
    eligibleRooms.mockRejectedValue(new Error('network down'));
    renderSheet();
    expect(await screen.findByText('Could not load eligible rooms.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Assign room' })).toBeDisabled();
  });

  it('shows "no rooms free" and disables Assign when the eligible list is empty and no room is currently assigned', async () => {
    eligibleRooms.mockResolvedValue([]);
    renderSheet();
    expect(await screen.findByText('No rooms of this type are free for these dates.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Assign room' })).toBeDisabled();
  });

  it('does not fetch at all while the sheet is closed', () => {
    renderSheet({ open: false });
    expect(eligibleRooms).not.toHaveBeenCalled();
  });
});

describe('AssignRoomSheet — currently-assigned room merge logic', () => {
  it('does not duplicate the current room when it is already in the eligible list', async () => {
    const rooms: EligibleRoom[] = [{ id: 'room-9', roomNumber: '204', floor: '2' }];
    eligibleRooms.mockResolvedValue(rooms);
    renderSheet({ currentRoomId: 'room-9', currentRoomNumber: '204' });
    await screen.findByRole('combobox');
    const options = screen.getAllByRole('option', { hidden: true });
    const matchingCurrent = options.filter((o) => o.textContent?.includes('204'));
    expect(matchingCurrent).toHaveLength(1);
    expect(matchingCurrent[0]?.textContent).not.toContain('currently assigned');
  });

  it('prepends the current room labeled "(currently assigned)" when it is not in the eligible list (e.g. now inactive)', async () => {
    const rooms: EligibleRoom[] = [{ id: 'room-5', roomNumber: '101', floor: null }];
    eligibleRooms.mockResolvedValue(rooms);
    renderSheet({ currentRoomId: 'room-9', currentRoomNumber: '204' });
    const options = await screen.findAllByRole('option', { hidden: true });
    expect(options[0]?.textContent).toContain('Room 204 (currently assigned)');
    expect(options.some((o) => o.textContent?.includes('Room 101'))).toBe(true);
  });

  it('renders the floor in the label only when the room has one', async () => {
    eligibleRooms.mockResolvedValue([
      { id: 'room-1', roomNumber: '101', floor: '1' },
      { id: 'room-2', roomNumber: '102', floor: null },
    ] satisfies EligibleRoom[]);
    renderSheet();
    const options = await screen.findAllByRole('option', { hidden: true });
    expect(options.find((o) => o.textContent?.includes('101'))?.textContent).toBe('Room 101 · Floor 1');
    expect(options.find((o) => o.textContent?.includes('102'))?.textContent).toBe('Room 102');
  });
});

describe('AssignRoomSheet — submit', () => {
  it('assigns the selected room and calls onAssigned on success', async () => {
    eligibleRooms.mockResolvedValue([{ id: 'room-9', roomNumber: '204', floor: null }] satisfies EligibleRoom[]);
    assignRoom.mockResolvedValue(undefined);
    const onAssigned = vi.fn();
    const onOpenChange = vi.fn();
    renderSheet({ onAssigned, onOpenChange });

    await userEvent.click(await screen.findByRole('combobox'));
    await userEvent.click(await screen.findByRole('option', { name: /204/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Assign room' }));

    expect(assignRoom).toHaveBeenCalledWith('res-1', 'line-1', 'room-9');
    expect(onAssigned).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
