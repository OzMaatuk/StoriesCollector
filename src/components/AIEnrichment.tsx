'use client';

import { useState, useEffect } from 'react';
import { GeneratedContent, Translations } from '@/types';
import { ENRICHMENT } from '@/lib/constants';

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
  const [isRetrying, setIsRetrying] = useState(false);

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

  const handleRetry = async () => {
    if (!content || content.retryCount >= ENRICHMENT.MAX_RETRIES) {
      return;
    }

    try {
      setIsRetrying(true);
      const response = await fetch(`/api/stories/${storyId}/enrichment`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        setContent(data);
        setIsLoading(true); // Start polling again
      } else {
        console.error('Failed to retry enrichment:', response.statusText);
      }
    } catch (error) {
      console.error('Error triggering retry:', error);
    } finally {
      setIsRetrying(false);
    }
  };

  const canRetry = content && content.retryCount < ENRICHMENT.MAX_RETRIES;
  const retriesExhausted = content && content.retryCount >= ENRICHMENT.MAX_RETRIES && content.status === 'failed';

  if (!content && !isLoading) return null;

  return (
    <div className="mt-8 pt-8 border-t border-gray-200">
      <div className="bg-gray-50 p-6 rounded-lg border-l-4 border-primary-500">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          {translations.stories.aiEnrichmentTitle}
        </h2>
        {translations.stories.aiEnrichmentDescription && (
          <p className="text-sm text-gray-600 mb-4">
            {translations.stories.aiEnrichmentDescription}
          </p>
        )}

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
          <div className="space-y-4">
            <div className="text-red-600 bg-red-50 p-4 rounded-md border border-red-200">
              {translations.stories.aiEnrichmentFailed}
            </div>
            {retriesExhausted ? (
              <div className="text-amber-600 bg-amber-50 p-3 rounded-md border border-amber-200 text-sm">
                Retries exhausted. Maximum {ENRICHMENT.MAX_RETRIES} attempts reached.
              </div>
            ) : (
              <button
                onClick={handleRetry}
                disabled={isRetrying || !canRetry}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  isRetrying || !canRetry
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-primary-600 text-white hover:bg-primary-700'
                }`}
              >
                {isRetrying ? 'Retrying...' : `Retry (${content?.retryCount || 0}/${ENRICHMENT.MAX_RETRIES})`}
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="prose prose-primary max-w-none text-gray-800">
              <div className="whitespace-pre-wrap">{content?.generatedText || ''}</div>
            </div>
            {content && (
              <>
                <div className="pt-4 mt-4 border-t border-gray-200 text-sm text-gray-500 italic">
                  {translations.stories.aiProducedBy}
                </div>
                {canRetry && (
                  <button
                    onClick={handleRetry}
                    disabled={isRetrying}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      isRetrying
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-primary-600 text-white hover:bg-primary-700'
                    }`}
                  >
                    {isRetrying ? 'Retrying...' : `Regenerate (${content?.retryCount || 0}/${ENRICHMENT.MAX_RETRIES})`}
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
