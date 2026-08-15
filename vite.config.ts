import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const API_TARGET = 'https://tms-api-m7yf.onrender.com'

// MapLibre resolves its Web Worker at RUNTIME, not at build time:
//
//   const name = url.endsWith('-dev.mjs') ? 'maplibre-gl-worker-dev.mjs'
//                                         : 'maplibre-gl-worker.mjs'
//   return new URL(`./${name}`, import.meta.url).href
//
// The interpolated name defeats static analysis, so no bundler can see the
// dependency and the worker is never emitted. The built chunk then asks for
// /assets/maplibre-gl-worker.mjs, gets a 404, and the map fails in its most
// misleading way: style, sprites and controls all load, so the frame looks
// alive while fetching zero vector tiles.
//
// Copying the prebuilt worker (and the shared chunk it imports) next to the
// bundle is what makes the runtime URL resolve. Build-only — dev is served
// from node_modules and is handled by optimizeDeps.exclude below.
function maplibreWorker(): Plugin {
  const require = createRequire(import.meta.url)
  const files = ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']

  return {
    name: 'campuspal:maplibre-worker',
    apply: 'build',
    generateBundle() {
      const dist = path.dirname(require.resolve('maplibre-gl/dist/maplibre-gl.mjs'))
      for (const file of files) {
        this.emitFile({
          type: 'asset',
          // Not hashed: the runtime URL above is built from this exact name.
          fileName: `assets/${file}`,
          source: fs.readFileSync(path.join(dist, file), 'utf8'),
        })
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    maplibreWorker(),
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
  // The API sends no CORS headers, so the browser can't call it directly
  // from any origin. Every environment proxies `/api` server-to-server
  // instead, and the client asks its own origin (src/lib/api/client.ts):
  // this for dev and preview, vercel.json `rewrites` in production. Keep
  // the three in step — a change here that isn't mirrored in vercel.json
  // works locally and 404s on the deployment.
  server: {
    proxy: {
      '/api': { target: API_TARGET, changeOrigin: true },
    },
  },
  // `vite preview` serves the real production bundle, so this is where a
  // deployment problem can be reproduced locally before pushing.
  preview: {
    proxy: {
      '/api': { target: API_TARGET, changeOrigin: true },
    },
  },
})
