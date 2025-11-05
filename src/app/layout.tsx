import { Metadata } from 'next';
import { ReactNode } from 'react';
import './globals.css';
import ClientProviders from './ClientProviders';

export const metadata: Metadata = {
  title: {
    template: '%s | Story App',
    default: 'Story App',
  },
  description: 'Share your stories with the world',
  icons: {
    icon: '/favicon.ico',
  },
};

// Opt out of static rendering for the entire app to prevent client
// hooks being called during prerender
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50" suppressHydrationWarning>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}

export function generateViewport() {
  return { width: 'device-width', initialScale: 1 };
}
