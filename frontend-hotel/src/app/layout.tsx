import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import { Cormorant_Garamond, Fraunces, Inter } from 'next/font/google';
import { SearchProvider } from '@/context/SearchContext';
import { ToastProvider } from '@/context/ToastContext';
import { ModalProvider } from '@/context/ModalContext';
import { SessionProvider } from '@/context/SessionContext';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SearchSheet from '@/components/layout/SearchSheet';
import MobileBottomBar from '@/components/layout/MobileBottomBar';
import ConsentManager from '@/components/layout/ConsentManager';
import { getPlatformContent } from '@/services/platform';
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
  style: ['normal', 'italic'],
  variable: '--font-fraunces',
  display: 'swap',
});

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['500', '600'],
  style: ['italic'],
  variable: '--font-cormorant',
  display: 'swap',
});

export const metadata: Metadata = {
  /* Every page sets its full <title> exactly as the reference does — no template. */
  title: 'Executive Boutique Hotel Rabat — 4★ in the Agdal district',
  description:
    'Executive Boutique Hotel Rabat — 4-star rooms with free Wi-Fi in the Agdal district, a restaurant serving French, Mediterranean and Moroccan cuisine, a free buffet breakfast and free private parking.',
  keywords: [
    'boutique hotel Rabat',
    'Executive Boutique Hotel',
    'hotel Rabat Morocco',
    'Agdal Rabat',
    'hotel Agdal',
    '4 star hotel Rabat',
    'Executive Boutique Hotel Rabat',
  ],
  openGraph: {
    title: 'Executive Boutique Hotel Rabat — Agdal',
    description:
      "4-star comfort in Rabat's Agdal district — free Wi-Fi, free parking, a restaurant serving French, Mediterranean and Moroccan cuisine, and a free buffet breakfast.",
    type: 'website',
    locale: 'en_US',
    siteName: 'Executive Boutique Hotel Rabat',
  },
};

export const viewport: Viewport = {
  themeColor: '#0d1c29',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Hotel',
  name: 'Executive Boutique Hotel Rabat',
  address: { '@type': 'PostalAddress', addressLocality: 'Rabat', addressCountry: 'MA' },
  starRating: { '@type': 'Rating', ratingValue: '4' },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const platform = await getPlatformContent();
  return (
    <html
      lang="en"
      dir="ltr"
      className={`${inter.variable} ${fraunces.variable} ${cormorant.variable}`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="bg-paper text-ink font-sans antialiased">
        <SessionProvider>
          <SearchProvider>
            <ToastProvider>
              <ModalProvider>
                <Header platform={platform.identity} />
                <main>{children}</main>
                <Footer platform={platform.identity} />
                <SearchSheet />
                <Suspense fallback={null}>
                  <MobileBottomBar />
                </Suspense>
                <ConsentManager />
              </ModalProvider>
            </ToastProvider>
          </SearchProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
