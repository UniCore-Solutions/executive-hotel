import type { Metadata, Viewport } from 'next';
import { Fraunces, Inter } from 'next/font/google';
import { SessionProvider } from '@/context/SessionContext';
import { QueryProvider } from '@/context/QueryProvider';
import { ToastProvider } from '@/context/ToastContext';
import { ApolloProvider } from '@/api/apollo/provider';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  axes: ['opsz', 'SOFT', 'WONK'],
  style: ['normal'],
  variable: '--font-fraunces',
  display: 'swap',
});

export const viewport: Viewport = {
  themeColor: '#0d1c29',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: 'Executive Hotel — Admin',
    template: '%s — Admin · Executive Hotel',
  },
  description: 'Executive Hotel admin console: reservations, inventory, rates and operations.',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" className={`${inter.variable} ${fraunces.variable}`}>
      <body className="bg-paper text-ink font-sans antialiased">
        <SessionProvider>
          <ApolloProvider>
            <QueryProvider>
              <ToastProvider>{children}</ToastProvider>
            </QueryProvider>
          </ApolloProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
