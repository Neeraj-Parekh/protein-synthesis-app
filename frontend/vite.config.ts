import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: 'localhost',
    hmr: {
      port: 5173,
      host: 'localhost',
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8001',  // Updated to match AI service port
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          three: ['three', '@react-three/fiber', '@react-three/drei'],
          mui: ['@mui/material', '@mui/icons-material'],
          redux: ['@reduxjs/toolkit', 'react-redux'],
          ngl: ['ngl'],
        },
      },
    },
  },
  optimizeDeps: {
    include: ['three', 'ngl', '@react-three/fiber', '@react-three/drei'],
    exclude: ['@types/three'], // Exclude types from optimization
  },
  resolve: {
    alias: {
      '@': '/src',
      '@/components': '/src/components',
      '@/types': '/src/types',
      '@/utils': '/src/utils',
      '@/services': '/src/services',
      '@/store': '/src/store',
    },
    dedupe: ['three', 'react', 'react-dom'], // Deduplicate these packages
  },
  // Handle service worker properly
  publicDir: 'public',
  assetsInclude: ['**/*.wasm', '**/*.pdb'],
})