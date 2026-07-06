import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { svelteTesting } from '@testing-library/svelte/vite';

export default defineConfig({
  test: {
    projects: [
      { test: { name: 'host', environment: 'node', include: ['src/**/*.test.ts'] } },
      {
        plugins: [svelte(), svelteTesting()],
        test: { name: 'webview', environment: 'jsdom', include: ['webview/**/*.test.ts'] },
      },
    ],
  },
});
