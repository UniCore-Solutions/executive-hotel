import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '@/lib/api';
import { ErrorState } from './ErrorState';

describe('ErrorState', () => {
  it('shows the ApiError message verbatim', () => {
    render(<ErrorState error={new ApiError('Rate plan not found')} />);
    expect(screen.getByText('Rate plan not found')).toBeInTheDocument();
  });

  it('shows a plain Error message verbatim', () => {
    render(<ErrorState error={new Error('Network request failed')} />);
    expect(screen.getByText('Network request failed')).toBeInTheDocument();
  });

  it('falls back to a generic message for a non-Error rejection (e.g. a thrown string)', () => {
    render(<ErrorState error="boom" />);
    expect(screen.getByText('Something went wrong.')).toBeInTheDocument();
  });

  it('renders no retry button when onRetry is omitted', () => {
    render(<ErrorState error={new Error('fail')} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders a retry button that calls onRetry when provided', async () => {
    const onRetry = vi.fn();
    render(<ErrorState error={new Error('fail')} onRetry={onRetry} />);
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
