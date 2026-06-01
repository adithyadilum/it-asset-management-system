/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  // Add your ngrok URL and local IP here (DO NOT include https://)
  allowedDevOrigins: [
    'cadc-2402-4000-2110-33a2-68ce-638f-2f60-50e9.ngrok-free.app',
    '192.168.8.101',
    'localhost:3000',
  ],
  reactCompiler: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
      allowedOrigins: ['localhost:3000', '*.ngrok-free.app'],
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
};
module.exports = nextConfig;
