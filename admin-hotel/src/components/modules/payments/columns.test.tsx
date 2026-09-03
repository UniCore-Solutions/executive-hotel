import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { paymentColumns, type PaymentRow } from './columns';

function cellFor(id: string, original: PaymentRow) {
  const col = paymentColumns.find((c) => c.id === id)!;
  const render_ = col.cell as (ctx: { row: { original: PaymentRow } }) => React.ReactNode;
  return render_({ row: { original } });
}

function payment(overrides: Partial<PaymentRow>): PaymentRow {
  return {
    id: 'p1',
    reservationId: '11111111-2222-3333-4444-555555555555',
    provider: 'simulated',
    providerReference: null,
    status: 'captured',
    createdAt: '2026-06-01T10:00:00Z',
    amount: 1200,
    ...overrides,
  } as PaymentRow;
}

describe('paymentColumns — reservationId', () => {
  it('truncates the raw reservation id to a short reference (no drill-down link exists yet)', () => {
    render(<>{cellFor('reservationId', payment({}))}</>);
    expect(screen.getByText('11111111…')).toBeInTheDocument();
  });

  it('keeps the full id available via the title attribute', () => {
    render(<>{cellFor('reservationId', payment({}))}</>);
    expect(screen.getByText('11111111…')).toHaveAttribute('title', '11111111-2222-3333-4444-555555555555');
  });
});

describe('paymentColumns — provider', () => {
  it('humanizes the provider enum', () => {
    render(<>{cellFor('provider', payment({ provider: 'simulated' }))}</>);
    expect(screen.getByText('Simulated')).toBeInTheDocument();
  });

  it('omits the provider reference line when unset', () => {
    const { container } = render(<>{cellFor('provider', payment({ providerReference: null }))}</>);
    expect(container.querySelectorAll('p')).toHaveLength(1);
  });

  it('shows the provider reference when present', () => {
    render(<>{cellFor('provider', payment({ providerReference: 'sim_ref_123' }))}</>);
    expect(screen.getByText('sim_ref_123')).toBeInTheDocument();
  });
});
