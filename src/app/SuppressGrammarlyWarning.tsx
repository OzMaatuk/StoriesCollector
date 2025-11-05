// src/app/SuppressGrammarlyWarning.tsx

'use client';

import { useEffect } from 'react';

/**
 * Suppresses the harmless Grammarly hydration warning in development.
 * Leaves every other console.error untouched.
 */
export default function SuppressGrammarlyWarning() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    const original = console.error;
    console.error = (...args: unknown[]) => {
      const msg = args[0];
      if (
        typeof msg === 'string' &&
        msg.includes('Extra attributes from the server') &&
        (msg.includes('data-new-gr-c-s-check-loaded') || msg.includes('data-gr-ext-installed'))
      ) {
        // swallow the Grammarly noise
        return;
      }
      // forward everything else
      original.apply(console, args);
    };

    // cleanup on unmount (hot-reload safety)
    return () => {
      console.error = original;
    };
  }, []);

  return null;
}
