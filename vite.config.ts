import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // The bundle is inherently chunky: three.js plus a 750 kB world map that
    // every screen needs. It gzips to well under a megabyte and there is
    // nothing to defer, so the default 500 kB warning is just noise here.
    chunkSizeWarningLimit: 2500,
  },
})
