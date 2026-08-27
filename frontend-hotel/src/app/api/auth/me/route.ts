import { NextResponse } from 'next/server';
import { getSessionToken } from '@/lib/session';

const GRAPHQL_URL = process.env.API_INTERNAL_URL ?? 'http://127.0.0.1:8180/graphql';

const ME_QUERY = `query Me { me { id email firstName lastName phone roles hotelIds } }`;

/** Restores the session on page load from the httpOnly cookie — returns
    { me: null } (200) rather than 401 when signed out, since "not signed in"
    is the expected steady state for most visitors, not an error. */
export async function GET(): Promise<NextResponse> {
  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json({ me: null });
  }
  try {
    const res = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ query: ME_QUERY }),
      cache: 'no-store',
    });
    const payload = (await res.json()) as { data?: { me?: unknown }; errors?: unknown[] };
    if (payload.errors?.length || !payload.data?.me) {
      return NextResponse.json({ me: null });
    }
    return NextResponse.json({ me: payload.data.me });
  } catch {
    return NextResponse.json({ me: null });
  }
}
