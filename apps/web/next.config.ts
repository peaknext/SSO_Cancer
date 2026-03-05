import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  output: 'standalone',
  // Fix: /_not-found prerender fails with workUnitAsyncStorage error on Windows Server.
  // Worker threads don't inherit AsyncLocalStorage context properly.
  experimental: {
    workerThreads: false,
    cpus: 1,
  },
  // Point to monorepo root for proper dependency tracing
  outputFileTracingRoot: path.join(__dirname, '../../'),
  eslint: {
    // ESLint linting is handled separately via `npm run lint`
    ignoreDuringBuilds: true,
  },
  async headers() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
    const connectSrc = apiUrl ? `'self' ${apiUrl}` : `'self'`;
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com; connect-src ${connectSrc}; frame-ancestors 'none'`,
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
  async rewrites() {
    // API_INTERNAL_URL is for server-side proxy (Docker: http://api:4000)
    // Falls back to localhost dev port for local development
    const apiUrl = process.env.API_INTERNAL_URL || 'http://localhost:48002';
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
