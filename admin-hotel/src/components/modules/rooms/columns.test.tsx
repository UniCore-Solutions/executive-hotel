import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { buildRoomColumns, type RoomRow } from './columns';

function cellFor(columns: ReturnType<typeof buildRoomColumns>, id: string, original: RoomRow) {
  const col = columns.find((c) => c.id === id)!;
  const render_ = col.cell as (ctx: { row: { original: RoomRow } }) => React.ReactNode;
  return render_({ row: { original } });
}

function room(overrides: Partial<RoomRow>): RoomRow {
  return {
    id: 'r1',
    roomNumber: '204',
    floor: null,
    status: 'active',
    housekeepingStatus: 'clean',
    maintenanceStatus: 'ok',
    createdAt: '2026-01-01T00:00:00Z',
    roomTypeId: 'rt1',
    roomTypeName: 'Deluxe Sea View',
    ...overrides,
  };
}

describe('buildRoomColumns — roomNumber', () => {
  it('omits the floor line when unset', () => {
    const columns = buildRoomColumns(vi.fn());
    const { container } = render(<>{cellFor(columns, 'roomNumber', room({ floor: null }))}</>);
    expect(container.querySelectorAll('p')).toHaveLength(1);
  });

  it('shows the floor when set', () => {
    const columns = buildRoomColumns(vi.fn());
    render(<>{cellFor(columns, 'roomNumber', room({ floor: '2' }))}</>);
    expect(screen.getByText('Floor 2')).toBeInTheDocument();
  });
});

describe('buildRoomColumns — actions', () => {
  it('calls onEdit with the row when the edit button is clicked', async () => {
    const onEdit = vi.fn();
    const columns = buildRoomColumns(onEdit);
    const target = room({ roomNumber: '204' });
    render(<>{cellFor(columns, 'actions', target)}</>);
    await userEvent.click(screen.getByRole('button', { name: 'Edit room 204' }));
    expect(onEdit).toHaveBeenCalledWith(target);
  });

  it('stops the click from bubbling to the row (which would otherwise open the row itself)', async () => {
    const onEdit = vi.fn();
    const rowClick = vi.fn();
    const columns = buildRoomColumns(onEdit);
    render(<div onClick={rowClick}>{cellFor(columns, 'actions', room({}))}</div>);
    await userEvent.click(screen.getByRole('button'));
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(rowClick).not.toHaveBeenCalled();
  });
});
