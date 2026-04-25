'use client';

import { useState, useEffect } from 'react';
import { GeneratedContent, Translations } from '@/types';
import { ENRICHMENT } from '@/lib/constants';

interface AIEnrichmentProps {
  storyId: string;
  initialContents: GeneratedContent[];
  selectedEnrichmentId?: string | null;
  translations: Translations;
}

export default function AIEnrichment({
  storyId,
  initialContents = [],
  selectedEnrichmentId,
  translations,
}: AIEnrichmentProps) {
  const [contents, setContents] = useState<GeneratedContent[]>(initialContents);
  const [selectedId, setSelectedId] = useState<string | null>(selectedEnrichmentId || null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [newlyGeneratedId, setNewlyGeneratedId] = useState<string | null>(null);

  // Get the currently selected content
  const selectedContent = contents.find(c => c.id === selectedId) || contents[0];

  useEffect(() => {
    // Poll for updates when there are pending enrichments
    const hasPending = contents.some(c => c.status === 'pending');
    if (!hasPending) return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/stories/${storyId}/enrichment`);
        if (response.ok) {
          const data = await response.json();
          setContents(data);
          const stillPending = data.some((c: GeneratedContent) => c.status === 'pending');
          if (!stillPending) {
            // Find any newly completed content that wasn't the initially selected one
            const newContent = data.find((c: GeneratedContent) => 
              c.status === 'completed' && c.id !== selectedEnrichmentId
            );
            if (newContent && !newlyGeneratedId) {
              setNewlyGeneratedId(newContent.id);
            }
            setIsGenerating(false);
            clearInterval(pollInterval);
          }
        }
      } catch (error) {
        console.error('Failed to poll AI enrichment:', error);
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(pollInterval);
  }, [storyId, contents, selectedEnrichmentId, newlyGeneratedId]);

  const handleGenerateNew = async (enrichmentId?: string) => {
    if (isGenerating) return;

    try {
      setIsGenerating(true);
      const response = await fetch(`/api/stories/${storyId}/enrichment`, {
        method: 'POST',
        headers: enrichmentId ? { 'Content-Type': 'application/json' } : undefined,
        body: enrichmentId ? JSON.stringify({ enrichmentId }) : undefined,
      });

      if (response.ok) {
        // Start polling for updates
        const pollInterval = setInterval(async () => {
          try {
            const pollResponse = await fetch(`/api/stories/${storyId}/enrichment`);
            if (pollResponse.ok) {
              const data = await pollResponse.json();
              setContents(data);
              const stillPending = data.some((c: GeneratedContent) => c.status === 'pending');
              if (!stillPending) {
                // Find the newly generated content (not previously saved)
                const newContent = data.find((c: GeneratedContent) => 
                  c.status === 'completed' && c.id !== selectedEnrichmentId
                );
                if (newContent) {
                  setNewlyGeneratedId(newContent.id);
                  setSelectedId(newContent.id);
                }
                setIsGenerating(false);
                clearInterval(pollInterval);
              }
            }
          } catch (error) {
            console.error('Failed to poll after generate:', error);
          }
        }, 3000);
      } else {
        console.error('Failed to generate enrichment');
        setIsGenerating(false);
      }
    } catch (error) {
      console.error('Error generating enrichment:', error);
      setIsGenerating(false);
    }
  };

  const handleSaveCurrent = async () => {
    if (!selectedContent || selectedContent.status !== 'completed') return;

    try {
      const response = await fetch(`/api/stories/${storyId}/enrichment`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enrichmentId: selectedContent.id }),
      });

      if (response.ok) {
        setSelectedId(selectedContent.id);
        setNewlyGeneratedId(null);
      } else {
        console.error('Failed to save enrichment');
      }
    } catch (error) {
      console.error('Error saving enrichment:', error);
    }
  };

  const handleSelectEnrichment = (enrichmentId: string) => {
    setSelectedId(enrichmentId);
    // Clear newly generated flag when selecting a different enrichment
    setNewlyGeneratedId(null);
  };

  const handleRetry = async (enrichmentId: string) => {
    const enrichment = contents.find(c => c.id === enrichmentId);
    if (!enrichment || enrichment.retryCount >= ENRICHMENT.MAX_RETRIES) {
      return;
    }

    try {
      setIsRetrying(true);
      // Reset selection so UI shows the pending state after the retry starts
      setSelectedId(null);
      // Trigger a retry (POST) – the API will reuse the existing record
      await handleGenerateNew(enrichmentId);
    } catch (error) {
      console.error('Error retrying enrichment:', error);
    } finally {
      setIsRetrying(false);
    }
  };

  const canRetry = selectedContent && selectedContent.retryCount < ENRICHMENT.MAX_RETRIES;
  const retriesExhausted = selectedContent && selectedContent.retryCount >= ENRICHMENT.MAX_RETRIES && selectedContent.status === 'failed';

  if (!contents || contents.length === 0) {
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
            onClick={() => handleGenerateNew()}
            disabled={isGenerating}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${isGenerating
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-primary-600 text-white hover:bg-primary-700'
              }`}
          >
            {isGenerating ? translations.stories.aiEnrichmentPending : translations.stories.aiGenerate}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8 pt-8 border-t border-gray-200">
      <div className="bg-gray-50 p-6 rounded-lg border-l-4 border-primary-500">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {translations.stories.aiEnrichmentTitle}
          </h2>
          <div className="flex items-center space-x-2">
            {contents.length > 0 && (
              <select
                value={selectedId || ''}
                onChange={(e) => handleSelectEnrichment(e.target.value)}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md bg-white"
              >
                {contents.map((content) => (
                  <option key={content.id} value={content.id}>
                    Version {contents.length - contents.indexOf(content)} - {content.status}
                  </option>
                ))}
              </select>
            )}
            {selectedContent?.status === 'completed' && selectedContent.id !== selectedEnrichmentId && (
              <button
                onClick={handleSaveCurrent}
                disabled={false}
                className={`px-3 py-1 text-sm rounded-md transition-colors bg-green-600 text-white hover:bg-green-700`}
              >
                {translations.stories.save}
              </button>
            )}
            {/* Generate New button removed as per requirement */}
          </div>
        </div>
        {translations.stories.aiEnrichmentDescription && (
          <p className="text-sm text-gray-600 mb-4">
            {translations.stories.aiEnrichmentDescription}
          </p>
        )}

        {selectedContent?.status === 'pending' || isGenerating ? (
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
        ) : selectedContent?.status === 'failed' ? (
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
                onClick={() => handleRetry(selectedContent.id)}
                disabled={isRetrying || !canRetry}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${isRetrying || !canRetry
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-primary-600 text-white hover:bg-primary-700'
                  }`}
              >
                {isRetrying ? translations.stories.aiRetrying : `${translations.stories.aiRegenerate} (${selectedContent?.retryCount || 0}/${ENRICHMENT.MAX_RETRIES})`}
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="prose prose-primary max-w-none text-gray-800">
              <div className="whitespace-pre-wrap">{selectedContent?.generatedText || ''}</div>
            </div>
            {selectedContent && (
              <>
                <div className="pt-4 mt-4 border-t border-gray-200 text-sm text-gray-500 italic">
                  {translations.stories.aiProducedBy}
                </div>
                {canRetry && (
                  <button
                    onClick={() => handleRetry(selectedContent.id)}
                    disabled={isRetrying}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${isRetrying
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-primary-600 text-white hover:bg-primary-700'
                      }`}
                  >
                    {isRetrying ? translations.stories.aiRetrying : `${translations.stories.aiRegenerate} (${selectedContent?.retryCount || 0}/${ENRICHMENT.MAX_RETRIES})`}
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
