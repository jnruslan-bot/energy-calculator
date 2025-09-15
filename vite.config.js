import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/energy-calculator/',   // имя твоего репозитория
  plugins: [react()],
})
