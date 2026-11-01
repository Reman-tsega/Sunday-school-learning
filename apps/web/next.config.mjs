// Backend origin (no /api suffix). Set API_ORIGIN on Vercel to your Render URL.
const apiOrigin = (process.env.API_ORIGIN || 'http://localhost:4000').replace(/\/+$/, '');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@eotc/shared'],
  env: {
    // Always defined so the build inlines it and drops the sample-login credentials unless set to 'true'
    NEXT_PUBLIC_SHOW_DEMO_LOGINS: process.env.NEXT_PUBLIC_SHOW_DEMO_LOGINS === 'true' ? 'true' : 'false',
  },
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: `${apiOrigin}/uploads/:path*`,
      },
      {
        source: '/api/:path*',
        destination: `${apiOrigin}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
