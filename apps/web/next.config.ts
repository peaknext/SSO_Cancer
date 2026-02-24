import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  output: 'standalone',
  // Point to monorepo root for proper dependency tracing
  outputFileTracingRoot: path.join(__dirname, '../../'),
  eslint: {
    // ESLint linting is handled separately via `npm run lint`
    ignoreDuringBuilds: true,
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
