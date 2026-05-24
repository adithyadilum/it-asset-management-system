/** @type {import('next').NextConfig} */
const nextConfig = {
  // Add your ngrok URL and local IP here (DO NOT include https://)
  allowedDevOrigins: [
    '74d9-123-231-126-130.ngrok-free.app',
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

export default nextConfig;
