// src/app/[lang]/stories/page.tsx

import StoryList from '@/components/StoryList';
import { StoryService } from '@/services/story.service';
import { Language } from '@/types';
import en from '@/locales/en.json';
import he from '@/locales/he.json';
import fr from '@/locales/fr.json';
import { Translations } from '@/types/translations';

interface PageProps {
  params: { lang: Language };
}

export default async function StoriesPage({ params }: PageProps) {
  const translationsMap: Record<Language, Translations> = { en, fr, he };
  const translations = translationsMap[params.lang] ?? en;
  const storyService = new StoryService();

  const initialData = await storyService.getStories({
    page: 1,
    pageSize: 10,
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">{translations.stories.title}</h1>
      </div>
      <StoryList initialData={initialData} lang={params.lang} translations={translations} />
    </div>
  );
}
