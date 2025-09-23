// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Плагин: убираем '?v=123...' из исходников, HTML и имён файлов бандла
const stripVersionQuery = {
  name: "strip-version-query",
  enforce: "post",

  transform(code) {
    return code.replace(/\?v=\d+/g, "");
  },

  transformIndexHtml(html) {
    return html.replace(/\?v=\d+/g, "");
  },

  generateBundle(_options, bundle) {
    for (const [oldName, chunk] of Object.entries(bundle)) {
      const newName = oldName.replace(/\?v=\d+/g, "");
      if (newName !== oldName) {
        chunk.fileName = chunk.fileName.replace(/\?v=\d+/g, "");
        if (typeof chunk.code === "string") chunk.code = chunk.code.replace(/\?v=\d+/g, "");
        if (typeof chunk.source === "string") chunk.source = chunk.source.replace(/\?v=\d+/g, "");
        bundle[newName] = chunk;
        delete bundle[oldName];
      } else {
        if (typeof chunk.code === "string") chunk.code = chunk.code.replace(/\?v=\d+/g, "");
        if (typeof chunk.source === "string") chunk.source = chunk.source.replace(/\?v=\d+/g, "");
      }
    }
  },
};

export default defineConfig({
  base: "/energy-calculator/",        // для GitHub Pages
  plugins: [react(), stripVersionQuery],
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        entryFileNames: "assets/[name]-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
});
