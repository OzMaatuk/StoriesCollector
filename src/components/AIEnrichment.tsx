'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { GeneratedContent, Translations } from '@/types';

interface AIEnrichmentProps {
  storyId: string;
  initialContents: GeneratedContent[];
  selectedEnrichmentId?: string | null;
  translations: Translations;
}

const sortGeneratedContents = (contents: GeneratedContent[]) => {
  return [...contents].sort((a, b) => {
    const aVersion = a.version ?? Number.POSITIVE_INFINITY;
    const bVersion = b.version ?? Number.POSITIVE_INFINITY;

    if (aVersion !== bVersion) {
      return aVersion - bVersion;
    }

    return b.createdAt.getTime() - a.createdAt.getTime();
  });
};

export default function AIEnrichment({
  storyId,
  initialContents = [],
  selectedEnrichmentId,
  translations,
}: AIEnrichmentProps) {
  const initialSortedContents = sortGeneratedContents(initialContents);
  const [contents, setContents] = useState<GeneratedContent[]>(initialSortedContents);
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    return (
      selectedEnrichmentId ||
      initialSortedContents.find((content) => content.version == null)?.id ||
      initialSortedContents[0]?.id ||
      null
    );
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const sortedContents = useMemo(() => sortGeneratedContents(contents), [contents]);

  const draftContent = useMemo(
    () => sortedContents.find((content) => content.version == null) || null,
    [sortedContents]
  );

  const selectedContent = useMemo(() => {
    if (selectedId) {
      return sortedContents.find((content) => content.id === selectedId) || draftContent || sortedContents[0] || null;
    }

    return draftContent || sortedContents[0] || null;
  }, [selectedId, sortedContents, draftContent]);

  const hasPending = sortedContents.some((content) => content.status === 'pending');
  const selectedIsDraft = selectedContent?.version == null;

  const refreshContents = useCallback(async (): Promise<GeneratedContent[] | null> => {
    try {
      const response = await fetch(`/api/stories/${storyId}/enrichment`);
      if (!response.ok) {
        return null;
      }

      const data = (await response.json()) as GeneratedContent[];
      const sortedData = sortGeneratedContents(data);
      setContents(sortedData);

      if (!selectedId && sortedData.length > 0) {
        const defaultSelection = selectedEnrichmentId ?? sortedData[0].id;
        setSelectedId(defaultSelection);
      }

      return sortedData;
    } catch (error) {
      console.error('Failed to refresh enrichment contents:', error);
      return null;
    }
  }, [storyId, selectedId, selectedEnrichmentId]);

  useEffect(() => {
    if (!hasPending) {
      return;
    }

    const interval = setInterval(refreshContents, 3000);

    return () => clearInterval(interval);
  }, [hasPending, refreshContents]);

  const handleGenerate = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/stories/${storyId}/enrichment`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to trigger enrichment generation');
      }

      await refreshContents();
    } catch (error) {
      setErrorMessage('Unable to start enrichment generation. Please try again.');
      console.error('Error generating enrichment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveCurrent = async () => {
    if (!selectedContent || selectedContent.status !== 'completed' || selectedContent.version != null) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/stories/${storyId}/enrichment`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enrichmentId: selectedContent.id }),
      });

      if (!response.ok) {
        throw new Error('Failed to save enrichment');
      }

      await refreshContents();
      setSelectedId(selectedContent.id);
    } catch (error) {
      setErrorMessage('Unable to save this generated version. Please try again.');
      console.error('Error saving enrichment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectEnrichment = (enrichmentId: string) => {
    setSelectedId(enrichmentId);
    setErrorMessage(null);
  };

  const handleRegenerate = async () => {
    if (isSubmitting || !selectedIsDraft) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/stories/${storyId}/enrichment`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to regenerate enrichment');
      }

      await refreshContents();
    } catch (error) {
      setErrorMessage('Unable to regenerate the draft version. Please try again.');
      console.error('Error regenerating enrichment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!sortedContents || sortedContents.length === 0) {
    return (
      <div className="mt-8 pt-8 border-t border-gray-200">
        <div className="bg-gray-50 p-6 rounded-lg border-l-4 border-primary-500">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            {translations.stories.aiEnrichmentTitle}
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            {translations.stories.aiEnrichmentDescription}
          </p>
          <button
            onClick={handleGenerate}
            disabled={isSubmitting}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${isSubmitting
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-primary-600 text-white hover:bg-primary-700'
            }`}
          >
            {isSubmitting ? translations.stories.aiEnrichmentPending : translations.stories.aiGenerate}
          </button>
          {errorMessage && (
            <p className="mt-4 text-sm text-red-600">{errorMessage}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8 pt-8 border-t border-gray-200">
      <div className="bg-gray-50 p-6 rounded-lg border-l-4 border-primary-500">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {translations.stories.aiEnrichmentTitle}
            </h2>
            {translations.stories.aiEnrichmentDescription && (
              <p className="text-sm text-gray-600 mt-1">
                {translations.stories.aiEnrichmentDescription}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {sortedContents.length > 0 && (
              <select
                value={selectedContent?.id || ''}
                onChange={(e) => handleSelectEnrichment(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-md bg-white"
              >
                {sortedContents
                  .filter((content) => content.version != null)
                  .map((content) => (
                    <option key={content.id} value={content.id}>
                      v{content.version}
                    </option>
                  ))}
                {draftContent && (
                  <option key={draftContent.id} value={draftContent.id}>
                    Draft{draftContent.status === 'pending' ? ' (pending)' : ''}
                  </option>
                )}
              </select>
            )}
            {!draftContent && (
              <button
                onClick={handleGenerate}
                disabled={isSubmitting}
                className={`px-3 py-2 text-sm rounded-md transition-colors ${isSubmitting
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-primary-600 text-white hover:bg-primary-700'
                }`}
              >
                {isSubmitting ? translations.stories.aiEnrichmentPending : translations.stories.aiGenerate}
              </button>
            )}
            {selectedIsDraft && selectedContent?.status === 'completed' && (
              <button
                onClick={handleSaveCurrent}
                disabled={isSubmitting}
                className={`px-3 py-2 text-sm rounded-md transition-colors ${isSubmitting
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {translations.stories.save}
              </button>
            )}
          </div>
        </div>

        {selectedContent?.status === 'pending' ? (
          <div className="flex items-center gap-3 text-primary-700">
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
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>{translations.stories.aiEnrichmentPending}</span>
          </div>
        ) : selectedContent?.status === 'failed' ? (
          <div className="space-y-4">
            <div className="text-red-600 bg-red-50 p-4 rounded-md border border-red-200">
              {translations.stories.aiEnrichmentFailed}
            </div>
            {selectedIsDraft && (
              <button
                onClick={handleRegenerate}
                disabled={isSubmitting}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${isSubmitting
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-primary-600 text-white hover:bg-primary-700'
                }`}
              >
                {translations.stories.aiRegenerate}
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="prose prose-primary max-w-none text-gray-800">
              <div className="whitespace-pre-wrap">{selectedContent?.generatedText || ''}</div>
            </div>
            {selectedContent?.status === 'completed' && (
              <div className="pt-4 mt-4 border-t border-gray-200 text-sm text-gray-500 italic">
                {translations.stories.aiProducedBy}
              </div>
            )}
            {selectedIsDraft && (
              <button
                onClick={handleRegenerate}
                disabled={isSubmitting}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${isSubmitting
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-primary-600 text-white hover:bg-primary-700'
                }`}
              >
                {isSubmitting ? translations.stories.aiEnrichmentPending : translations.stories.aiRegenerate}
              </button>
            )}
          </div>
        )}

        {errorMessage && (
          <p className="mt-4 text-sm text-red-600">{errorMessage}</p>
        )}
      </div>
    </div>
  );
}
