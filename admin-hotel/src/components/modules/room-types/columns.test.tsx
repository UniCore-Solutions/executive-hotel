import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { buildRoomTypeColumns, type RoomTypeRow } from './columns';

const roomTypeColumns = buildRoomTypeColumns('h1');

function cellFor(id: string, original: RoomTypeRow) {
  const col = roomTypeColumns.find((c) => c.id === id)!;
  const render_ = col.cell as (ctx: { row: { original: RoomTypeRow } }) => React.ReactNode;
  return render_({ row: { original } });
}

function roomType(overrides: Partial<RoomTypeRow>): RoomTypeRow {
  return {
    id: 'rt1',
    name: 'Deluxe Sea View',
    maxAdults: 2,
    maxChildren: 0,
    bedConfiguration: null,
    rooms: [],
    totalInventory: 0,
    status: 'active',
    ...overrides,
  } as RoomTypeRow;
}

describe('roomTypeColumns — name', () => {
  it('links into this hotel workspace’s room type detail page', () => {
    render(<>{cellFor('name', roomType({ id: 'rt1' }))}</>);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/hotels/h1/room-types/rt1');
  });
});

describe('roomTypeColumns — capacity', () => {
  it('singularizes "adult" for a capacity of exactly 1', () => {
    render(<>{cellFor('capacity', roomType({ maxAdults: 1, maxChildren: 0 }))}</>);
    expect(screen.getByText('1 adult')).toBeInTheDocument();
  });

  it('pluralizes "adults" above 1', () => {
    render(<>{cellFor('capacity', roomType({ maxAdults: 2, maxChildren: 0 }))}</>);
    expect(screen.getByText(/2 adults/)).toBeInTheDocument();
  });

  it('omits the children clause entirely when maxChildren is 0', () => {
    const { container } = render(<>{cellFor('capacity', roomType({ maxAdults: 2, maxChildren: 0 }))}</>);
    expect(container.textContent).not.toContain('children');
  });

  it('appends the children count when above 0', () => {
    render(<>{cellFor('capacity', roomType({ maxAdults: 2, maxChildren: 2 }))}</>);
    expect(screen.getByText(/\+ 2 children/)).toBeInTheDocument();
  });
});

describe('roomTypeColumns — beds', () => {
  it('shows an em-dash when no bed configuration is set', () => {
    render(<>{cellFor('beds', roomType({ bedConfiguration: null }))}</>);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('shows the configured bed layout', () => {
    render(<>{cellFor('beds', roomType({ bedConfiguration: '1 King' }))}</>);
    expect(screen.getByText('1 King')).toBeInTheDocument();
  });
});

describe('roomTypeColumns — rooms', () => {
  it('counts the linked physical rooms', () => {
    render(<>{cellFor('rooms', roomType({ rooms: [{}, {}, {}] as RoomTypeRow['rooms'] }))}</>);
    expect(screen.getByText('3')).toBeInTheDocument();
  });
});
