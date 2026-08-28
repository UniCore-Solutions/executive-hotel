import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { SessionProvider } from '@/context/SessionContext';
import { QueryProvider } from '@/context/QueryProvider';
import { ApolloProvider } from '@/api/apollo/provider';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Executive Hotel — Back Office',
    template: '%s — Back Office',
  },
  description: 'Executive Hotel back office: hotels, reservations, guests and operations.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" className={inter.variable}>
      <body className="bg-paper text-ink font-sans antialiased">
        <SessionProvider>
          <ApolloProvider>
            <QueryProvider>{children}</QueryProvider>
          </ApolloProvider>
        </SessionProvider>
      </body>
    </html>
  );
}