// src/app/[lang]/submit/page.tsx

import ClientStoryForm from '@/components/ClientStoryForm';
import { Language } from '@/types';
import en from '@/locales/en.json';
import he from '@/locales/he.json';
import fr from '@/locales/fr.json';
import { Translations } from '@/types/translations';

// Opt out of all static optimization to prevent client hooks during prerender
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;
export const dynamicParams = true;

interface PageProps {
  params: Promise<{ lang: Language }>;
}

export default async function SubmitPage({ params }: PageProps) {
  const { lang } = await params;
  const translationsMap: Record<Language, Translations> = { en, fr, he };
  const translations = translationsMap[lang] ?? en;

  return (
    <div>
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">{translations.nav.submit}</h1>
      </div>
      <ClientStoryForm translations={translations} lang={lang} />
    </div>
  );
}
