// src/app/[lang]/stories/page.tsx

import { Language } from '@/types';
import en from '@/locales/en.json';
import he from '@/locales/he.json';
import fr from '@/locales/fr.json';
import { Translations } from '@/types/translations';
import StoryList from '@/components/StoryList';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

interface PageProps {
  params: Promise<{ lang: Language }>;
}

export default async function StoriesPage({ params }: PageProps) {
  const { lang } = await params;
  const translationsMap: Record<Language, Translations> = { en, fr, he };
  const translations = translationsMap[lang] ?? en;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">{translations.stories.title}</h1>
      </div>
      <StoryList lang={lang} translations={translations} />
    </div>
  );
}
