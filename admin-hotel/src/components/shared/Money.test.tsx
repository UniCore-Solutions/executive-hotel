import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { formatMoney } from '@/lib/format';
import { Money } from './Money';

describe('Money', () => {
  it('renders through the single app-wide money formatter (whole MAD, no cents), not a local computation', () => {
    const { container } = render(<Money amount={5787.99} />);
    expect(container.textContent).toBe(formatMoney(5787.99));
    expect(container.textContent).not.toContain('.');
  });

  it('applies tabular-nums so amounts align in a column', () => {
    const { container } = render(<Money amount={100} />);
    expect(container.querySelector('span')?.className).toContain('tabular-nums');
  });

  it('merges a caller-provided className', () => {
    const { container } = render(<Money amount={100} className="text-right" />);
    expect(container.querySelector('span')?.className).toContain('text-right');
  });
});
