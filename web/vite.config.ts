import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        // Keep the chunk graph predictable: one framework chunk, and a few domain
        // chunks for the heavier UI, data, and animation libraries.
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined
          }

          if (id.includes('react-router-dom') || id.includes('react-dom') || /node_modules\/react\//.test(id)) {
            return 'vendor-react'
          }

          if (id.includes('framer-motion')) {
            return 'vendor-motion'
          }

          if (
            id.includes('@tanstack/react-query')
            || id.includes('axios')
            || id.includes('react-hook-form')
            || id.includes('@hookform/resolvers')
            || id.includes('zod')
          ) {
            return 'vendor-data'
          }

          if (
            id.includes('lucide-react')
            || id.includes('react-easy-crop')
            || id.includes('radix-ui')
            || id.includes('clsx')
            || id.includes('tailwind-merge')
            || id.includes('class-variance-authority')
          ) {
            return 'vendor-ui'
          }

          return 'vendor-misc'
        },
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../shared'),
    },
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
  },
  server: {
    host: true,
    port: 5173,
    watch: {
      usePolling: true,
    },
  },
})
