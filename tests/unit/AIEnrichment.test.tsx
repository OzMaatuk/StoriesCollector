/** @jest-environment jsdom */
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import AIEnrichment from '@/components/AIEnrichment';
import { GeneratedContent, Translations } from '@/types';

global.fetch = jest.fn();

const mockTranslations: Translations = {
  stories: {
    aiEnrichmentTitle: 'AI Enrichment',
    aiEnrichmentPending: 'Pending...',
    aiEnrichmentFailed: 'Failed',
    aiProducedBy: 'Produced by AI',
    aiEnrichmentDescription: 'This is the description of the feature.',
    aiEnrichmentCounts: '{{versions}} versions · {{current}}/{{max}}',
    aiEnrichmentBackgroundNotice: 'The enrichment process is running in the background and may take up to one day to finish. Please refresh this page later to view your updated content.',
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

  it('displays background notice when pending draft is selected without polling loop', () => {
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

    render(
      <AIEnrichment
        storyId={storyId}
        initialContents={[mockPendingDraft]}
        selectedEnrichmentId={null}
        translations={mockTranslations}
      />
    );

    expect(screen.getByText(mockTranslations.stories.aiEnrichmentPending)).toBeInTheDocument();
    expect(screen.getByText(mockTranslations.stories.aiEnrichmentBackgroundNotice)).toBeInTheDocument();
  });

  it('displays saved version content when selected and draft is separately pending', () => {
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

    render(
      <AIEnrichment
        storyId={storyId}
        initialContents={[mockSavedVersion, mockPendingDraft]}
        selectedEnrichmentId={mockSavedVersion.id}
        translations={mockTranslations}
      />
    );

    expect(screen.getByText('Loaded Content')).toBeInTheDocument();
    expect(screen.queryByText(mockTranslations.stories.aiEnrichmentBackgroundNotice)).not.toBeInTheDocument();
  });
});
