import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // TradingView news sends no CORS headers, so dev requests go through here
      '/tv-news': {
        target: 'https://news-mediator.tradingview.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/tv-news/, ''),
      },
    },
  },
  build: {
    rollupOptions: {
      input: { main: 'index.html', stock: 'stock-event.html' },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
  },
})
