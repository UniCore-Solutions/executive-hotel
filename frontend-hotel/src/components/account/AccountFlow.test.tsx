import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { SessionProvider } from '@/context/SessionContext';
import { SearchProvider } from '@/context/SearchContext';
import { ToastProvider } from '@/context/ToastContext';
import { ModalProvider } from '@/context/ModalContext';
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

vi.mock('@/services/reservations', () => ({
  reservations: {
    list: vi.fn().mockResolvedValue([]),
    find: vi.fn().mockResolvedValue(null),
    create: vi.fn(),
    cancel: vi.fn(),
  },
  generateIdempotencyKey: vi.fn().mockReturnValue('bk-test'),
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
  it('renders the auth view with tabs', () => {
    render(wrap());
    expect(screen.getByText('Sign in or create an account')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Sign in' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Create account' })).toHaveAttribute(
      'aria-selected',
      'false'
    );
  });

  it('shows field errors for an empty login', async () => {
    render(wrap());
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument();
    expect(screen.getByText('Enter your password.')).toBeInTheDocument();
  });
});
