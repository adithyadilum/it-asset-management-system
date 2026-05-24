import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

// 1. Initialize the Serwist plugin
const withSerwist = withSerwistInit({
  // Points to your raw TypeScript file
  swSrc: "src/app/sw.ts", 
  // Where Serwist will output the compiled JS file for the browser
  swDest: "public/sw.js", 
  // Disables service worker in local dev so it doesn't cache your hot-reloads
  disable: process.env.NODE_ENV === "development", 
});

// 2. Your existing config (keep all your allowedDevOrigins!)
const nextConfig: NextConfig = {
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

// 3. Export the wrapped config
export default withSerwist(nextConfig);