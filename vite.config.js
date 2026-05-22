import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'Daily Planner',
        short_name: 'Planner',
        description: 'Penjadwalan harian dengan notifikasi pintar',
        theme_color: '#818cf8',
        background_color: '#0d1117',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ],
        screenshots: [
          {
            src: 'screenshot-mobile.png',
            sizes: '390x844',
            type: 'image/png',
            form_factor: 'narrow'
          }
        ]
      },
      workbox: {
        // Cache semua asset agar app bisa dipakai offline
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            // Cache API calls ke Google Calendar (fase 3)
            urlPattern: /^https:\/\/www\.googleapis\.com\/calendar/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'google-calendar-api',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 50, maxAgeSeconds: 300 }
            }
          }
        ]
      },
      // Aktifkan push notification via service worker
      devOptions: { enabled: true }
    })
  ]
})
