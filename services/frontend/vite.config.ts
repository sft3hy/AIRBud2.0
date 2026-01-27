// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from "path"

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // <--- Add this
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: true,
    strictPort: true,
    port: 5173,
    // Allow this host (your ELB hostname)
    allowedHosts: [
      'localhost',
      'smart-rag-frontend',
      'test-cosmichorizon-worker-68a3110f01feebd0.elb.us-gov-west-1.amazonaws.com'
    ],
    proxy: {
      '/static': {
        target: process.env.VITE_API_URL || 'http://localhost:8000',
        changeOrigin: true,
      },
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      }
    }
  },
})