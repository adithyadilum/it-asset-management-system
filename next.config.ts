/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'llw1zknmbsssnl9d.public.blob.vercel-storage.com',
        port: '',
        pathname: '/**', // This allows all folders (like /models, /invoices)
      },
      {
        protocol: 'https',
        hostname: 'example.com',
        port: '',
        pathname: '/**', // This allows all folders (like /models, /invoices)
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/sw.ts',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/javascript; charset=utf-8',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          }
        ],
      },
    ];
  },
};

export default nextConfig;
