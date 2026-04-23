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

  it('renders nothing initially when content is null', () => {
    render(
      <AIEnrichment
        storyId={storyId}
        initialContent={null}
        translations={mockTranslations}
      />
    );

    expect(screen.queryByText(mockTranslations.stories.aiEnrichmentTitle)).not.toBeInTheDocument();
  });

  it('renders enrichment content and description when content is present', async () => {
    const mockContent: GeneratedContent = {
      id: '1',
      storyId: storyId,
      status: 'completed',
      generatedText: 'Enriched Text',
      providerName: 'Test',
      modelName: 'Model',
      retryCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    render(
      <AIEnrichment
        storyId={storyId}
        initialContent={mockContent}
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
      retryCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockCompletedContent: Partial<GeneratedContent> = {
      status: 'completed',
      generatedText: 'Polled Content',
    };

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockCompletedContent,
      });

    const setIntervalSpy = jest.spyOn(global, 'setInterval');
    
    render(
      <AIEnrichment
        storyId={storyId}
        initialContent={mockPendingContent}
        translations={mockTranslations}
      />
    );

    expect(screen.getByText(mockTranslations.stories.aiEnrichmentPending)).toBeInTheDocument();

    // Get the interval callback and execute it manually
    const callback = setIntervalSpy.mock.calls[0][0] as () => void | Promise<void>;
    
    await act(async () => {
      await callback();
    });

    // Verify the content changed
    expect(screen.getByText('Polled Content')).toBeInTheDocument();
    
    expect(screen.getByText(mockTranslations.stories.aiEnrichmentDescription)).toBeInTheDocument();
    
    setIntervalSpy.mockRestore();
  });
});
