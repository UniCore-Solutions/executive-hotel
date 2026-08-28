import { NextResponse } from 'next/server';
import { getSessionToken } from '@/lib/session';

const BACKEND_REST_URL =
  (process.env.API_INTERNAL_URL ?? 'http://127.0.0.1:8180/graphql').replace(
    /\/graphql\/?$/,
    ''
  ) + '/api/v1';
const GRAPHQL_URL = process.env.API_INTERNAL_URL ?? 'http://127.0.0.1:8180/graphql';

const ME_QUERY = `
  query Me {
    me { id email firstName lastName phone roles hotelIds }
  }
`;

/**
 * Profile update — WRITE goes to the backend REST endpoint
 * (POST /api/v1/auth/me/profile, the API rule: GraphQL = READ, REST =
 * WRITE/ACTION); the refreshed Me is then read back over GraphQL so the
 * client session shape stays identical.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  let input: { firstName?: string; lastName?: string; phone?: string };
  try {
    input = (await request.json()) as typeof input;
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  const write = await fetch(BACKEND_REST_URL + '/auth/me/profile', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({
      firstName: input.firstName ?? null,
      lastName: input.lastName ?? null,
      phone: input.phone ?? null,
    }),
    cache: 'no-store',
  });
  if (!write.ok) {
    const body = (await write.json().catch(() => null)) as { message?: string } | null;
    return NextResponse.json(
      { error: body?.message ?? 'Could not update your profile.' },
      { status: write.status }
    );
  }
  const res = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ query: ME_QUERY }),
    cache: 'no-store',
  });
  const payload = (await res.json()) as {
    data?: { me?: unknown };
    errors?: Array<{ message: string }>;
  };
  if (payload.errors?.length) {
    return NextResponse.json({ error: payload.errors[0]!.message }, { status: 400 });
  }
  return NextResponse.json({ me: payload.data?.me ?? null });
}
