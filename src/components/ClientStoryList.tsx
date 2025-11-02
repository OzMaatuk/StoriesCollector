'use client';

import StoryList from './StoryList';
import { PaginatedResponse, Story, Language } from '@/types';
import { Translations } from '@/types/translations';

interface Props {
  initialData: PaginatedResponse<Story>;
  lang: Language;
  translations: Translations;
}

export default function ClientStoryList({ initialData, lang, translations }: Props) {
  return <StoryList initialData={initialData} lang={lang} translations={translations} />;
}
