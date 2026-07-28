'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { GeneratedContent, Translations } from '@/types';
import { ENRICHMENT } from '@/lib/constants';

interface AIEnrichmentProps {
  storyId: string;
  initialContents: GeneratedContent[];
  selectedEnrichmentId?: string | null;
  translations: Translations;
}

// Normalise whatever the API returns (single object or array) into an array.
const toArray = (
  contents: GeneratedContent | GeneratedContent[] | null | undefined
): GeneratedContent[] => {
  if (!contents) return [];
  return Array.isArray(contents) ? contents : [contents];
};

// Sort: saved versions (v1, v2 …) ascending, then draft (version === null) last.
const sortContents = (
  contents: GeneratedContent | GeneratedContent[] | null | undefined
): GeneratedContent[] =>
  [...toArray(contents)].sort((a, b) => {
    const aV = a.version ?? Number.POSITIVE_INFINITY;
    const bV = b.version ?? Number.POSITIVE_INFINITY;
    if (aV !== bV) return aV - bV;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

// Coerce ISO-string dates that come back from fetch JSON into real Date objects.
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
}: AIEnrichmentProps) {
  const [contents, setContents] = useState<GeneratedContent[]>(
    sortContents(initialContents)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Derived state ─────────────────────────────────────────────────────────────
  const sortedContents = useMemo(() => sortContents(contents), [contents]);

  // The draft slot is always the item with version === null.
  const draftContent = useMemo(
    () => sortedContents.find((c) => c.version == null) ?? null,
    [sortedContents]
  );

  const savedVersions = useMemo(
    () => sortedContents.filter((c) => c.version != null),
    [sortedContents]
  );

  // Selected ID: if the caller provides a selectedEnrichmentId that maps to a
  // saved version, honour it (user navigating back to a story they already saved).
  // Otherwise default to the draft slot so it's always the starting view.
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    if (selectedEnrichmentId) {
      const pinned = sortContents(initialContents).find(
        (c) => c.id === selectedEnrichmentId && c.version != null
      );
      if (pinned) return pinned.id;
    }
    return draftContent?.id ?? null;
  });

  const selectedContent = useMemo(() => {
    // If selectedId still exists in the current list, use it.
    // Otherwise (e.g. after a save replaced the draft row) fall back to the
    // new draft.  This avoids a setState-in-effect to re-anchor selection.
    const found = selectedId ? sortedContents.find((c) => c.id === selectedId) : null;
    return found ?? draftContent ?? null;
  }, [selectedId, sortedContents, draftContent]);

  const selectedIsDraft = selectedContent?.version == null;

  // API helpers ────────────────────────────────────────────────────────────────
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
        setContents(sorted);

        // Keep selection on the pinned id if it exists in the new data,
        // otherwise stay on the draft.
        const target = pinToId
          ? sorted.find((c) => c.id === pinToId)
          : sorted.find((c) => c.version == null);
        if (target) setSelectedId(target.id);

        return sorted;
      } catch (err) {
        console.error('Failed to refresh enrichment contents:', err);
        return null;
      }
    },
    [storyId]
  );

  // Poll while the selected content is pending ────────────────────────────────
  useEffect(() => {
    if (!selectedContent || selectedContent.status !== 'pending') return;

    const id = selectedContent.id;
    const interval = setInterval(() => {
      void refreshContents(id);
    }, 3000);

    return () => clearInterval(interval);
  }, [refreshContents, selectedContent]);

  // Handlers ───────────────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/stories/${storyId}/enrichment`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to trigger enrichment generation');

      // POST returns the draft record immediately so we can show the spinner
      // before the LLM finishes.
      const { draft } = (await response.json()) as { draft: GeneratedContent };

      if (draft) {
        const normalized = normalizeDates(draft);
        setContents((prev) => [
          ...prev.filter((c) => c.version != null), // keep saved versions
          normalized,                                 // replace draft slot
        ]);
        setSelectedId(normalized.id);
      }
    } catch (err) {
      setErrorMessage('Unable to start enrichment generation. Please try again.');
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

      // Refresh to get the updated list: saved row now has a version number
      // and the server has already created a fresh empty draft.
      await refreshContents(null); // null → pins to new draft
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
    const attempts = draftContent?.retryCount ?? 0;
    return attempts > 0
      ? `${translations.stories.aiRegenerate}`
      : translations.stories.aiGenerate;
  };

  const formatEnrichmentCounts = (): string =>
    translations.stories.aiEnrichmentCounts
      .replace('{{versions}}', String(savedVersions.length))
      .replace('{{current}}', String(draftContent?.retryCount ?? 0))
      .replace('{{max}}', String(ENRICHMENT.MAX_RETRIES));

  const isPending = selectedContent?.status === 'pending';
  const isFailed  = selectedContent?.status === 'failed';
  const generationCount = draftContent?.retryCount ?? 0;
  const retriesExhausted = generationCount >= ENRICHMENT.MAX_RETRIES;
  const isGenerateDisabled = isSubmitting || isPending || retriesExhausted;

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="mt-8 pt-8 border-t border-gray-200">
      <div className="bg-gray-50 p-6 rounded-lg border-l-4 border-primary-500">

        {/* Header row */}
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
            {/* Version / draft picker — always rendered */}
            <select
              value={selectedContent?.id ?? ''}
              onChange={(e) => handleSelect(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md bg-white"
            >
              {savedVersions.map((c) => (
                <option key={c.id} value={c.id}>
                  v{c.version}
                </option>
              ))}
              {/* Draft option — always present */}
              <option value={draftContent?.id ?? ''}>
                {isPending && selectedIsDraft
                  ? 'Draft (generating…)'
                  : isFailed && selectedIsDraft
                    ? 'Draft (failed)'
                    : 'Draft'}
              </option>
            </select>

            {/* Save — only when draft has completed text */}
            {selectedIsDraft &&
              selectedContent?.status === 'completed' &&
              selectedContent.generatedText?.trim() && (
                <button
                  onClick={handleSave}
                  disabled={isSubmitting}
                  className={`px-3 py-2 text-sm rounded-md font-medium transition-colors ${
                    isSubmitting
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {translations.stories.save}
                </button>
              )}
          </div>
        </div>

        {/* Content area */}
        {isPending ? (
          <div className="flex items-center gap-3 text-primary-700">
            <svg
              className="animate-spin h-5 w-5 text-primary-600"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>{translations.stories.aiEnrichmentPending}</span>
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
          /* Empty draft — no content yet */
          <p className="text-sm text-gray-400 italic">
            {translations.stories.aiEnrichmentDescription}
          </p>
        )}

        {errorMessage && (
          <p className="mt-4 text-sm text-red-600">{errorMessage}</p>
        )}

        {/* Generate action — pinned to the bottom of the enrichment box */}
        <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-end gap-3 flex-wrap">
          <span className="text-sm text-gray-500">{formatEnrichmentCounts()}</span>
          <button
            onClick={handleGenerate}
            disabled={isGenerateDisabled}
            className={`px-3 py-2 text-sm rounded-md font-medium transition-colors ${
              isGenerateDisabled
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-primary-600 text-white hover:bg-primary-700'
            }`}
          >
            {isSubmitting
              ? translations.stories.aiEnrichmentPending
              : generateLabel()}
          </button>
        </div>
      </div>
    </div>
  );
}
