import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['catalog/**/*.json'],
      manifest: {
        name: 'Missing Vowel',
        short_name: 'MissingVowel',
        description: 'A vowel restoration puzzle game',
        theme_color: '#4A90E2',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,json}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\/catalog\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'puzzle-catalog',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 1 week
              },
            },
          },
        ],
      },
    }),
  ],
  base: '/mvow/',
  build: {
    outDir: 'dist',
  },
});
