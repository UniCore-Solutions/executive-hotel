import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Inbox } from 'lucide-react';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('renders the title and icon without a description or action', () => {
    render(<EmptyState icon={Inbox} title="No reservations yet" />);
    expect(screen.getByText('No reservations yet')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders an optional description', () => {
    render(<EmptyState icon={Inbox} title="No guests" description="Guests appear after their first stay." />);
    expect(screen.getByText('Guests appear after their first stay.')).toBeInTheDocument();
  });

  it('renders an action button and fires its callback on click', async () => {
    const onClick = vi.fn();
    render(<EmptyState icon={Inbox} title="No rate plans" action={{ label: 'Create rate plan', onClick }} />);
    await userEvent.click(screen.getByRole('button', { name: 'Create rate plan' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
