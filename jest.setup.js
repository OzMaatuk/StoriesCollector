import '@testing-library/jest-dom';

// Mock crypto for jwt.ts (if needed)
if (!global.crypto) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { webcrypto } = require('crypto');
  global.crypto = webcrypto;
}
