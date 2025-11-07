// src/app/[lang]/layout.tsx
import { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { languages, isRTL } from '@/lib/i18n';
import { Language } from '@/types';
import { getTranslations } from '@/lib/translations';
import '../globals.css';
import LanguageSwitcherWrapper from '@/components/LanguageSwitcherWrapper';

interface LayoutProps {
  children: ReactNode;
  params: Promise<{ lang: string }>; // Next.js always gives string
}

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const safeLang = lang as Language;
  if (!languages.includes(safeLang)) return {};

  const translations = getTranslations(safeLang);
  return {
    title: {
      template: `%s | ${translations.common.appName}`,
      default: translations.common.appName,
    },
    description: 'Share your stories with the world',
    icons: { icon: '/favicon.ico' },
  };
}

export default async function LocaleLayout({ children, params }: LayoutProps) {
  const { lang } = await params;
  const safeLang = lang as Language;

  if (!languages.includes(safeLang)) notFound();

  const dir = isRTL(safeLang) ? 'rtl' : 'ltr';
  const translations = getTranslations(safeLang);

  return (
    <html lang={safeLang} dir={dir} suppressHydrationWarning>
      <body className="min-h-screen bg-gray-50" suppressHydrationWarning>
        <nav className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-8">
                <a href={`/${safeLang}`} className="text-xl font-bold text-primary-600">
                  {translations.common.appName}
                </a>
                <div className="hidden md:flex space-x-6">
                  <a
                    href={`/${safeLang}`}
                    className="text-gray-700 hover:text-primary-600 transition-colors"
                  >
                    {translations.nav.home}
                  </a>
                  <a
                    href={`/${safeLang}/stories`}
                    className="text-gray-700 hover:text-primary-600 transition-colors"
                  >
                    {translations.nav.stories}
                  </a>
                  <a
                    href={`/${safeLang}/submit`}
                    className="text-gray-700 hover:text-primary-600 transition-colors"
                  >
                    {translations.nav.submit}
                  </a>
                </div>
              </div>
              <LanguageSwitcherWrapper />
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>

        <footer className="bg-white border-t border-gray-200 mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <p className="text-center text-gray-600 text-sm">
              © 2024 {translations.common.appName}
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
