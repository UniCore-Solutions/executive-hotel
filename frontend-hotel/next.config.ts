import type { NextConfig } from 'next';

const IMG_HOSTS = ['cf.bstatic.com', 'aw-d.tripcdn.com', 'images.unsplash.com'];
const API_ORIGIN = 'http://localhost:8180';
// Same-origin browser calls to /graphql are proxied to the backend by the
// rewrite below; the target must be resolvable from the Next.js server.
const BACKEND_INTERNAL = process.env.API_INTERNAL_URL ?? 'http://127.0.0.1:8180';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  poweredByHeader: false,
  images: {
    remotePatterns: [
      ...IMG_HOSTS.map((hostname) => ({ protocol: 'https' as const, hostname })),
      { protocol: 'http', hostname: 'localhost', port: '8180' },
    ],
  },
  async rewrites() {
    return [{ source: '/graphql', destination: `${BACKEND_INTERNAL}/graphql` }];
  },
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
              `img-src 'self' data: ${IMG_HOSTS.map((h) => `https://${h}`).join(' ')} ${API_ORIGIN}`,
              "font-src 'self' data:",
              `connect-src 'self' ${API_ORIGIN}`,
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
