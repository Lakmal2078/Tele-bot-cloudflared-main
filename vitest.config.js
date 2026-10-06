import { defineConfig } from 'vitest/config';

// Standard Vitest configuration for repository unit tests
export default defineConfig({
  test: {
    exclude: ['**/node_modules/**', '**/dist/**', 'tests/landing-page.test.js'],
  },
});
