import { defineConfig } from 'vitest/config';
import TestDriver from 'testdriverai/vitest';

// Dedicated Vitest configuration for TestDriver.ai browser tests
export default defineConfig({
  test: {
    testTimeout: 300000,
    hookTimeout: 300000,
    reporters: [
      'default',
      TestDriver(),
    ],
    setupFiles: ['testdriverai/vitest/setup'],
    include: ['tests/landing-page.test.js'],
  },
});
