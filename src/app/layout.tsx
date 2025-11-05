// src/app/layout.tsx
import { ReactNode } from 'react';
import './globals.css';
import ClientProviders from './ClientProviders';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

export default function RootLayout({ children }: { children: ReactNode }) {
  return <ClientProviders>{children}</ClientProviders>;
}

export function generateViewport() {
  return { width: 'device-width', initialScale: 1 };
}
