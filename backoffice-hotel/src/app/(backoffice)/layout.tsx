import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { getSessionToken } from '@/lib/session';
import { serverRequest } from '@/lib/api';
import { MeDocument, type MeQuery } from '@/graphql/generated/graphql';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { HotelScopeProvider } from '@/context/HotelScopeContext';

export default async function BackofficeLayout({ children }: { children: ReactNode }) {
  const token = await getSessionToken();
  if (!token) redirect('/login');

  let me: MeQuery['me'];
  try {
    me = (await serverRequest(MeDocument, {}, token)).me;
  } catch {
    redirect('/login');
  }
  if (me.roles.length === 0) redirect('/login');

  return (
    <HotelScopeProvider>
      <div className="flex min-h-screen bg-paper">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main className="flex-1 px-6 py-6">{children}</main>
        </div>
      </div>
    </HotelScopeProvider>
  );
}