import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GoogleButton from './GoogleButton';

describe('GoogleButton', () => {
  it('renders an accessible link to the OAuth start route with the redirect param', () => {
    render(<GoogleButton redirect="/account" />);
    const link = screen.getByRole('link', { name: 'Continue with Google' });
    expect(link).toHaveAttribute('href', '/api/auth/google/start?redirect=%2Faccount');
  });

  it('omits the redirect param when none is given', () => {
    render(<GoogleButton />);
    const link = screen.getByRole('link', { name: 'Continue with Google' });
    expect(link).toHaveAttribute('href', '/api/auth/google/start');
  });

  it('enters a disabled, loading state on click and blocks a second click', async () => {
    render(<GoogleButton redirect="/account" />);
    const link = screen.getByRole('link', { name: 'Continue with Google' });

    await userEvent.click(link);

    const busyLink = await screen.findByRole('link', { name: 'Redirecting…' });
    expect(busyLink).toHaveAttribute('aria-disabled', 'true');
  });

  it('accepts a custom label', () => {
    render(<GoogleButton label="Sign up with Google" />);
    expect(screen.getByRole('link', { name: 'Sign up with Google' })).toBeInTheDocument();
  });
});
