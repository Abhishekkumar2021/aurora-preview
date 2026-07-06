import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  // Relative base so dynamically-imported chunks + font URLs resolve against the
  // webview's media/ directory (vscode-webview://…/media/…), not the host root.
  base: './',
  build: {
    outDir: 'media',
    emptyOutDir: true,
    // Fonts (e.g. KaTeX) are copied to media/assets/ with stable names so the
    // webview CSS (loaded via asWebviewUri) can resolve them; the single JS/CSS
    // entry stays at media/webview.{js,css}.
    assetsInlineLimit: 0,
    rollupOptions: {
      input: 'webview/index.html',
      output: {
        entryFileNames: 'webview.js',
        assetFileNames: (info) =>
          info.name && info.name.endsWith('.css')
            ? 'webview.css'
            : 'assets/[name][extname]',
      },
    },
  },
});
