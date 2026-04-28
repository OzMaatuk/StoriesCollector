/** @jest-environment jsdom */
import '@testing-library/jest-dom';
import { render, screen, act } from '@testing-library/react';
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

  it('renders enrichment content and description when content is present', () => {
    const mockContent: GeneratedContent = {
      id: '1',
      storyId: storyId,
      status: 'completed',
      generatedText: 'Enriched Text',
      providerName: 'Test',
      modelName: 'Model',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    render(
      <AIEnrichment
        storyId={storyId}
        initialContents={[mockContent]}
        selectedEnrichmentId={null}
        translations={mockTranslations}
      />
    );

    expect(screen.getByText(mockTranslations.stories.aiEnrichmentDescription)).toBeInTheDocument();
    expect(screen.getByText('Enriched Text')).toBeInTheDocument();
    expect(screen.getByText(mockTranslations.stories.aiProducedBy)).toBeInTheDocument();
  });

  it('polls for content when pending', async () => {
    const mockPendingContent: GeneratedContent = {
      id: 'pending-id',
      storyId,
      providerName: 'Test',
      modelName: 'Model',
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockCompletedContent: GeneratedContent[] = [{
      id: 'completed-id',
      storyId,
      providerName: 'Test',
      modelName: 'Model',
      status: 'completed',
      generatedText: 'Polled Content',
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
    }];

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockCompletedContent,
      });

    const setIntervalSpy = jest.spyOn(global, 'setInterval');
    render(
      <AIEnrichment
        storyId={storyId}
        initialContents={[mockPendingContent]}
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
    expect(screen.getByText(mockTranslations.stories.aiEnrichmentDescription)).toBeInTheDocument();

    setIntervalSpy.mockRestore();
  });
});
