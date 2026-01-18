/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_STASH_WEBHOOK_URL: process.env.NEXT_PUBLIC_STASH_WEBHOOK_URL || 'https://hook.eu1.make.com/gsova3xd6kwrckiw3j5js2twfgu1i885',
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







