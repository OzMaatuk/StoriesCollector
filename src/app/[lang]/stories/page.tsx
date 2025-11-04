// src/app/[lang]/stories/page.tsx

import { Suspense } from 'react';
import { Language } from '@/types';
import en from '@/locales/en.json';
import he from '@/locales/he.json';
import fr from '@/locales/fr.json';
import { Translations } from '@/types/translations';
import StoryListClient from './StoryListClient';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;
// export const runtime = 'edge';

interface PageProps {
  params: { lang: Language };
}

const LoadingSpinner = () => (
  <div className="flex justify-center items-center py-12">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
  </div>
);

export default function StoriesPage({ params }: PageProps) {
  const translationsMap: Record<Language, Translations> = { en, fr, he };
  const translations = translationsMap[params.lang] ?? en;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">{translations.stories.title}</h1>
      </div>
      <Suspense fallback={<LoadingSpinner />}>
        <StoryListClient lang={params.lang} translations={translations} />
      </Suspense>
    </div>
  );
}
