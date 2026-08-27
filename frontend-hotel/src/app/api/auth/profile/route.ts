import { NextResponse } from 'next/server';
import { getSessionToken } from '@/lib/session';

const GRAPHQL_URL = process.env.API_INTERNAL_URL ?? 'http://127.0.0.1:8180/graphql';

const UPDATE_PROFILE_MUTATION = `
  mutation UpdateMyProfile($input: UpdateProfileInput!) {
    updateMyProfile(input: $input) { id email firstName lastName phone roles hotelIds }
  }
`;

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
  const res = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({
      query: UPDATE_PROFILE_MUTATION,
      variables: {
        input: {
          firstName: input.firstName ?? null,
          lastName: input.lastName ?? null,
          phone: input.phone ?? null,
        },
      },
    }),
    cache: 'no-store',
  });
  const payload = (await res.json()) as {
    data?: { updateMyProfile?: unknown };
    errors?: Array<{ message: string }>;
  };
  if (payload.errors?.length) {
    return NextResponse.json({ error: payload.errors[0]!.message }, { status: 400 });
  }
  return NextResponse.json({ me: payload.data?.updateMyProfile ?? null });
}
