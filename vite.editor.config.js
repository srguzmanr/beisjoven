/**
 * Vite config for bundling the Tiptap editor into a single IIFE file.
 * Output: public/js/tiptap-editor.js
 *
 * Run: npx vite build --config vite.editor.config.js
 */
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  publicDir: false,
  build: {
    lib: {
      entry: resolve(__dirname, 'src/admin/tiptap-editor.js'),
      name: 'TiptapEditor',
      formats: ['iife'],
      fileName: () => 'tiptap-editor.js',
    },
    outDir: 'public/js',
    emptyOutDir: false,
    minify: 'esbuild',
    sourcemap: false,
  },
});
