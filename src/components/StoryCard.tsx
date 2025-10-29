// src/components/StoryCard.tsx

'use client';

import Link from 'next/link';
import { Story } from '@/types';
import { Translations } from '@/types/translations';

interface StoryCardProps {
  story: Story;
  lang: string;
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
    <Link href={`/${lang}/stories/${story.id}`}>
      <div className="bg-white shadow-md rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer border border-gray-200">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            {story.title && (
              <h3 className="text-xl font-semibold text-gray-900 mb-2 line-clamp-2">
                {story.title}
              </h3>
            )}
            <p className="text-sm text-gray-600 mb-2">
              By {story.name}
              {story.city && story.country && ` • ${story.city}, ${story.country}`}
            </p>
          </div>
          <div className="ml-4 flex-shrink-0">
            {story.verifiedPhone ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                ✓ {translations.verifiedPhone}
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                {translations.verifiedPhone}
              </span>
            )}
          </div>
        </div>

        <p className="text-gray-700 mb-4 line-clamp-3">{story.content}</p>

        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>{formatDate(story.createdAt)}</span>
          <span className="text-primary-600 hover:text-primary-700 font-medium">Read more →</span>
        </div>
      </div>
    </Link>
  );
}
