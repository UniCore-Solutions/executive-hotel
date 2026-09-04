import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import OAuthCallbackFlow from './OAuthCallbackFlow';

const replace = vi.fn();
const completeGoogleLogin = vi.fn();
let mockSearchParams = new URLSearchParams('');

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => mockSearchParams,
}));

vi.mock('@/context/SessionContext', () => ({
  useSession: () => ({ completeGoogleLogin }),
}));

beforeEach(() => {
  replace.mockClear();
  completeGoogleLogin.mockReset();
});

describe('OAuthCallbackFlow', () => {
  it('redirects with the mapped error and never calls the session route', () => {
    mockSearchParams = new URLSearchParams('oauthError=access_denied');
    render(<OAuthCallbackFlow />);

    expect(replace).toHaveBeenCalledWith('/account?error=access_denied');
    expect(completeGoogleLogin).not.toHaveBeenCalled();
  });

  it('redeems the grant and redirects to the requested safe path on success', async () => {
    mockSearchParams = new URLSearchParams('grant=abc123&redirect=%2Faccount%2Fbookings');
    completeGoogleLogin.mockResolvedValue({ ok: true });
    render(<OAuthCallbackFlow />);

    expect(completeGoogleLogin).toHaveBeenCalledWith('abc123');
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/account/bookings'));
  });

  it('falls back to /account when the redirect param is not a safe internal path', async () => {
    mockSearchParams = new URLSearchParams('grant=abc123&redirect=https%3A%2F%2Fevil.example.com');
    completeGoogleLogin.mockResolvedValue({ ok: true });
    render(<OAuthCallbackFlow />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/account'));
  });

  it('redirects to a generic error when the grant exchange fails', async () => {
    mockSearchParams = new URLSearchParams('grant=abc123');
    completeGoogleLogin.mockResolvedValue({ ok: false, message: 'invalid or expired sign-in link' });
    render(<OAuthCallbackFlow />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/account?error=session_failed'));
  });

  it('redirects to a generic error and never calls the session route when no grant is present', () => {
    mockSearchParams = new URLSearchParams('');
    render(<OAuthCallbackFlow />);

    expect(replace).toHaveBeenCalledWith('/account?error=session_failed');
    expect(completeGoogleLogin).not.toHaveBeenCalled();
  });
});
