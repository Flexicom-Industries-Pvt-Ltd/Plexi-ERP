import "./src/env";
import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.DISABLE_PWA === "true",
  cacheOnFrontEndNav: false,
  aggressiveFrontEndNavCaching: false,
  workboxOptions: {
    navigateFallbackDenylist: [/^\/api/, /^\/auth/, /^\/dashboard/],
    runtimeCaching: [
      {
        urlPattern: /^\/api\/.*/i,
        handler: "NetworkOnly",
        options: {
          cacheName: "apis-network-only",
        },
      },
      {
        urlPattern: /^\/dashboard\/.*/i,
        handler: "NetworkOnly",
        options: {
          cacheName: "dashboard-network-only",
        },
      },
      {
        urlPattern: /^\/auth\/.*/i,
        handler: "NetworkOnly",
        options: {
          cacheName: "auth-network-only",
        },
      },
      {
        urlPattern: /\.(?:js|css|woff2?|png|jpg|jpeg|svg|gif|ico|webp)$/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "static-assets",
          expiration: {
            maxEntries: 64,
            maxAgeSeconds: 24 * 60 * 60,
          },
        },
      },
    ],
  },
});

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: ['ws'],
  turbopack: {},
  experimental: {
    workerThreads: false,
    cpus: 1,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' ws: wss: https:; frame-ancestors 'none';",
          },
        ],
      },
    ];
  },
};

export default withPWA(nextConfig);
