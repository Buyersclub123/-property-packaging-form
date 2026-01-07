/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_STASH_WEBHOOK_URL: process.env.NEXT_PUBLIC_STASH_WEBHOOK_URL || 'https://hook.eu1.make.com/gsova3xd6kwrckiw3j5js2twfgu1i885',
  },
}

module.exports = nextConfig







