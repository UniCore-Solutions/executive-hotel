import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import { Fraunces, Inter } from 'next/font/google';
import { SearchProvider } from '@/context/SearchContext';
import { ToastProvider } from '@/context/ToastContext';
import { ModalProvider } from '@/context/ModalContext';
import { SessionProvider } from '@/context/SessionContext';
import { ApolloProvider } from '@/api/apollo/provider';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SearchSheet from '@/components/layout/SearchSheet';
import MobileBottomBar from '@/components/layout/MobileBottomBar';
import ConsentManager from '@/components/layout/ConsentManager';
import { getPlatformContent } from '@/services/platform';
import { getCanonicalHotel } from '@/services/canonicalHotel';
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

export const viewport: Viewport = {
  themeColor: '#0d1c29',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

/* Neutral fallback for a total backend outage — the running identity always
   comes from the canonical hotel record, never from this constant. */
const FALLBACK_IDENTITY = {
  name: 'Executive Hotel',
  city: 'Lisbon',
  description:
    'Executive Hotel \u2014 a four-star seaside hotel on Lisbon\u2019s Marina. Sunlit rooms with sea views, a rooftop seafood restaurant and a saltwater pool. Book direct for live availability.',
};

export async function generateMetadata(): Promise<Metadata> {
  const hotel = await getCanonicalHotel().catch(() => null);
  const name = hotel?.name ?? FALLBACK_IDENTITY.name;
  const city = hotel?.city ?? FALLBACK_IDENTITY.city;
  const description = hotel?.description ?? FALLBACK_IDENTITY.description;
  return {
    title: `${name} \u2014 rooms & availability`,
    description,
    keywords: [name, `hotel ${city}`, `${city} hotel`],
    openGraph: {
      title: `${name} \u2014 ${city}`,
      description,
      type: 'website',
      locale: 'en_US',
      siteName: name,
    },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [platform, hotel] = await Promise.all([
    getPlatformContent(),
    getCanonicalHotel().catch(() => null),
  ]);
  const jsonLd = hotel
    ? {
        '@context': 'https://schema.org',
        '@type': 'Hotel',
        name: hotel.name,
        address: {
          '@type': 'PostalAddress',
          streetAddress: [hotel.addressLine1, hotel.addressLine2].filter(Boolean).join(', '),
          addressLocality: hotel.city,
          addressCountry: hotel.countryCode,
        },
        ...(hotel.starRating
          ? { starRating: { '@type': 'Rating', ratingValue: String(hotel.starRating) } }
          : {}),
      }
    : null;
  return (
    <html
      lang="en"
      dir="ltr"
      className={`${inter.variable} ${fraunces.variable}`}
    >
      <head>
        {jsonLd ? (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />
        ) : null}
      </head>
      <body className="bg-paper text-ink font-sans antialiased">
        <SessionProvider>
          <ApolloProvider>
            <SearchProvider>
              <ToastProvider>
                <ModalProvider>
                  <Header platform={platform.identity} hotel={hotel} />
                  <main>{children}</main>
                  <Footer platform={platform.identity} hotel={hotel} />
                  <SearchSheet />
                  <Suspense fallback={null}>
                    <MobileBottomBar />
                  </Suspense>
                  <ConsentManager />
                </ModalProvider>
              </ToastProvider>
            </SearchProvider>
          </ApolloProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
