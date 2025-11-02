'use client';

import { ReactNode } from 'react';
import { Suspense } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  return <Suspense fallback={null}>{children}</Suspense>;
}
