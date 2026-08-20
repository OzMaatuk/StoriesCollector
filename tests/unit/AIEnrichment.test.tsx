/** @jest-environment jsdom */
import '@testing-library/jest-dom';
import { render, screen, fireEvent, act } from '@testing-library/react';
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
    aiConfirmOverwriteDraft: 'You have an unsaved draft enrichment. Generating a new one will delete this draft. Do you want to proceed?',
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
        retryCount={0}
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
        retryCount={1}
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
        retryCount={1}
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
        retryCount={1}
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
        retryCount={1}
      />
    );

    expect(screen.getByText('Loaded Content')).toBeInTheDocument();
    expect(screen.queryByText(mockTranslations.stories.aiEnrichmentBackgroundNotice)).not.toBeInTheDocument();
  });

  it('presents completed non-empty draft version first even when selectedEnrichmentId points to a saved version', () => {
    const mockSavedVersion: GeneratedContent = {
      id: 'saved-id',
      storyId,
      providerName: 'Test',
      modelName: 'Model',
      status: 'completed',
      generatedText: 'Saved Version Text',
      version: 1,
      createdAt: new Date(Date.now() - 10000),
      updatedAt: new Date(Date.now() - 10000),
    };

    const mockCompletedDraft: GeneratedContent = {
      id: 'draft-id',
      storyId,
      providerName: 'Test',
      modelName: 'Model',
      status: 'completed',
      generatedText: 'Unsaved Draft Text',
      version: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    render(
      <AIEnrichment
        storyId={storyId}
        initialContents={[mockSavedVersion, mockCompletedDraft]}
        selectedEnrichmentId={mockSavedVersion.id}
        translations={mockTranslations}
        retryCount={1}
      />
    );

    expect(screen.getByText('Unsaved Draft Text')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('prompts confirmation when user clicks generate and an unsaved non-empty draft exists', async () => {
    const mockCompletedDraft: GeneratedContent = {
      id: 'draft-id',
      storyId,
      providerName: 'Test',
      modelName: 'Model',
      status: 'completed',
      generatedText: 'Unsaved Draft Text',
      version: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const confirmSpy = jest.spyOn(window, 'confirm').mockImplementation(() => false);

    render(
      <AIEnrichment
        storyId={storyId}
        initialContents={[mockCompletedDraft]}
        selectedEnrichmentId={null}
        translations={mockTranslations}
        retryCount={0}
      />
    );

    const generateBtn = screen.getByRole('button', { name: 'Generate' });
    await act(async () => {
      fireEvent.click(generateBtn);
    });

    expect(confirmSpy).toHaveBeenCalledWith(mockTranslations.stories.aiConfirmOverwriteDraft);
    expect(global.fetch).not.toHaveBeenCalled();

    confirmSpy.mockRestore();
  });

  it('proceeds with generation when user confirms overwrite alert', async () => {
    const mockCompletedDraft: GeneratedContent = {
      id: 'draft-id',
      storyId,
      providerName: 'Test',
      modelName: 'Model',
      status: 'completed',
      generatedText: 'Unsaved Draft Text',
      version: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const newDraft: GeneratedContent = {
      id: 'new-draft-id',
      storyId,
      providerName: 'Test',
      modelName: 'Model',
      status: 'pending',
      generatedText: null,
      version: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const confirmSpy = jest.spyOn(window, 'confirm').mockImplementation(() => true);
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ draft: newDraft }),
    });

    render(
      <AIEnrichment
        storyId={storyId}
        initialContents={[mockCompletedDraft]}
        selectedEnrichmentId={null}
        translations={mockTranslations}
        retryCount={0}
      />
    );

    const generateBtn = screen.getByRole('button', { name: 'Generate' });
    fireEvent.click(generateBtn);

    expect(confirmSpy).toHaveBeenCalledWith(mockTranslations.stories.aiConfirmOverwriteDraft);
    expect(global.fetch).toHaveBeenCalledWith('/api/stories/test-story-id/enrichment', {
      method: 'POST',
    });

    confirmSpy.mockRestore();
  });
});
