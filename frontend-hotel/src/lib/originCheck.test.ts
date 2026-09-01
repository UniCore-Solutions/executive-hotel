import { describe, expect, it } from 'vitest';
import { rejectCrossOrigin } from './originCheck';

/** Builds a Request as a browser/proxy would present it to the BFF route. */
function req(url: string, headers: Record<string, string>): Request {
  return new Request(url, { method: 'POST', headers });
}

describe('rejectCrossOrigin', () => {
  it('allows a request with no Origin header (same-origin non-CORS, server-side calls)', () => {
    expect(rejectCrossOrigin(req('http://localhost:3000/api/graphql', {}))).toBeNull();
  });

  it('allows a same-origin request', () => {
    const r = req('http://localhost:3000/api/graphql', {
      origin: 'http://localhost:3000',
      host: 'localhost:3000',
    });
    expect(rejectCrossOrigin(r)).toBeNull();
  });

  it('rejects a cross-origin request with 403', () => {
    const r = req('http://localhost:3000/api/graphql', {
      origin: 'https://evil.example',
      host: 'localhost:3000',
    });
    const res = rejectCrossOrigin(r);
    expect(res).not.toBeNull();
    expect(res?.status).toBe(403);
  });

  /**
   * Regression guard. Comparing `new URL(request.url).origin` to the browser's
   * Origin breaks behind a reverse proxy: the request URL is the internal
   * address while the browser addressed the public hostname, so every real
   * request would 403.
   */
  it('allows a proxied request where the public host differs from the internal URL', () => {
    const r = req('http://frontend:3000/api/graphql', {
      origin: 'https://book.example.com',
      host: 'frontend:3000',
      'x-forwarded-host': 'book.example.com',
    });
    expect(rejectCrossOrigin(r)).toBeNull();
  });

  it('still rejects a foreign origin behind a proxy', () => {
    const r = req('http://frontend:3000/api/graphql', {
      origin: 'https://evil.example',
      host: 'frontend:3000',
      'x-forwarded-host': 'book.example.com',
    });
    expect(rejectCrossOrigin(r)?.status).toBe(403);
  });

  it('rejects a malformed Origin', () => {
    const r = req('http://localhost:3000/api/graphql', {
      origin: 'not-a-url',
      host: 'localhost:3000',
    });
    expect(rejectCrossOrigin(r)?.status).toBe(403);
  });
});
