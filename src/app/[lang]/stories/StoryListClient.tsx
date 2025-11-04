'use client';

import { useState, useEffect } from 'react';
import { StoryService } from '@/services/story.service';
import { PaginatedResponse, Story, Language } from '@/types';
import { Translations } from '@/types/translations';

const LoadingSpinner = () => (
  <div className="flex justify-center items-center py-12">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
  </div>
);

interface StoryListClientProps {
  lang: Language;
  translations: Translations;
}

export default function StoryListClient({ lang, translations }: StoryListClientProps) {
  const [data, setData] = useState<PaginatedResponse<Story> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStories = async () => {
      try {
        const service = new StoryService();
        const result = await service.getStories({ page: 1, pageSize: 10, language: lang });
        setData(result);
      } catch (err) {
        setError('Failed to load stories');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchStories();
  }, [lang]);

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="text-red-500 text-center py-8">{error}</div>;
  if (!data) return null;

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {data.data.map((story) => (
        <a
          key={story.id}
          href={`/${lang}/stories/${story.id}`}
          className="block border rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow"
        >
          <h3 className="font-semibold text-lg mb-2 line-clamp-2">{story.title}</h3>
          <p className="text-gray-600 text-sm line-clamp-3">{story.content}</p>
          <div className="mt-3 text-xs text-gray-500">
            {story.name} • {new Date(story.createdAt).toLocaleDateString(lang)}
          </div>
        </a>
      ))}
      {data.pagination.hasMore && (
        <div className="col-span-full text-center mt-6">
          <button className="text-primary-600 hover:underline">
            {translations.common.loadMore} →
          </button>
        </div>
      )}
    </div>
  );
}
