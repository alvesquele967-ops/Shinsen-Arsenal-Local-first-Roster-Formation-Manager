import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { handleQookkaSnapshot } from './src/server/qookkaProxy'
import { handlePortrait } from './src/server/portraitProxy'

function localDevApi(): Plugin {
  return {
    name: 'shinsen-local-api',
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const requestPath = request.url ? new URL(request.url, 'http://localhost').pathname : ''
        if (requestPath !== '/api/qookka-snapshot' && requestPath !== '/api/portrait') return next()
        const origin = `http://${request.headers.host ?? '127.0.0.1'}`
        const apiRequest = new Request(new URL(request.url!, origin), { method: request.method })
        const apiResponse = requestPath === '/api/portrait'
          ? await handlePortrait(apiRequest)
          : await handleQookkaSnapshot(apiRequest)
        response.statusCode = apiResponse.status
        apiResponse.headers.forEach((value, key) => response.setHeader(key, value))
        response.end(Buffer.from(await apiResponse.arrayBuffer()))
      })
    },
  }
}

export default defineConfig({
  plugins: [
    localDevApi(),
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'icon-192.png', 'icon-512.png', 'og.png'],
      manifest: {
        name: '真戦武将帳 — Shinsen Arsenal',
        short_name: '真戦武将帳',
        description: '『信長の野望 真戦』の所持武将管理・兵器部隊編成ツール',
        lang: 'ja',
        start_url: '/',
        display: 'standalone',
        background_color: '#0d1513',
        theme_color: '#b89b55',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,json,png,webp,woff2}'],
        runtimeCaching: [{
          urlPattern: /^https:\/\/img\.game8\.jp\//,
          handler: 'CacheFirst',
          options: {
            cacheName: 'shinsen-portraits-v1',
            expiration: { maxEntries: 180, maxAgeSeconds: 60 * 60 * 24 * 90 },
            cacheableResponse: { statuses: [0, 200] },
          },
        }],
      },
    }),
  ],
  build: { target: 'es2022' },
})
