import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    pool: 'forks',
    testTimeout: 30000,
    hookTimeout: 30000,
  },
  resolve: {
    alias: {
      '@app/types': path.resolve(__dirname, './packages/types/src'),
      '@app/crypto': path.resolve(__dirname, './packages/crypto/src'),
      '@app/database': path.resolve(__dirname, './packages/database/src'),
      '@app/ledger': path.resolve(__dirname, './packages/ledger/src'),
      '@app/inventory': path.resolve(__dirname, './packages/inventory/src'),
      '@app/payments': path.resolve(__dirname, './packages/payments/src'),
    },
  },
});
