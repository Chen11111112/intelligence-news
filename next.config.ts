const authUrl =
  process.env.AUTH_URL ??
  process.env.NEXTAUTH_URL ??
  (process.env.NODE_ENV === 'production'
    ? 'https://intelligence-news.ntubimdbirc.tw'
    : undefined);

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(authUrl
    ? {
        env: {
          AUTH_URL: authUrl,
          NEXTAUTH_URL: authUrl,
        },
      }
    : {}),
  experimental: {
    serverActions: {
      allowedOrigins: [
        'https://news-app-two-navy.vercel.app',
        'https://intelligence-news.ntubimdbirc.tw',
        'http://localhost:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001',
      ],
    },
  },
  images: {
    qualities: [75, 90],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.theconversation.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.theconversation.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
