import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/main.tsx', 'src/**/*.d.ts', 'src/test/**'],
    },
  },
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify('/api'),
    // Pin to the default (multi-tenant) build so tests don't inherit a developer's
    // local VITE_TENANT_SLUG from .env. Single-tenant behaviour is tested explicitly.
    'import.meta.env.VITE_TENANT_SLUG': JSON.stringify('ACURIA'),
  },
});
