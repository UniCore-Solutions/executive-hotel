import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { SessionProvider } from '@/context/SessionContext';
import { SearchProvider } from '@/context/SearchContext';
import { ToastProvider } from '@/context/ToastContext';
import { ModalProvider } from '@/context/ModalContext';
import { session as getSession } from '@/services/auth';
import AccountFlow from './AccountFlow';

vi.mock('next/navigation', () => ({
  usePathname: () => '/account',
  useSearchParams: () => new URLSearchParams(''),
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: unknown; children: ReactNode }) => (
    <a href={href ? String(href) : '#'} {...rest}>
      {children}
    </a>
  ),
}));

function wrap() {
  return (
    <SessionProvider>
      <SearchProvider>
        <ToastProvider>
          <ModalProvider>
            <AccountFlow />
          </ModalProvider>
        </ToastProvider>
      </SearchProvider>
    </SessionProvider>
  );
}

describe('AccountFlow (signed out)', () => {
  it('renders the auth view with tabs and the demo hint', () => {
    render(wrap());
    expect(screen.getByText('Sign in or create an account')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Sign in' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Create account' })).toHaveAttribute(
      'aria-selected',
      'false'
    );
    expect(screen.getByText(/Demo account:/)).toBeInTheDocument();
    expect(screen.getByText(/demo@hotelcollection.com/)).toBeInTheDocument();
  });

  it('shows field errors for an empty login', async () => {
    render(wrap());
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument();
    expect(screen.getByText('Enter your password.')).toBeInTheDocument();
  });

  it('rejects bad credentials with the exact message', async () => {
    render(wrap());
    await userEvent.type(screen.getByLabelText(/Email/), 'demo@hotelcollection.com');
    await userEvent.type(screen.getByLabelText('Password'), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Incorrect email or password.')).toBeInTheDocument();
    expect(getSession()).toBeNull();
  });

  it('sends the mock reset message for the demo email', async () => {
    render(wrap());
    await userEvent.click(screen.getByText('Forgot password?'));
    expect(
      await screen.findByText(
        'If an account exists for this email, a reset link has been sent (mock).'
      )
    ).toBeInTheDocument();
  });
});

describe('AccountFlow (signed in)', () => {
  it('logs in with the demo account and shows the dashboard with bookings', async () => {
    render(wrap());
    await userEvent.type(screen.getByLabelText(/Email/), 'demo@hotelcollection.com');
    await userEvent.type(screen.getByLabelText('Password'), 'demo1234');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Welcome, Adam Benali')).toBeInTheDocument();
    expect(screen.getByText('demo@hotelcollection.com')).toBeInTheDocument();
    expect(screen.getByText('Your bookings')).toBeInTheDocument();
    const card = await screen.findByRole('link', { name: /Executive Suite/ });
    expect(card).toHaveTextContent('RC-DEMO1');
    expect(card).toHaveTextContent('Confirmed');
  });

  it('shows the empty state when the session email has no bookings', async () => {
    render(wrap());
    await userEvent.click(screen.getByRole('tab', { name: 'Create account' }));
    await userEvent.type(screen.getByLabelText(/First name/), 'Nobody');
    await userEvent.type(screen.getByLabelText(/Last name/), 'User');
    await userEvent.type(screen.getByLabelText(/Email/), 'nobody@test.dev');
    await userEvent.type(screen.getByLabelText(/Password \*/), 'secret1');
    await userEvent.type(screen.getByLabelText(/Confirm password/), 'secret1');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText('Welcome, Nobody User')).toBeInTheDocument();
    expect(await screen.findByText('No bookings yet on this email')).toBeInTheDocument();
  });

  it('creates an account, auto-signs-in and shows the welcome dashboard', async () => {
    render(wrap());
    await userEvent.click(screen.getByRole('tab', { name: 'Create account' }));
    await userEvent.type(screen.getByLabelText(/First name/), 'Nadia');
    await userEvent.type(screen.getByLabelText(/Last name/), 'Alaoui');
    await userEvent.type(screen.getByLabelText(/Email/), 'nadia@test.dev');
    await userEvent.type(screen.getByLabelText(/Password \*/), 'secret1');
    await userEvent.type(screen.getByLabelText(/Confirm password/), 'secret1');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText('Welcome, Nadia Alaoui')).toBeInTheDocument();
    expect(getSession()?.email).toBe('nadia@test.dev');
  });

  it('rejects a duplicate email with the exact message', async () => {
    render(wrap());
    await userEvent.click(screen.getByRole('tab', { name: 'Create account' }));
    await userEvent.type(screen.getByLabelText(/First name/), 'Demo');
    await userEvent.type(screen.getByLabelText(/Last name/), 'User');
    await userEvent.type(screen.getByLabelText(/Email/), 'demo@hotelcollection.com');
    await userEvent.type(screen.getByLabelText(/Password \*/), 'demo1234');
    await userEvent.type(screen.getByLabelText(/Confirm password/), 'demo1234');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(
      await screen.findByText('An account with this email already exists. Sign in instead.')
    ).toBeInTheDocument();
  });

  it('rejects mismatched passwords', async () => {
    render(wrap());
    await userEvent.click(screen.getByRole('tab', { name: 'Create account' }));
    await userEvent.type(screen.getByLabelText(/First name/), 'Nadia');
    await userEvent.type(screen.getByLabelText(/Last name/), 'Alaoui');
    await userEvent.type(screen.getByLabelText(/Email/), 'nadia2@test.dev');
    await userEvent.type(screen.getByLabelText(/Password \*/), 'secret1');
    await userEvent.type(screen.getByLabelText(/Confirm password/), 'secret2');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText('Passwords do not match.')).toBeInTheDocument();
  });

  it('signs out back to the auth view', async () => {
    render(wrap());
    await userEvent.type(screen.getByLabelText('Email'), 'demo@hotelcollection.com');
    await userEvent.type(screen.getByLabelText('Password'), 'demo1234');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await screen.findByText('Welcome, Adam Benali');
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(screen.getByText('Sign in or create an account')).toBeInTheDocument();
    expect(getSession()).toBeNull();
  });
});
