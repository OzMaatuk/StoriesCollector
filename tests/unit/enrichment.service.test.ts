import { EnrichmentService } from '@/services/enrichment.service';
import { LLMService } from '@/services/llm.service';
import { StoryRepository } from '@/repositories/story.repository';
import fs from 'fs';
import { Story } from '@/types';

jest.mock('@/services/llm.service');
jest.mock('@/repositories/story.repository');
jest.mock('fs');
jest.mock('@/lib/logger');

describe('EnrichmentService', () => {
  let service: EnrichmentService;
  let mockLLMService: jest.Mocked<LLMService>;
  let mockRepository: jest.Mocked<StoryRepository>;

  const mockStory: Story = {
    id: 'story-123',
    name: 'Test Teller',
    email: 'test@example.com',
    title: 'Test Title',
    content: 'Long ago in a land far away...',
    language: 'en',
    verifiedEmail: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (fs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
      if (String(filePath).includes('_system_')) {
        return 'Return only the final answer. Mock system prompt.';
      }
      return 'Retell {{title}}: {{content}}';
    });

    process.env.ENABLE_LLM_ENRICHMENT = 'true';
    process.env.LLM_MODEL_NAME = 'test-model';
    process.env.LLM_EXECUTION_METHOD = 'direct';

    service = new EnrichmentService();
    mockLLMService = (service as unknown as { llmService: LLMService })
      .llmService as jest.Mocked<LLMService>;
    mockRepository = (service as unknown as { repository: StoryRepository })
      .repository as jest.Mocked<StoryRepository>;
  });

  it('should successfully enrich a story directly', async () => {
    const mockedGeneratedText = 'Enriched content from Rabbi Nachman';
    const mockEnrichmentId = 'enrichment-123';

    mockLLMService.generateCompletion.mockResolvedValue(mockedGeneratedText);
    mockRepository.getGeneratedContentsByStoryId.mockResolvedValue([]);
    mockRepository.createGeneratedContent.mockResolvedValue({
      id: mockEnrichmentId,
      storyId: mockStory.id,
      providerName: 'llama-cpp-local',
      modelName: 'test-model',
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as Awaited<ReturnType<StoryRepository['createGeneratedContent']>>);
    mockRepository.updateGeneratedContent.mockResolvedValue(
      {} as unknown as Awaited<ReturnType<StoryRepository['updateGeneratedContent']>>
    );

    await service.enrichStory(mockStory);

    expect(mockRepository.createGeneratedContent).toHaveBeenCalledWith({
      storyId: mockStory.id,
      providerName: 'llama-cpp-local',
      modelName: 'test-model',
      status: 'pending',
      version: null,
      retryCount: 1,
    });

    expect(mockLLMService.generateCompletion).toHaveBeenCalledWith(
      expect.stringContaining('Return only the final answer'),
      expect.stringContaining(mockStory.title!)
    );

    expect(mockRepository.updateGeneratedContent).toHaveBeenCalledWith(mockEnrichmentId, {
      generatedText: mockedGeneratedText,
      status: 'completed',
    });
  });

  it('should delegate enrichment to Python backend when LLM_EXECUTION_METHOD is async_python', async () => {
    process.env.LLM_EXECUTION_METHOD = 'async_python';
    process.env.PYTHON_BACKEND_URL = 'http://127.0.0.1:8000';
    delete process.env.PYTHON_BACKEND_SECRET;

    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ enrichment_id: 'enrichment-python-1', status: 'pending' }),
    });
    global.fetch = mockFetch;

    mockRepository.getGeneratedContentsByStoryId.mockResolvedValue([]);
    mockRepository.createGeneratedContent.mockResolvedValue({
      id: 'enrichment-python-1',
      storyId: mockStory.id,
      providerName: 'llama-cpp-local',
      modelName: 'test-model',
      status: 'pending',
      version: null,
      retryCount: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as Awaited<ReturnType<StoryRepository['createGeneratedContent']>>);

    await service.enrichStory(mockStory);

    expect(mockFetch).toHaveBeenCalledWith(
      'http://127.0.0.1:8000/api/generate',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    );

    expect(mockLLMService.generateCompletion).not.toHaveBeenCalled();
  });

  it('should handle LLM failure in direct mode', async () => {
    const errorMsg = 'API Quota exceeded';
    const mockEnrichmentId = 'enrichment-456';

    mockLLMService.generateCompletion.mockRejectedValue(new Error(errorMsg));
    mockRepository.getGeneratedContentsByStoryId.mockResolvedValue([]);
    mockRepository.createGeneratedContent.mockResolvedValue({
      id: mockEnrichmentId,
      storyId: mockStory.id,
      providerName: 'llama-cpp-local',
      modelName: 'test-model',
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as Awaited<ReturnType<StoryRepository['createGeneratedContent']>>);
    mockRepository.updateGeneratedContent.mockResolvedValue(
      {} as unknown as Awaited<ReturnType<StoryRepository['updateGeneratedContent']>>
    );

    await service.enrichStory(mockStory);

    expect(mockRepository.updateGeneratedContent).toHaveBeenCalledWith(mockEnrichmentId, {
      status: 'failed',
      errorMessage: errorMsg,
    });
  });

  it('uses locale-based labels for non-English enrichment prompts in direct mode', async () => {
    const hebrewStory = {
      ...mockStory,
      language: 'he' as const,
      title: 'כותרת בדיקה',
      storyBackground: 'רקע לבדיקה',
      content: 'תוכן לבדיקה',
    };

    mockLLMService.generateCompletion.mockResolvedValue('done');
    mockRepository.getGeneratedContentsByStoryId.mockResolvedValue([]);
    mockRepository.createGeneratedContent.mockResolvedValue({
      id: 'enrichment-789',
      storyId: hebrewStory.id,
      providerName: 'llama-cpp-local',
      modelName: 'test-model',
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as Awaited<ReturnType<StoryRepository['createGeneratedContent']>>);
    mockRepository.updateGeneratedContent.mockResolvedValue(
      {} as unknown as Awaited<ReturnType<StoryRepository['updateGeneratedContent']>>
    );

    await service.enrichStory(hebrewStory);

    const [systemPrompt, userContent] = mockLLMService.generateCompletion.mock.calls[0] as [string, string];
    expect(systemPrompt).toContain('Return only the final answer');
    expect(userContent).toContain('כותרת הסיפור');
    expect(userContent).toContain('רקע לסיפור');
    expect(userContent).toContain(hebrewStory.content);
  });

  it('should not enrich if disabled', async () => {
    process.env.ENABLE_LLM_ENRICHMENT = 'false';

    await service.enrichStory(mockStory);

    expect(mockRepository.createGeneratedContent).not.toHaveBeenCalled();
    expect(mockLLMService.generateCompletion).not.toHaveBeenCalled();
  });
});
