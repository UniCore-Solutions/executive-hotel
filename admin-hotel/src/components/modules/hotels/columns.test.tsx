import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { hotelColumns, type HotelRow } from './columns';

function cellFor(id: string, original: HotelRow) {
  const col = hotelColumns.find((c) => c.id === id)!;
  const render_ = col.cell as (ctx: { row: { original: HotelRow } }) => React.ReactNode;
  return render_({ row: { original } });
}

function hotel(overrides: Partial<HotelRow>): HotelRow {
  return {
    id: 'h1',
    name: 'Executive Hotel',
    brand: null,
    city: null,
    countryCode: null,
    status: 'active',
    starRating: null,
    roomTypeCount: 0,
    activeReservations: 0,
    ...overrides,
  } as HotelRow;
}

describe('hotelColumns — name', () => {
  it('shows only the name when there is no distinct brand', () => {
    render(<>{cellFor('name', hotel({ name: 'Executive Hotel', brand: null }))}</>);
    expect(screen.getByText('Executive Hotel')).toBeInTheDocument();
  });

  it('does not repeat the brand suffix when brand equals name', () => {
    const { container } = render(<>{cellFor('name', hotel({ name: 'Executive Hotel', brand: 'Executive Hotel' }))}</>);
    expect(container.textContent).toBe('Executive Hotel');
  });

  it('appends the brand when it differs from the name', () => {
    render(<>{cellFor('name', hotel({ name: 'Riad Fes', brand: 'Executive Collection' }))}</>);
    expect(screen.getByText(/Executive Collection/)).toBeInTheDocument();
  });

  it('links to the hotel dashboard', () => {
    render(<>{cellFor('name', hotel({ id: 'abc-123' }))}</>);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/hotels/abc-123/dashboard');
  });
});

describe('hotelColumns — location', () => {
  it('joins city and country with a comma', () => {
    render(<>{cellFor('location', hotel({ city: 'Rabat', countryCode: 'MA' }))}</>);
    expect(screen.getByText('Rabat, MA')).toBeInTheDocument();
  });

  it('shows only the part that is present', () => {
    render(<>{cellFor('location', hotel({ city: 'Rabat', countryCode: null }))}</>);
    expect(screen.getByText('Rabat')).toBeInTheDocument();
  });

  it('shows an em-dash when both are missing', () => {
    render(<>{cellFor('location', hotel({ city: null, countryCode: null }))}</>);
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});

describe('hotelColumns — rating', () => {
  it('shows an em-dash when there is no star rating', () => {
    render(<>{cellFor('rating', hotel({ starRating: null }))}</>);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('shows the star count when rated', () => {
    render(<>{cellFor('rating', hotel({ starRating: 4 }))}</>);
    expect(screen.getByText('4')).toBeInTheDocument();
  });
});
