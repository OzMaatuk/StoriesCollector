/** @jest-environment jsdom */
import '@testing-library/jest-dom';
import { render, screen, act, waitFor } from '@testing-library/react';
import AIEnrichment from '@/components/AIEnrichment';
import { Translations } from '@/types';

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
} as any;

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
    const mockContent = {
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
        initialContent={mockContent as any}
        translations={mockTranslations}
      />
    );

    expect(screen.getByText(mockTranslations.stories.aiEnrichmentDescription)).toBeInTheDocument();
    expect(screen.getByText('Enriched Text')).toBeInTheDocument();
    expect(screen.getByText(mockTranslations.stories.aiProducedBy)).toBeInTheDocument();
  });

  it('polls for content when pending', async () => {
    const mockPendingContent = {
      status: 'pending',
    };

    const mockCompletedContent = {
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
        initialContent={mockPendingContent as any}
        translations={mockTranslations}
      />
    );

    expect(screen.getByText(mockTranslations.stories.aiEnrichmentPending)).toBeInTheDocument();

    // Get the interval callback and execute it manually
    const callback = setIntervalSpy.mock.calls[0][0] as Function;
    
    await act(async () => {
      await callback();
    });

    // Verify the content changed
    expect(screen.getByText('Polled Content')).toBeInTheDocument();
    
    expect(screen.getByText(mockTranslations.stories.aiEnrichmentDescription)).toBeInTheDocument();
    
    setIntervalSpy.mockRestore();
  });
});
