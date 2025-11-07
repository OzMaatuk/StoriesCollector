// src/app/layout.tsx

import './globals.css';
import ClientProviders from './ClientProviders';
import { ReactNode } from 'react';

export default function RootLayout({ children }: { children: ReactNode }) {
  return <ClientProviders>{children}</ClientProviders>;
}

export function generateViewport() {
  return { width: 'device-width', initialScale: 1 };
}
