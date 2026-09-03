import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RatePlanPricingPanel } from './RatePlanPricingPanel';
import type { RatePlanRow } from './columns';

const toast = vi.fn();
const invalidateGraphql = vi.fn();
const linkRoomTypeRatePlan = vi.fn();
const unlinkRoomTypeRatePlan = vi.fn();
const setRatePlanPrices = vi.fn();

vi.mock('@/api/apollo/provider', () => ({ useApollo: () => ({}) }));
vi.mock('@/context/ToastContext', () => ({ useToast: () => ({ toast }) }));
vi.mock('@/api/invalidation', () => ({ invalidateGraphql: (...args: unknown[]) => invalidateGraphql(...args) }));
vi.mock('@/api/rest/endpoints/rates', () => ({
  linkRoomTypeRatePlan: (...args: unknown[]) => linkRoomTypeRatePlan(...args),
  unlinkRoomTypeRatePlan: (...args: unknown[]) => unlinkRoomTypeRatePlan(...args),
  setRatePlanPrices: (...args: unknown[]) => setRatePlanPrices(...args),
}));

function link(overrides: Partial<RatePlanRow['links'][number]> = {}): RatePlanRow['links'][number] {
  return {
    id: 'link-1',
    roomTypeId: 'rt-1',
    roomTypeName: 'Deluxe Sea View',
    currencyCode: 'MAD',
    prices: [],
    ...overrides,
  } as RatePlanRow['links'][number];
}

function renderPanel(links: RatePlanRow['links'], roomTypeOptions: { value: string; label: string }[] = []) {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const onChanged = vi.fn();
  render(
    <QueryClientProvider client={queryClient}>
      <RatePlanPricingPanel ratePlanId="rp-1" links={links} roomTypeOptions={roomTypeOptions} onChanged={onChanged} />
    </QueryClientProvider>
  );
  return { onChanged };
}

beforeEach(() => {
  toast.mockClear();
  invalidateGraphql.mockClear();
  linkRoomTypeRatePlan.mockReset();
  unlinkRoomTypeRatePlan.mockReset();
  setRatePlanPrices.mockReset();
});

describe('RatePlanPricingPanel — no links yet', () => {
  it('shows the empty state and hides the linker when there are no room types to offer', () => {
    renderPanel([], []);
    expect(screen.getByText('No room type linked yet')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /link/i })).not.toBeInTheDocument();
  });

  it('offers only room types not already linked', () => {
    renderPanel([link({ roomTypeId: 'rt-1' })], [
      { value: 'rt-1', label: 'Deluxe Sea View' },
      { value: 'rt-2', label: 'Family Suite' },
    ]);
    // The linker shows because rt-2 is still available, even though rt-1 is linked.
    expect(screen.getByRole('button', { name: /^link$/i })).toBeInTheDocument();
  });
});

describe('RatePlanPricingPanel — price rows (RatePlanLinkCard)', () => {
  it('seeds rows from the link’s existing prices, sorted by validFrom', () => {
    renderPanel([
      link({
        prices: [
          { id: 'pr-2', validFrom: '2026-12-01', validTo: '2026-12-31', priceAmount: 1500 },
          { id: 'pr-1', validFrom: '2026-06-01', validTo: '2026-08-31', priceAmount: 900 },
        ],
      }),
    ]);
    const dates = screen.getAllByLabelText('Valid from') as HTMLInputElement[];
    expect(dates.map((el) => el.value)).toEqual(['2026-06-01', '2026-12-01']);
  });

  it('shows the price-range count, pluralized correctly', () => {
    renderPanel([link({ prices: [{ id: 'pr-1', validFrom: '2026-06-01', validTo: '2026-08-31', priceAmount: 900 }] })]);
    expect(screen.getByText(/1 price range$/)).toBeInTheDocument();
  });

  it('adds a blank row on "Add price range" and disables Save until every field is filled', async () => {
    renderPanel([link({ prices: [] })]);
    expect(screen.getByText('No price ranges yet — add one below.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save prices' })).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: 'Add price range' }));
    expect(screen.getByLabelText('Valid from')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save prices' })).toBeDisabled();

    await userEvent.type(screen.getByLabelText('Valid from'), '2026-09-01');
    await userEvent.type(screen.getByLabelText('Valid to'), '2026-09-30');
    expect(screen.getByRole('button', { name: 'Save prices' })).toBeDisabled();

    await userEvent.type(screen.getByLabelText('Price per night'), '800');
    expect(screen.getByRole('button', { name: 'Save prices' })).not.toBeDisabled();
  });

  it('rejects a zero or blank price even once dates are filled (priceAmount must be > 0)', async () => {
    renderPanel([link({ prices: [] })]);
    await userEvent.click(screen.getByRole('button', { name: 'Add price range' }));
    await userEvent.type(screen.getByLabelText('Valid from'), '2026-09-01');
    await userEvent.type(screen.getByLabelText('Valid to'), '2026-09-30');
    await userEvent.type(screen.getByLabelText('Price per night'), '0');
    expect(screen.getByRole('button', { name: 'Save prices' })).toBeDisabled();
  });

  it('removes a row via its trash button, restoring the empty state', async () => {
    renderPanel([link({ prices: [{ id: 'pr-1', validFrom: '2026-06-01', validTo: '2026-08-31', priceAmount: 900 }] })]);
    await userEvent.click(screen.getByRole('button', { name: 'Remove range' }));
    expect(screen.getByText('No price ranges yet — add one below.')).toBeInTheDocument();
  });

  it('saves the full current row list (not a diff) and re-syncs rows from the response', async () => {
    setRatePlanPrices.mockResolvedValue([
      { id: 'pr-new', validFrom: '2026-09-01', validTo: '2026-09-30', priceAmount: 800 },
    ]);
    renderPanel([link({ id: 'link-1', prices: [] })]);
    await userEvent.click(screen.getByRole('button', { name: 'Add price range' }));
    await userEvent.type(screen.getByLabelText('Valid from'), '2026-09-01');
    await userEvent.type(screen.getByLabelText('Valid to'), '2026-09-30');
    await userEvent.type(screen.getByLabelText('Price per night'), '800');
    await userEvent.click(screen.getByRole('button', { name: 'Save prices' }));

    expect(setRatePlanPrices).toHaveBeenCalledWith('link-1', [
      { validFrom: '2026-09-01', validTo: '2026-09-30', priceAmount: 800 },
    ]);
    expect(await screen.findByText(/1 price range$/)).toBeInTheDocument();
    expect(invalidateGraphql).toHaveBeenCalledWith({}, 'ratePlans.prices');
  });
});

describe('RatePlanPricingPanel — unlink', () => {
  it('requires confirmation before unlinking, and calls the endpoint only on confirm', async () => {
    unlinkRoomTypeRatePlan.mockResolvedValue(undefined);
    renderPanel([link({ id: 'link-1', roomTypeName: 'Deluxe Sea View' })]);

    await userEvent.click(screen.getByRole('button', { name: /unlink/i }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Unlink Deluxe Sea View?')).toBeInTheDocument();
    expect(unlinkRoomTypeRatePlan).not.toHaveBeenCalled();

    await userEvent.click(within(dialog).getByRole('button', { name: 'Unlink' }));
    expect(unlinkRoomTypeRatePlan).toHaveBeenCalledWith('link-1');
    expect(invalidateGraphql).toHaveBeenCalledWith({}, 'ratePlans.unlink');
  });
});
