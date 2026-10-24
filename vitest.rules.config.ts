import { defineConfig } from 'vitest/config';

// Firestore rules tests only (run inside the emulator by `npm run test:rules`).
export default defineConfig({
  test: { include: ['tests/firestore.rules.ts'], testTimeout: 20_000 },
});
