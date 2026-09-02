import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  poweredByHeader: false,
  async headers() {
    const devEval = process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : '';
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              `script-src 'self' 'unsafe-inline'${devEval}`,
              "style-src 'self' 'unsafe-inline'",
              // images.unsplash.com: seed/demo media (hotel + room type
              // galleries) is seeded with Unsplash URLs — without this the
              // CSP silently blocks every seeded photo (found while
              // screenshot-testing the new hotel Settings > Media tab, but
              // it equally affects the pre-existing Room Type gallery).
              "img-src 'self' data: http://localhost:8180 http://backend:8180 https://images.unsplash.com",
              "font-src 'self' data:",
              "connect-src 'self'",
              "object-src 'none'",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
