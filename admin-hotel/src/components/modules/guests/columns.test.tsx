import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { guestColumns, type GuestRow } from './columns';

function cellFor(id: string, original: GuestRow) {
  const col = guestColumns.find((c) => c.id === id)!;
  const render_ = col.cell as (ctx: { row: { original: GuestRow } }) => React.ReactNode;
  return render_({ row: { original } });
}

function guest(overrides: Partial<GuestRow>): GuestRow {
  return {
    id: 'g1',
    firstName: 'Ines',
    lastName: 'Testeur',
    email: null,
    phone: null,
    countryCode: null,
    reservationsCount: 0,
    totalSpent: 0,
    lastStayDate: null,
    ...overrides,
  } as GuestRow;
}

describe('guestColumns — contact', () => {
  it('shows an em-dash when neither email nor phone is on file', () => {
    render(<>{cellFor('contact', guest({}))}</>);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('shows the email when only email is on file', () => {
    render(<>{cellFor('contact', guest({ email: 'ines@example.com' }))}</>);
    expect(screen.getByText('ines@example.com')).toBeInTheDocument();
    expect(screen.queryByText('—')).not.toBeInTheDocument();
  });

  it('shows both email and phone when both are on file', () => {
    render(<>{cellFor('contact', guest({ email: 'ines@example.com', phone: '+212600000000' }))}</>);
    expect(screen.getByText('ines@example.com')).toBeInTheDocument();
    expect(screen.getByText('+212600000000')).toBeInTheDocument();
  });
});

describe('guestColumns — lastStayDate', () => {
  it('shows "Never stayed" when there is no last stay date', () => {
    render(<>{cellFor('lastStayDate', guest({ lastStayDate: null }))}</>);
    expect(screen.getByText('Never stayed')).toBeInTheDocument();
  });

  it('formats a real last stay date instead of the fallback', () => {
    render(<>{cellFor('lastStayDate', guest({ lastStayDate: '2026-06-01' }))}</>);
    expect(screen.queryByText('Never stayed')).not.toBeInTheDocument();
  });
});

describe('guestColumns — guest name and country', () => {
  it('omits the country line when unset', () => {
    const { container } = render(<>{cellFor('guest', guest({ countryCode: null }))}</>);
    expect(container.querySelectorAll('p')).toHaveLength(1);
  });

  it('shows the country code when set', () => {
    render(<>{cellFor('guest', guest({ countryCode: 'MA' }))}</>);
    expect(screen.getByText('MA')).toBeInTheDocument();
  });
});
