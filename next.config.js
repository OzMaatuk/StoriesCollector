/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Disable Pages Router error page fallbacks
  useFileSystemPublicRoutes: true,
  // Disable static optimization to prevent client hooks during prerender
  experimental: {
    optimizeCss: false,
  },
  // Disable static generation for all routes
  staticPageGenerationTimeout: 0,
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
