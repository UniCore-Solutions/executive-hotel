import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from './StatusBadge';

describe('StatusBadge', () => {
  it('renders a humanized label for a known reservation status', () => {
    render(<StatusBadge domain="reservation" value="checked_in" />);
    expect(screen.getByText('Checked In')).toBeInTheDocument();
  });

  it('falls back to a neutral tone for an unmapped value without throwing', () => {
    render(<StatusBadge domain="reservation" value="some_future_status" />);
    expect(screen.getByText('Some Future Status')).toBeInTheDocument();
  });

  it('accepts an explicit label override', () => {
    render(<StatusBadge domain="payment" value="captured" label="Paid" />);
    expect(screen.getByText('Paid')).toBeInTheDocument();
  });
});
