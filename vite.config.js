// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // обязательно с косой чертой в начале и в конце:
  base: '/energy-calculator/',
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        // у Vite/Rollup здесь используется [extname], а не [ext]
        assetFileNames: 'assets/[name].[hash][extname]'
      }
    }
  }
})
