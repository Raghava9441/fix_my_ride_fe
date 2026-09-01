import path from 'node:path'
import { defineConfig } from 'vitest/config'

/**
 * Separate from vite.config.ts so the app build never loads test-only
 * plugins or the jsdom environment.
 */
export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    // The API tests drive fake timers and abort signals; isolating files
    // keeps module-level state (the retry budget, the deduplicator) from
    // leaking between them.
    isolate: true,
    env: {
      VITE_API_URL: 'http://api.test/api/v1',
    },
  },
})
