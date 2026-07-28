/** @jest-environment jsdom */
import '@testing-library/jest-dom';
import { render, screen, act, fireEvent } from '@testing-library/react';
import AIEnrichment from '@/components/AIEnrichment';
import { GeneratedContent, Translations } from '@/types';

// Mock fetch
global.fetch = jest.fn();

const mockTranslations: Translations = {
  stories: {
    aiEnrichmentTitle: 'AI Enrichment',
    aiEnrichmentPending: 'Pending...',
    aiEnrichmentFailed: 'Failed',
    aiProducedBy: 'Produced by AI',
    aiEnrichmentDescription: 'This is the description of the feature.',
    aiEnrichmentCounts: '{{versions}} versions · {{current}}/{{max}}',
    aiRegenerate: 'Regenerate',
    aiGenerate: 'Generate',
    save: 'Save',
    title: '',
    verifiedEmail: '',
    allLanguages: '',
    noStories: '',
    readMore: '',
  },
} as unknown as Translations;

describe('AIEnrichment Component', () => {
  const storyId = 'test-story-id';

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders generate button when no content exists', () => {
    render(
      <AIEnrichment
        storyId={storyId}
        initialContents={[]}
        selectedEnrichmentId={null}
        translations={mockTranslations}
      />
    );

    expect(screen.getByText(mockTranslations.stories.aiEnrichmentTitle)).toBeInTheDocument();
    expect(screen.getByText('Generate')).toBeInTheDocument();
  });

  it('renders enrichment content when a saved version is selected', () => {
    // A saved version (version !== null) — aiProducedBy footer should appear.
    const mockContent: GeneratedContent = {
      id: '1',
      storyId: storyId,
      status: 'completed',
      generatedText: 'Enriched Text',
      providerName: 'Test',
      modelName: 'Model',
      retryCount: 1,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // The component also needs a draft slot (always-present in production);
    // supply one so the dropdown renders correctly.
    const mockDraft: GeneratedContent = {
      id: 'draft-1',
      storyId: storyId,
      status: 'completed',
      generatedText: null,
      providerName: 'Test',
      modelName: 'Model',
      retryCount: 0,
      version: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    render(
      <AIEnrichment
        storyId={storyId}
        initialContents={[mockContent, mockDraft]}
        selectedEnrichmentId={mockContent.id}
        translations={mockTranslations}
      />
    );

    expect(screen.getByText(mockTranslations.stories.aiEnrichmentDescription)).toBeInTheDocument();
    expect(screen.getByText('Enriched Text')).toBeInTheDocument();
    expect(screen.getByText(mockTranslations.stories.aiProducedBy)).toBeInTheDocument();
  });

  it('requests the selected enrichment by id when the dropdown selection changes', async () => {
    const mockContents: GeneratedContent[] = [
      {
        id: '1',
        storyId,
        providerName: 'Test',
        modelName: 'Model',
        status: 'completed',
        generatedText: 'First version',
        retryCount: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      },
      {
        id: '2',
        storyId,
        providerName: 'Test',
        modelName: 'Model',
        status: 'completed',
        generatedText: 'Second version',
        retryCount: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 2,
      },
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockContents[1],
    });

    render(
      <AIEnrichment
        storyId={storyId}
        initialContents={mockContents}
        selectedEnrichmentId={null}
        translations={mockTranslations}
      />
    );

    fireEvent.change(screen.getByRole('combobox'), { target: { value: '2' } });

    expect(global.fetch).toHaveBeenCalledWith('/api/stories/test-story-id/enrichment?enrichmentId=2');
  });

  it('polls for content when pending draft is selected', async () => {
    // Draft (version === null) starts as pending.
    const mockPendingDraft: GeneratedContent = {
      id: 'pending-id',
      storyId,
      providerName: 'Test',
      modelName: 'Model',
      status: 'pending',
      retryCount: 1,
      version: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Poll response returns the same draft now completed with text.
    const mockCompletedDraft: GeneratedContent = {
      id: 'pending-id',
      storyId,
      providerName: 'Test',
      modelName: 'Model',
      status: 'completed',
      generatedText: 'Polled Content',
      retryCount: 1,
      version: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [mockCompletedDraft],
    });

    const setIntervalSpy = jest.spyOn(global, 'setInterval');
    render(
      <AIEnrichment
        storyId={storyId}
        initialContents={[mockPendingDraft]}
        selectedEnrichmentId={null}
        translations={mockTranslations}
      />
    );

    expect(screen.getByText(mockTranslations.stories.aiEnrichmentPending)).toBeInTheDocument();

    const callback = setIntervalSpy.mock.calls[0][0] as () => void | Promise<void>;

    await act(async () => {
      await callback();
    });

    expect(screen.getByText('Polled Content')).toBeInTheDocument();

    setIntervalSpy.mockRestore();
  });

  it('does not start polling when a saved version is selected and draft is separately pending', () => {
    // Saved version (version:1, completed) — this is what selectedEnrichmentId points to.
    const mockSavedVersion: GeneratedContent = {
      id: 'completed-id',
      storyId,
      providerName: 'Test',
      modelName: 'Model',
      status: 'completed',
      generatedText: 'Loaded Content',
      retryCount: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
    };

    // Draft slot is separately pending (a background job is running) but is
    // not the selected item.
    const mockPendingDraft: GeneratedContent = {
      id: 'stale-pending-id',
      storyId,
      providerName: 'Test',
      modelName: 'Model',
      status: 'pending',
      retryCount: 1,
      version: null,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
      updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
    };

    const setIntervalSpy = jest.spyOn(global, 'setInterval');
    render(
      <AIEnrichment
        storyId={storyId}
        initialContents={[mockSavedVersion, mockPendingDraft]}
        // Explicitly select the saved version — component should respect this
        // and not default to the pending draft.
        selectedEnrichmentId={mockSavedVersion.id}
        translations={mockTranslations}
      />
    );

    expect(screen.getByText('Loaded Content')).toBeInTheDocument();
    expect(setIntervalSpy).not.toHaveBeenCalled();

    setIntervalSpy.mockRestore();
  });
});
