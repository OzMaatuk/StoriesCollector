// src/components/LanguageSwitcherWrapper.tsx
'use client';

import dynamic from 'next/dynamic';

const LanguageSwitcher = dynamic(() => import('./LanguageSwitcher'), { ssr: false });

export default function LanguageSwitcherWrapper() {
  return <LanguageSwitcher />;
}
