import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import SearchBar from './SearchBar';

/* Single-hotel platform: the search bar shows the canonical hotel as a
   STATIC label — there is no hotel picker, no "All hotels" list. */

const mocks = vi.hoisted(() => ({
  search: {
    state: {
      checkin: new Date(2026, 8, 10),
      checkout: new Date(2026, 8, 12),
      adults: 2,
      children: 0,
      childrenAges: [] as number[],
      rooms: 1,
      promo: '',
      currency: 'MAD' as const,
    },
    setDate: vi.fn(),
    errors: () => [] as string[],
    openSheet: vi.fn(),
  },
  router: { push: vi.fn() },
}));

vi.mock('@/context/SearchContext', () => ({
  useSearch: () => mocks.search,
}));
vi.mock('@/context/ToastContext', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => mocks.router,
  usePathname: () => '/',
}));
vi.mock('@/services/activity', () => ({
  recordSearch: vi.fn(),
}));
vi.mock('@/services/canonicalHotel', () => ({
  getCanonicalHotel: vi.fn().mockResolvedValue({
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Executive Hotel',
    city: 'Lisbon',
  }),
}));

describe('SearchBar (single-hotel platform)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the canonical hotel as a static label', async () => {
    render(<SearchBar showMobileTrigger={false} />);
    expect(await screen.findByText('Executive Hotel · Lisbon')).toBeInTheDocument();
  });

  it('does NOT render a hotel picker or an "All hotels" option', async () => {
    render(<SearchBar showMobileTrigger={false} />);
    await screen.findByText('Executive Hotel · Lisbon');
    expect(screen.queryByText('All hotels')).not.toBeInTheDocument();
    expect(screen.queryByText('Search hotels…')).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Choose hotel' })).not.toBeInTheDocument();
  });
});
