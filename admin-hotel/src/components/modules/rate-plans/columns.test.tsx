import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { buildRatePlanColumns, type RatePlanRow } from './columns';

const ratePlanColumns = buildRatePlanColumns('h1');

function cellFor(id: string, original: RatePlanRow) {
  const col = ratePlanColumns.find((c) => c.id === id)!;
  const render_ = col.cell as (ctx: { row: { original: RatePlanRow } }) => React.ReactNode;
  return render_({ row: { original } });
}

function ratePlan(overrides: Partial<RatePlanRow>): RatePlanRow {
  return {
    id: 'rp1',
    name: 'Bed & Breakfast Flex',
    code: 'BB_FLEX',
    mealPlan: null,
    paymentTiming: 'pay_at_property',
    status: 'active',
    links: [],
    ...overrides,
  } as RatePlanRow;
}

describe('ratePlanColumns — name', () => {
  it('links into this hotel workspace’s rate plan detail page', () => {
    render(<>{cellFor('name', ratePlan({ id: 'rp1' }))}</>);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/hotels/h1/rate-plans/rp1');
  });
});

describe('ratePlanColumns — roomType', () => {
  it('shows "Not linked" when no room type is linked yet', () => {
    render(<>{cellFor('roomType', ratePlan({ links: [] }))}</>);
    expect(screen.getByText('Not linked')).toBeInTheDocument();
  });

  it('joins every linked room type name', () => {
    render(
      <>
        {cellFor(
          'roomType',
          ratePlan({
            links: [
              { roomTypeName: 'Deluxe Sea View' },
              { roomTypeName: 'Family Suite' },
            ] as RatePlanRow['links'],
          })
        )}
      </>
    );
    expect(screen.getByText('Deluxe Sea View, Family Suite')).toBeInTheDocument();
    expect(screen.queryByText('Not linked')).not.toBeInTheDocument();
  });
});

describe('ratePlanColumns — mealPlan', () => {
  it('shows an em-dash when unset', () => {
    render(<>{cellFor('mealPlan', ratePlan({ mealPlan: null }))}</>);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('humanizes a free-text meal plan value', () => {
    render(<>{cellFor('mealPlan', ratePlan({ mealPlan: 'breakfast' }))}</>);
    expect(screen.getByText('Breakfast')).toBeInTheDocument();
  });
});

describe('ratePlanColumns — paymentTiming badge tone', () => {
  it('uses success tone for pay_at_property', () => {
    render(<>{cellFor('paymentTiming', ratePlan({ paymentTiming: 'pay_at_property' }))}</>);
    expect(screen.getByText('Pay At Property').className).toContain('success');
  });

  it('uses gold tone for prepay_full', () => {
    render(<>{cellFor('paymentTiming', ratePlan({ paymentTiming: 'prepay_full' }))}</>);
    expect(screen.getByText('Prepay Full').className).toContain('gold');
  });

  it('uses info tone for prepay_deposit', () => {
    render(<>{cellFor('paymentTiming', ratePlan({ paymentTiming: 'prepay_deposit' }))}</>);
    expect(screen.getByText('Prepay Deposit').className).toContain('info');
  });

  it('falls back to a neutral tone for an unrecognized value instead of throwing', () => {
    render(<>{cellFor('paymentTiming', ratePlan({ paymentTiming: 'invoice_later' }))}</>);
    const className = screen.getByText('Invoice Later').className;
    expect(className).not.toContain('success');
    expect(className).not.toContain('gold');
    expect(className).not.toContain('info');
    expect(className).toContain('bg-muted'); // the neutral badge variant's own class
  });
});
