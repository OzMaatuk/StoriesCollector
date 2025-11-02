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

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <head />
      <body className="min-h-screen bg-gray-50">
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
