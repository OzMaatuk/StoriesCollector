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
      <div className="bg-blue-50 border-l-4 border-blue-400 p-6 mb-8 rounded-r-lg shadow-sm group transition-all duration-300 hover:shadow-md">
        <div className="flex items-start">
          <div className="flex-shrink-0 pt-0.5">
            <svg
              className="h-6 w-6 text-blue-500 group-hover:scale-110 transition-transform"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h2 className="text-xl font-bold text-blue-900 mb-2">
              {translations.stories.aiEnrichmentTitle}
            </h2>
            <p className="text-blue-800 leading-relaxed italic">
              {translations.stories.aiEnrichmentDescription}
            </p>
          </div>
        </div>
      </div>

      <StoryList lang={lang} translations={translations} />
    </div>
  );
}
