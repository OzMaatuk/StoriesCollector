import { Language } from '@/types';

export const languages: Language[] = ['en', 'he', 'fr'];

export const languageNames: Record<Language, string> = {
  en: 'English',
  he: 'עברית',
  fr: 'Français',
};

export const languageFlags: Record<Language, string> = {
  en: '🇬🇧',
  he: '🇮🇱',
  fr: '🇫🇷',
};

export function isRTL(lang: Language): boolean {
  return lang === 'he';
}

export function getLanguageFromPath(pathname: string): Language {
  const match = pathname.match(/^\/(en|he|fr)/);
  return (match?.[1] as Language) || 'en';
}