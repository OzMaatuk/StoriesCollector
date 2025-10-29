// src/app/[lang]/submit/page.tsx

import StoryForm from '@/components/StoryForm';
import { Language } from '@/types';
import en from '@/locales/en.json';
import he from '@/locales/he.json';
import fr from '@/locales/fr.json';
import { Translations } from '@/types/translations';

interface PageProps {
  params: { lang: Language };
}

export default function SubmitPage({ params }: PageProps) {
  const translationsMap: Record<Language, Translations> = { en, fr, he };
  const translations = translationsMap[params.lang] ?? en;

  return (
    <div>
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">{translations.nav.submit}</h1>
      </div>
      <StoryForm translations={translations} lang={params.lang} />
    </div>
  );
}
