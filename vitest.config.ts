import { defineConfig } from 'vitest/config'

// Eigene Config, damit das TanStack-Start-Plugin aus vite.config.ts nicht in
// die Tests greift. Alle Tests teilen sich ein frisch gestartetes PocketBase
// (tests/pocketbase.global.ts) und legen ihre Testdaten selbst an.
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globalSetup: ['tests/pocketbase.global.ts'],
    testTimeout: 15_000,
    hookTimeout: 60_000,
  },
})
