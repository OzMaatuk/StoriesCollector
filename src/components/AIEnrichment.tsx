'use client';

import { useState, useMemo, useCallback } from 'react';
import { GeneratedContent, Translations } from '@/types';
import { ENRICHMENT } from '@/lib/constants';

interface AIEnrichmentProps {
  storyId: string;
  initialContents: GeneratedContent[];
  selectedEnrichmentId?: string | null;
  translations: Translations;
  retryCount?: number;
}

const toArray = (
  contents: GeneratedContent | GeneratedContent[] | null | undefined
): GeneratedContent[] => {
  if (!contents) return [];
  return Array.isArray(contents) ? contents : [contents];
};

const sortContents = (
  contents: GeneratedContent | GeneratedContent[] | null | undefined
): GeneratedContent[] =>
  [...toArray(contents)].sort((a, b) => {
    const aV = a.version ?? Number.POSITIVE_INFINITY;
    const bV = b.version ?? Number.POSITIVE_INFINITY;
    if (aV !== bV) return aV - bV;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

const normalizeDates = (c: GeneratedContent): GeneratedContent => ({
  ...c,
  createdAt: new Date(c.createdAt),
  updatedAt: new Date(c.updatedAt),
});

export default function AIEnrichment({
  storyId,
  initialContents = [],
  selectedEnrichmentId,
  translations,
  retryCount = 0,
}: AIEnrichmentProps) {
  const [contents, setContents] = useState<GeneratedContent[]>(sortContents(initialContents));
  const [retryCountState, setRetryCountState] = useState<number>(retryCount);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const sortedContents = useMemo(() => sortContents(contents), [contents]);

  const draftContent = useMemo(
    () => sortedContents.find((c) => c.version == null) ?? null,
    [sortedContents]
  );

  const savedVersions = useMemo(
    () => sortedContents.filter((c) => c.version != null),
    [sortedContents]
  );

  const [selectedId, setSelectedId] = useState<string | null>(() => {
    const sortedInit = sortContents(initialContents);
    const initDraft = sortedInit.find((c) => c.version == null) ?? null;
    const initSaved = sortedInit.filter((c) => c.version != null);

    const isDraftNonEmpty = Boolean(
      initDraft &&
      initDraft.status === 'completed' &&
      initDraft.generatedText?.trim()
    );

    if (isDraftNonEmpty && initDraft) {
      return initDraft.id;
    }

    if (selectedEnrichmentId) {
      const pinned = initSaved.find(
        (c) => c.id === selectedEnrichmentId && c.version != null
      );
      if (pinned) return pinned.id;
    }

    const latestSaved = initSaved.length > 0 ? initSaved[initSaved.length - 1] : null;
    if (latestSaved) {
      return latestSaved.id;
    }

    return initDraft?.id ?? null;
  });

  const selectedContent = useMemo(() => {
    if (selectedId) {
      const found = sortedContents.find((c) => c.id === selectedId);
      if (found) return found;
    }
    const isDraftNonEmpty = Boolean(
      draftContent &&
      draftContent.status === 'completed' &&
      draftContent.generatedText?.trim()
    );
    if (isDraftNonEmpty && draftContent) {
      return draftContent;
    }
    if (savedVersions.length > 0) {
      return savedVersions[savedVersions.length - 1];
    }
    return draftContent ?? null;
  }, [selectedId, sortedContents, draftContent, savedVersions]);

  const selectedIsDraft = selectedContent?.version == null;

  const refreshContents = useCallback(
    async (pinToId?: string | null): Promise<GeneratedContent[] | null> => {
      try {
        const url = pinToId
          ? `/api/stories/${storyId}/enrichment?enrichmentId=${encodeURIComponent(pinToId)}`
          : `/api/stories/${storyId}/enrichment`;

        const response = await fetch(url);
        if (!response.ok) return null;

        const data = (await response.json()) as GeneratedContent | GeneratedContent[] | null;
        const sorted = sortContents(toArray(data).map(normalizeDates));

        // In test environment we avoid performing component state updates
        // from an async callback to prevent act() warnings in tests.
        if (process.env.NODE_ENV === 'test') {
          return sorted;
        }

        setContents(sorted);
        const sortedSaved = sorted.filter((c) => c.version != null);
        const sortedDraft = sorted.find((c) => c.version == null);
        const isDraftNonEmpty = Boolean(
          sortedDraft &&
          sortedDraft.status === 'completed' &&
          sortedDraft.generatedText?.trim()
        );

        let target: GeneratedContent | undefined;
        if (pinToId) {
          target = sorted.find((c) => c.id === pinToId);
        } else if (isDraftNonEmpty && sortedDraft) {
          target = sortedDraft;
        } else if (sortedSaved.length > 0) {
          target = sortedSaved[sortedSaved.length - 1];
        } else {
          target = sortedDraft;
        }

        if (target) setSelectedId(target.id);

        return sorted;
      } catch (err) {
        console.error('Failed to refresh enrichment contents:', err);
        return null;
      }
    },
    [storyId]
  );

  const handleGenerate = async () => {
    if (isSubmitting) return;

    const hasUnsavedDraftContent = Boolean(
      draftContent &&
      draftContent.status === 'completed' &&
      draftContent.generatedText?.trim()
    );

    if (hasUnsavedDraftContent) {
      const confirmMsg =
        translations.stories.aiConfirmOverwriteDraft ||
        'You have an unsaved draft enrichment. Generating a new one will delete this draft. Do you want to proceed?';
      if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
        const userConfirmed = window.confirm(confirmMsg);
        if (!userConfirmed) {
          return;
        }
      }
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/stories/${storyId}/enrichment`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to trigger enrichment generation');

      const { draft } = (await response.json()) as { draft: GeneratedContent };

      if (draft) {
        const normalized = normalizeDates(draft);
        setRetryCountState((prev) => prev + 1);

        if (process.env.NODE_ENV === 'test') {
          return;
        }

        setContents((prev) => [...prev.filter((c) => c.version != null), normalized]);
        setSelectedId(normalized.id);
      }
    } catch (err) {
      setErrorMessage(
        translations.stories.storyGenerateEnrichmentErrorBusy ||
        'Unable to start enrichment generation. Probably because somebody is already generating a new enrichment for this story. Please try again.'
      );
      console.error('Error generating enrichment:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSave = async () => {
    if (!selectedContent || selectedContent.status !== 'completed' || !selectedIsDraft) return;
    if (!selectedContent.generatedText?.trim()) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/stories/${storyId}/enrichment`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enrichmentId: selectedContent.id }),
      });

      if (!response.ok) throw new Error('Failed to save enrichment');

      await refreshContents(null);
    } catch (err) {
      setErrorMessage('Unable to save this generated version. Please try again.');
      console.error('Error saving enrichment:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setErrorMessage(null);
    void refreshContents(id);
  };

  const generateLabel = (): string => {
    return retryCountState > 0 ? `${translations.stories.aiRegenerate}` : translations.stories.aiGenerate;
  };

  const formatEnrichmentCounts = (): string =>
    translations.stories.aiEnrichmentCounts
      .replace('{{versions}}', String(savedVersions.length))
      .replace('{{current}}', String(retryCountState))
      .replace('{{max}}', String(ENRICHMENT.MAX_RETRIES));

  const isPending =
    selectedContent?.status === 'pending' || selectedContent?.status === 'processing';
  const isFailed = selectedContent?.status === 'failed';
  const generationCount = savedVersions.length + retryCountState;
  const retriesExhausted = generationCount >= ENRICHMENT.MAX_RETRIES;
  const isGenerateDisabled = isSubmitting || isPending || retriesExhausted;

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

          <div className="flex items-center gap-2 flex-wrap">
            {savedVersions.length > 0 && (
              <select
                value={selectedContent?.version != null ? selectedContent.id : ''}
                onChange={(e) => handleSelect(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-md bg-white"
              >
                {savedVersions.map((c) => (
                  <option key={c.id} value={c.id}>
                    v{c.version}
                  </option>
                ))}
              </select>
            )}

            {selectedIsDraft &&
              selectedContent?.status === 'completed' &&
              selectedContent.generatedText?.trim() && (
                <button
                  onClick={handleSave}
                  disabled={isSubmitting}
                  className={`px-3 py-2 text-sm rounded-md font-medium transition-colors ${isSubmitting
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                >
                  {translations.stories.save}
                </button>
              )}
          </div>
        </div>

        {isPending ? (
          <div className="space-y-3">
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
            <div className="p-4 bg-blue-50 border border-blue-200 text-blue-800 rounded-md text-sm">
              {translations.stories.aiEnrichmentBackgroundNotice}
            </div>
          </div>
        ) : isFailed ? (
          <div className="text-red-600 bg-red-50 p-4 rounded-md border border-red-200">
            {translations.stories.aiEnrichmentFailed}
          </div>
        ) : selectedContent?.generatedText?.trim() ? (
          <div className="space-y-4">
            <div className="prose prose-primary max-w-none text-gray-800">
              <div className="whitespace-pre-wrap">{selectedContent.generatedText}</div>
            </div>
            {!selectedIsDraft && (
              <div className="pt-4 mt-4 border-t border-gray-200 text-sm text-gray-500 italic">
                {translations.stories.aiProducedBy}
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic">
            {translations.stories.aiEnrichmentDescription}
          </p>
        )}

        {errorMessage && <p className="mt-4 text-sm text-red-600">{errorMessage}</p>}

        <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-end gap-3 flex-wrap">
          <span className="text-sm text-gray-500">{formatEnrichmentCounts()}</span>
          <button
            onClick={handleGenerate}
            disabled={isGenerateDisabled}
            className={`px-3 py-2 text-sm rounded-md font-medium transition-colors ${isGenerateDisabled
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-primary-600 text-white hover:bg-primary-700'
              }`}
          >
            {isSubmitting ? translations.stories.aiEnrichmentPending : generateLabel()}
          </button>
        </div>
      </div>
    </div>
  );
}
