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







