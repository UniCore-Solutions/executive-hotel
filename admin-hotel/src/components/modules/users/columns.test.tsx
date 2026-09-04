import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userColumns, type UserRow } from './columns';

function cellFor(id: string, original: UserRow) {
  const col = userColumns.find((c) => c.id === id)!;
  const render_ = col.cell as (ctx: { row: { original: UserRow } }) => React.ReactNode;
  return render_({ row: { original } });
}

function user(overrides: Partial<UserRow>): UserRow {
  return {
    id: 'u1',
    email: 'staff@example.com',
    firstName: 'Ines',
    lastName: 'Testeur',
    phone: null,
    status: 'active',
    lastLoginAt: null,
    createdAt: '2026-01-01T00:00:00Z',
    roles: [],
    ...overrides,
  } as UserRow;
}

describe('userColumns — user', () => {
  it('joins first and last name', () => {
    render(<>{cellFor('user', user({}))}</>);
    expect(screen.getByText('Ines Testeur')).toBeInTheDocument();
    expect(screen.getByText('staff@example.com')).toBeInTheDocument();
  });

  it('falls back to an em-dash when both names are missing', () => {
    render(<>{cellFor('user', user({ firstName: null, lastName: null }))}</>);
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});

describe('userColumns — roles', () => {
  it('shows "No roles" when the user has none', () => {
    render(<>{cellFor('roles', user({ roles: [] }))}</>);
    expect(screen.getByText('No roles')).toBeInTheDocument();
  });

  it('renders a badge per role, including the hotel name when scoped', () => {
    render(
      <>
        {cellFor(
          'roles',
          user({
            roles: [
              { id: 'r1', roleName: 'hotel_admin', hotelId: 'h1', hotelName: 'Executive Hotel' },
              { id: 'r2', roleName: 'super_admin', hotelId: null, hotelName: null },
            ],
          }),
        )}
      </>,
    );
    expect(screen.getByText('Hotel Admin')).toBeInTheDocument();
    expect(screen.getByText('· Executive Hotel', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('Super Admin')).toBeInTheDocument();
  });
});

describe('userColumns — lastLoginAt', () => {
  it('shows "Never" when the user has never logged in', () => {
    render(<>{cellFor('lastLoginAt', user({ lastLoginAt: null }))}</>);
    expect(screen.getByText('Never')).toBeInTheDocument();
  });

  it('formats a real last login date', () => {
    render(<>{cellFor('lastLoginAt', user({ lastLoginAt: '2026-06-01T10:00:00Z' }))}</>);
    expect(screen.queryByText('Never')).not.toBeInTheDocument();
  });
});
