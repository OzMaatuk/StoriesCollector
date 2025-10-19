import { notFound } from 'next/navigation';
import Link from 'next/link';
import { StoryService } from '@/services/story.service';
import { Language } from '@/types';

interface PageProps {
  params: { 
    lang: Language;
    id: string;
  };
}

export default async function StoryDetailPage({ params }: PageProps) {
  const translations = require(`@/locales/${params.lang}.json`);
  const storyService = new StoryService();
  
  const story = await storyService.getStoryById(params.id);

  if (!story) {
    notFound();
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat(params.lang, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Link 
        href={`/${params.lang}/stories`}
        className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-6"
      >
        ← {translations.common.back}
      </Link>

      <article className="bg-white shadow-lg rounded-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white p-8">
          {story.title && (
            <h1 className="text-4xl font-bold mb-4">{story.title}</h1>
          )}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg opacity-90">By {story.name}</p>
              {(story.city || story.country) && (
                <p className="text-sm opacity-80 mt-1">
                  {[story.city, story.country].filter(Boolean).join(', ')}
                </p>
              )}
            </div>
            {story.verifiedPhone && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-white bg-opacity-20">
                ✓ {translations.stories.verifiedPhone}
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6">
          {story.storyBackground && (
            <div className="bg-gray-50 p-6 rounded-lg border-l-4 border-primary-500">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                {translations.form.storyBackground}
              </h2>
              <p className="text-gray-700 whitespace-pre-wrap">{story.storyBackground}</p>
            </div>
          )}

          {story.tellerBackground && (
            <div className="bg-gray-50 p-6 rounded-lg border-l-4 border-primary-500">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                {translations.form.tellerBackground}
              </h2>
              <p className="text-gray-700 whitespace-pre-wrap">{story.tellerBackground}</p>
            </div>
          )}

          <div className="prose prose-lg max-w-none">
            <div className="text-gray-800 leading-relaxed whitespace-pre-wrap">
              {story.content}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-8 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Published {formatDate(story.createdAt)}</span>
            {story.email && (
              <span>Contact: {story.email}</span>
            )}
          </div>
        </div>
      </article>
    </div>
  );
}