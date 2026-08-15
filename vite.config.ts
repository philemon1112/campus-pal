import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'icon-maskable-src.svg'],
      manifest: {
        name: 'CampusPal — University of Ghana, Legon',
        short_name: 'CampusPal',
        description:
          'Find your way around University of Ghana, Legon — campus locations, directions and food joints, with an assistant that can do it for you.',
        theme_color: '#c2410c',
        background_color: '#f6f7fb',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // SPA client-side routing: serve the cached shell for any
        // navigation that isn't a real asset, but never for API traffic —
        // that must always hit the live network, not a cached HTML
        // fallback.
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  optimizeDeps: {
    // MapLibre parses vector tiles in a Web Worker it spawns by URL. Vite's
    // dep pre-bundling rewrites that URL to
    // /node_modules/.vite/deps/maplibre-gl-worker.mjs, which fails to load
    // (net::ERR_FAILED). The failure is silent in the worst way: the style,
    // sprites and raster tiles all load fine over HTTP on the main thread,
    // so the map looks alive — but no .pbf is ever requested, so it renders
    // as an empty background with markers floating on it.
    // Excluding it from pre-bundling lets the worker resolve from the real
    // package path. Dev-only concern; the production build emits the worker
    // as a normal asset.
    exclude: ['maplibre-gl'],
  },
  server: {
    // The live API (see .env.example) sends no CORS headers, so the
    // browser can't call it directly in dev. Proxying server-to-server
    // here sidesteps that for local development only — it does NOT fix
    // the underlying issue for a production build, which needs either
    // CORS on the backend or a same-origin reverse proxy in front of
    // both apps. See docs/API_REQUIREMENTS.md §D.
    proxy: {
      '/api': {
        target: 'https://tms-api-m7yf.onrender.com',
        changeOrigin: true,
      },
    },
  },
})
