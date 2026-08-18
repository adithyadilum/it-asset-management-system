import type { NextConfig } from 'next';

import './src/lib/env';

const isProduction = process.env.NODE_ENV === 'production';
const applicationUrl = new URL(
  process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
);
const serverActionOrigins = isProduction
  ? [applicationUrl.host]
  : [applicationUrl.host, 'localhost:3000', '127.0.0.1:3000'];
const scriptSource = isProduction
  ? "script-src 'self' 'unsafe-inline'"
  : "script-src 'self' 'unsafe-inline' 'unsafe-eval'";

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  scriptSource,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https: wss:",
  "worker-src 'self' blob:",
  ...(isProduction ? ['upgrade-insecure-requests'] : []),
].join('; ');

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  allowedDevOrigins: isProduction ? [] : ['localhost:3000', '127.0.0.1'],
  reactCompiler: true,
  cacheComponents: true,
  experimental: {
    instantNavigationDevToolsToggle: true,
    serverActions: {
      bodySizeLimit: '5mb',
      allowedOrigins: serverActionOrigins,
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
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: contentSecurityPolicy },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(), geolocation=()',
          },
          ...(isProduction
            ? [
                {
                  key: 'Strict-Transport-Security',
                  value: 'max-age=63072000; includeSubDomains; preload',
                },
              ]
            : []),
        ],
      },
    ];
  },
};
export default nextConfig;
