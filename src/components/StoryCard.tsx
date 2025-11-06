// src/components/StoryCard.tsx

'use client';

import Link from 'next/link';
import { Story, Language } from '@/types';
import { Translations } from '@/types/translations';

interface StoryCardProps {
  story: Story;
  lang: Language;
  translations: Translations['stories'];
}

export default function StoryCard({ story, lang, translations }: StoryCardProps) {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat(lang, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(date));
  };

  return (
    <Link
      href={`/${lang}/stories/${story.id}`}
      className="block bg-white shadow-md rounded-lg p-6 hover:shadow-lg transition-shadow border border-gray-200 h-full"
    >
      <div className="flex flex-col h-full">
        {/* Header with title or content preview and verification badge */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex-1 min-w-0">
            {story.title ? (
              <>
                <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">{story.title}</h3>
                <p className="text-sm text-gray-600">
                  By {story.name}
                  {story.city && story.country && ` • ${story.city}, ${story.country}`}
                </p>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                  {story.content}
                </h3>
                <p className="text-sm text-gray-600">
                  By {story.name}
                  {story.city && story.country && ` • ${story.city}, ${story.country}`}
                </p>
              </>
            )}
          </div>
          <div className="flex-shrink-0">
            {story.verifiedPhone ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 whitespace-nowrap">
                ✓ {translations.verifiedPhone}
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 whitespace-nowrap">
                {translations.verifiedPhone}
              </span>
            )}
          </div>
        </div>

        {/* Content preview (only if title exists) */}
        {story.title && <p className="text-gray-700 mb-4 line-clamp-3 flex-1">{story.content}</p>}

        {/* Footer */}
        <div className="flex items-center justify-between text-sm text-gray-500 mt-auto pt-3 border-t border-gray-100">
          <span className="text-gray-500">{formatDate(story.createdAt)}</span>
          <span className="text-blue-600 hover:text-blue-700 font-medium transition-colors">
            {translations.readMore} →
          </span>
        </div>
      </div>
    </Link>
  );
}
