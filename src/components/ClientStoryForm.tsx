'use client';

import StoryForm from './StoryForm';
import { Language } from '@/types';
import { Translations } from '@/types/translations';

interface Props {
  translations: Translations;
  lang: Language;
}

export default function ClientStoryForm({ translations, lang }: Props) {
  return <StoryForm translations={translations} lang={lang} />;
}
