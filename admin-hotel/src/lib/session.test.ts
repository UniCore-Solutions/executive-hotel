import { describe, expect, it } from 'vitest';
import { isHttpsRequest } from './session';

// Regression coverage for the bug this function fixes: a `Secure` cookie set
// over `http://` is silently dropped by the browser, forcing a re-login on
// every request. `isHttpsRequest` decides whether to set that flag, so it
// must read the *browser-facing* protocol, never `NODE_ENV`.
describe('isHttpsRequest', () => {
  it('is true for a request whose own URL is https', () => {
    const request = new Request('https://app.example.com/api/auth/login');
    expect(isHttpsRequest(request)).toBe(true);
  });

  it('is false for a plain http request with no proxy header', () => {
    const request = new Request('http://localhost:3102/api/auth/login');
    expect(isHttpsRequest(request)).toBe(false);
  });

  it('trusts x-forwarded-proto: https from a TLS-terminating proxy even over an http URL', () => {
    const request = new Request('http://localhost:3102/api/auth/login', {
      headers: { 'x-forwarded-proto': 'https' },
    });
    expect(isHttpsRequest(request)).toBe(true);
  });

  it('reads only the first hop of a comma-separated x-forwarded-proto chain', () => {
    const request = new Request('http://localhost:3102/api/auth/login', {
      headers: { 'x-forwarded-proto': 'https, http' },
    });
    expect(isHttpsRequest(request)).toBe(true);
  });

  it('is false when x-forwarded-proto says http even though the header is present', () => {
    const request = new Request('https://app.example.com/api/auth/login', {
      headers: { 'x-forwarded-proto': 'http' },
    });
    expect(isHttpsRequest(request)).toBe(false);
  });
});
