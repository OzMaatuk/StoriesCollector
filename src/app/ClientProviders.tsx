'use client';

import { ReactNode, Suspense } from 'react';

export default function ClientProviders({ children }: { children: ReactNode }) {
  return <Suspense fallback={null}>{children}</Suspense>;
}
