// src/app/ClientProviders.tsx
'use client';

import { ReactNode } from 'react';
import SuppressGrammarlyWarning from './SuppressGrammarlyWarning';

export default function ClientProviders({ children }: { children: ReactNode }) {
  <SuppressGrammarlyWarning />;
  return <>{children}</>;
}
