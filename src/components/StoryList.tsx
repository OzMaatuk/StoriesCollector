// src/components/StoryList.tsx

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import StoryCard from './StoryCard';
import Pagination from './Pagination';
import { Story, PaginatedResponse, Language } from '@/types';
import { languages, languageNames } from '@/lib/i18n';
import { Translations } from '@/types/translations';

interface StoryListProps {
  initialData: PaginatedResponse<Story>;
  lang: Language;
  translations: Translations;
}

export default function StoryList({ initialData, lang, translations }: StoryListProps) {
  const isMounted = useRef(false);
  const [data, setData] = useState<PaginatedResponse<Story>>(initialData);
  const [loading, setLoading] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    // window is only available in the browser; guard to avoid errors during SSR/build
    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isMounted.current) return;
    const controller = new AbortController();
    const fetchStories = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(currentPage),
          pageSize: '10',
        });

        if (selectedLanguage) {
          params.append('language', selectedLanguage);
        }

        const response = await fetch(`/api/stories?${params}`, {
          signal: controller.signal,
        });

        if (!response.ok) throw new Error('Failed to fetch stories');

        const result: PaginatedResponse<Story> = await response.json();
        if (isMounted.current) {
          setData(result);
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }
        console.error('Error fetching stories:', error);
      } finally {
        if (isMounted.current) {
          setLoading(false);
        }
      }
    };

    fetchStories();
    return () => controller.abort();
  }, [currentPage, selectedLanguage]);

  const handleLanguageFilter = useCallback((lang: string) => {
    setSelectedLanguage(lang);
    setCurrentPage(1);
  }, []);

  return (
    <div className="space-y-6">
      {/* Language Filter */}
      <div className="bg-white shadow-sm rounded-lg p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {translations.stories.filterByLanguage}
        </label>
        <select
          value={selectedLanguage}
          onChange={(e) => handleLanguageFilter(e.target.value)}
          className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option value="">{translations.stories.allLanguages}</option>
          {languages.map((l) => (
            <option key={l} value={l}>
              {languageNames[l]}
            </option>
          ))}
        </select>
      </div>

      {/* Stories Grid */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : data.data.length === 0 ? (
        <div className="bg-white shadow-sm rounded-lg p-12 text-center">
          <p className="text-gray-600">{translations.stories.noStories}</p>
        </div>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {data.data.map((story) => (
              <StoryCard
                key={story.id}
                story={story}
                lang={lang}
                translations={translations.stories}
              />
            ))}
          </div>

          {/* Pagination */}
          {data.pagination.totalPages > 1 && (
            <Pagination
              currentPage={data.pagination.page}
              totalPages={data.pagination.totalPages}
              onPageChange={handlePageChange}
            />
          )}
        </>
      )}
    </div>
  );
}
