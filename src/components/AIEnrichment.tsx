'use client';

import { useState, useEffect } from 'react';
import { GeneratedContent, Translations } from '@/types';

interface AIEnrichmentProps {
  storyId: string;
  initialContent: GeneratedContent | null | undefined;
  translations: Translations;
}

export default function AIEnrichment({
  storyId,
  initialContent,
  translations,
}: AIEnrichmentProps) {
  const [content, setContent] = useState<GeneratedContent | null | undefined>(
    initialContent
  );
  const [isLoading, setIsLoading] = useState(content?.status === 'pending');

  useEffect(() => {
    if (content?.status !== 'pending') return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/stories/${storyId}/enrichment`);
        if (response.ok) {
          const data = await response.json();
          setContent(data);
          if (data.status !== 'pending') {
            setIsLoading(false);
            clearInterval(pollInterval);
          }
        }
      } catch (error) {
        console.error('Failed to poll AI enrichment:', error);
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(pollInterval);
  }, [storyId, content?.status]);


  return (
    <div className="mt-8 pt-8 border-t border-gray-200">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">
        {translations.stories.aiEnrichmentTitle}
      </h2>

      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6 rounded-r-lg shadow-sm group transition-all duration-300 hover:shadow-md">
        <div className="flex items-start">
          <div className="flex-shrink-0 pt-0.5">
            <svg
              className="h-5 w-5 text-blue-500 group-hover:scale-110 transition-transform"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-800 leading-relaxed font-medium italic">
              {translations.stories.aiEnrichmentDescription}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-primary-50 rounded-lg p-6 border border-primary-100">
        {content?.status === 'pending' || isLoading ? (
          <div className="flex items-center space-x-3 text-primary-700">
            <svg
              className="animate-spin h-5 w-5 text-primary-600"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <span>{translations.stories.aiEnrichmentPending}</span>
          </div>
        ) : content?.status === 'failed' ? (
          <div className="text-red-600 bg-red-50 p-4 rounded-md border border-red-200">
            {translations.stories.aiEnrichmentFailed}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="prose prose-primary max-w-none text-gray-800">
              <div className="whitespace-pre-wrap">{content?.generatedText || ''}</div>
            </div>
            {content && (
              <div className="pt-4 mt-4 border-t border-primary-200 text-sm text-primary-600 italic">
                {translations.stories.aiProducedBy}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
