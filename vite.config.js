import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Получаем метку времени (версия билда)
const version = new Date().getTime();

export default defineConfig({
  base: "/energy-calculator/",
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name].[hash].js?v=${version}`,
        chunkFileNames: `assets/[name].[hash].js?v=${version}`,
        assetFileNames: `assets/[name].[hash].[ext]?v=${version}`,
      },
    },
  },
});
