import { NextResponse } from 'next/server';
import { getSessionToken } from '@/lib/session';
import { serverRequest } from '@/lib/api';
import { MeDocument } from '@/graphql/generated/graphql';

export async function GET(): Promise<NextResponse> {
  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const data = await serverRequest(MeDocument, {}, token);
    return NextResponse.json({ me: data.me });
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
}
