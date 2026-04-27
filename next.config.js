const withPWA = require("next-pwa")({
  dest: "public",
  customWorkerDir: "worker",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/fonts\.(?:gstatic)\.com\/.*/i,
      handler: "CacheFirst",
      options: {
        cacheName: "google-fonts-webfonts",
        expiration: {
          maxEntries: 8,
          maxAgeSeconds: 60 * 60 * 24 * 365,
        },
      },
    },
    {
      urlPattern: /^https:\/\/fonts\.(?:googleapis)\.com\/.*/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "google-fonts-stylesheets",
        expiration: {
          maxEntries: 8,
          maxAgeSeconds: 60 * 60 * 24 * 7,
        },
      },
    },
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
      handler: "NetworkFirst",
      options: {
        cacheName: "supabase-api",
        networkTimeoutSeconds: 5,
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 60 * 5,
        },
      },
    },
  ],
  fallbacks: {
    document: "/offline.html",
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

module.exports = withPWA(nextConfig);
