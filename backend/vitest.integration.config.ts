import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.integration.test.ts'],
    // Populated into process.env before the app module graph loads, so
    // config/env.ts picks these up. Keeps webhook-guarded routes testable.
    env: {
      WEBHOOK_SECRET: 'test-webhook-secret',
    },
    pool: 'forks',
    poolOptions: {
      forks: { singleFork: true },
    },
    setupFiles: ['src/test/integration-setup.ts'],
    testTimeout: 15000,
    hookTimeout: 15000,
  },
});
