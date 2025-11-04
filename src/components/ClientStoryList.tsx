'use client';

import dynamic from 'next/dynamic';
import { PaginatedResponse, Story, Language } from '@/types';
import { Translations } from '@/types/translations';

const StoryList = dynamic(() => import('./StoryList'), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center items-center py-12">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
    </div>
  ),
});

interface Props {
  initialData: PaginatedResponse<Story>;
  lang: Language;
  translations: Translations;
}

export default function ClientStoryList({ initialData, lang, translations }: Props) {
  return <StoryList initialData={initialData} lang={lang} translations={translations} />;
}
