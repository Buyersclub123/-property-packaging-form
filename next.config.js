/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  env: {
    NEXT_PUBLIC_STASH_WEBHOOK_URL: process.env.NEXT_PUBLIC_STASH_WEBHOOK_URL,
  },
  // Tools under New Initiatives live at /team/resources/new-initiatives/<tool> (URL = menu hierarchy, JT 5/11).
  // Pages stay at their internal routes; the public paths rewrite to them and the old flat paths redirect.
  async rewrites() {
    return [
      { source: '/team/resources/new-initiatives', destination: '/new-initiatives' },
      { source: '/team/resources/new-initiatives/guide', destination: '/guide/index.html' },
      { source: '/team/resources/new-initiatives/journey', destination: '/journey' },
      { source: '/team/resources/new-initiatives/journey/:path*', destination: '/journey/:path*' },
      { source: '/team/sales/review-outcomes', destination: '/review-outcomes' },
      { source: '/team/sales/review-outcomes/:path*', destination: '/review-outcomes/:path*' },
      { source: '/team/resources/new-initiatives/portfolio', destination: '/portfolio' },
      { source: '/team/resources/new-initiatives/portfolio/:path*', destination: '/portfolio/:path*' },
      { source: '/team/resources/new-initiatives/inbox-mining', destination: '/inbox-mining' },
      { source: '/team/resources/new-initiatives/inbox-mining/:path*', destination: '/inbox-mining/:path*' },
      { source: '/team/resources/new-initiatives/purchase-analytics', destination: '/team/research/purchase-analytics' },
      { source: '/team/resources/new-initiatives/purchase-analytics/:path*', destination: '/team/research/purchase-analytics/:path*' },
    ];
  },
  async redirects() {
    return [
      { source: '/new-initiatives', destination: '/team/resources/new-initiatives', permanent: false },
      { source: '/guide', destination: '/team/resources/new-initiatives/guide', permanent: false },
      { source: '/journey', destination: '/team/resources/new-initiatives/journey', permanent: false },
      { source: '/review-outcomes', destination: '/team/sales/review-outcomes', permanent: false },
      { source: '/team/resources/new-initiatives/review-outcomes', destination: '/team/sales/review-outcomes', permanent: false },
      { source: '/team/resources/new-initiatives/review-outcomes/:path*', destination: '/team/sales/review-outcomes/:path*', permanent: false },
      { source: '/portfolio', destination: '/team/resources/new-initiatives/portfolio', permanent: false },
      { source: '/inbox-mining', destination: '/team/resources/new-initiatives/inbox-mining', permanent: false },
      { source: '/inbox-mining/:path*', destination: '/team/resources/new-initiatives/inbox-mining/:path*', permanent: false },
      { source: '/team/research/purchase-analytics', destination: '/team/resources/new-initiatives/purchase-analytics', permanent: false },
    ];
  },
  experimental: {
    outputFileTracingIncludes: {
      '/api/purchase-analytics/data/[file]': ['./data/purchase-analytics/*.csv'],
    },
  },
  // Improve chunk loading reliability
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Better chunk loading error handling - deterministic IDs help prevent chunk mismatches
      config.optimization = {
        ...config.optimization,
        moduleIds: 'deterministic',
        chunkIds: 'deterministic',
      };
    }
    return config;
  },
}

module.exports = nextConfig







