// src/components/StoryList.tsx
'use client';

import { useState, useEffect } from 'react';
import StoryCard from './StoryCard';
import { Story, PaginatedResponse, Language } from '@/types';
import { Translations } from '@/types/translations';

interface StoryListProps {
  lang: Language;
  translations: Translations;
}

export default function StoryList({ lang, translations }: StoryListProps) {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedLanguage] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStories = async (page: number, language: string, append: boolean = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const params = new URLSearchParams({
        page: String(page),
        pageSize: '10',
      });

      if (language) {
        params.append('language', language);
      }

      const response = await fetch(`/api/stories?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch stories');
      }

      const result: PaginatedResponse<Story> = await response.json();

      if (append) {
        setStories((prev) => [...prev, ...result.data]);
      } else {
        setStories(result.data);
      }

      setHasMore(result.pagination.hasMore);
      setCurrentPage(page);
      setError(null);
    } catch (err) {
      console.error('Error fetching stories:', err);
      setError(translations.common.error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchStories(1, selectedLanguage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLanguage]);

  const handleLoadMore = () => {
    fetchStories(currentPage + 1, selectedLanguage, true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stories Grid */}
      {stories.length === 0 ? (
        <div className="bg-white shadow-sm rounded-lg p-12 text-center">
          <p className="text-gray-600">{translations.stories.noStories}</p>
        </div>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {stories.map((story) => (
              <StoryCard
                key={story.id}
                story={story}
                lang={lang}
                translations={translations.stories}
              />
            ))}
          </div>

          {/* Load More Button */}
          {hasMore && (
            <div className="flex justify-center">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {loadingMore ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    {translations.common.loading}
                  </span>
                ) : (
                  translations.common.loadMore
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
