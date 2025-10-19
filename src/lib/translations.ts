import en from '@/locales/en.json';
import he from '@/locales/he.json';
import fr from '@/locales/fr.json';
import { Language } from '@/types';

export const translations = {
  en,
  he,
  fr,
};

export function getTranslations(lang: Language) {
  return translations[lang];
}
