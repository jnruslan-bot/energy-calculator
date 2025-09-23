// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

<<<<<<< HEAD
=======
// Плагин: убираем '?v=123...' из кода/HTML, и главное — из ИМЕН ФАЙЛОВ в бандле.
const stripVersionQuery = {
  name: "strip-version-query",
  enforce: "post",

  // чистим любые вхождения в исходниках
  transform(code) {
    return code.replace(/\?v=\d+/g, "");
  },

  // чистим index.html
  transformIndexHtml(html) {
    return html.replace(/\?v=\d+/g, "");
  },

  // самое важное: переименовываем ассеты/чанки, если в имени затесался '?v='
  generateBundle(_options, bundle) {
    for (const [oldName, chunk] of Object.entries(bundle)) {
      const newName = oldName.replace(/\?v=\d+/g, "");
      if (newName !== oldName) {
        // правим имя файла (fileName) и переносим в bundle под новым ключом
        chunk.fileName = chunk.fileName.replace(/\?v=\d+/g, "");
        // на всякий случай чистим содержимое
        if (typeof chunk.code === "string") chunk.code = chunk.code.replace(/\?v=\d+/g, "");
        if (typeof chunk.source === "string") chunk.source = chunk.source.replace(/\?v=\d+/g, "");

        bundle[newName] = chunk;
        delete bundle[oldName];
      } else {
        // даже если имя нормальное — подчистим содержимое
        if (typeof chunk.code === "string") chunk.code = chunk.code.replace(/\?v=\d+/g, "");
        if (typeof chunk.source === "string") chunk.source = chunk.source.replace(/\?v=\d+/g, "");
      }
    }
  },
};

>>>>>>> 1241b97 (chore: локальные правки перед rebase)
export default defineConfig({
  // для GitHub Pages (имя репозитория)
  base: "/energy-calculator/",
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
