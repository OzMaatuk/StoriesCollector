import { EnrichmentService } from '@/services/enrichment.service';
import { LLMService } from '@/services/llm.service';
import { StoryRepository } from '@/repositories/story.repository';
import fs from 'fs';
import { Story } from '@/types';

// Mock dependencies
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
    (fs.readFileSync as jest.Mock).mockReturnValue('Retell {{title}}: {{content}}');
    
    // Set environment variable
    process.env.ENABLE_LLM_ENRICHMENT = 'true';
    process.env.LLM_MODEL_NAME = 'test-model';

    service = new EnrichmentService();
    mockLLMService = (service as unknown as { llmService: LLMService }).llmService as jest.Mocked<LLMService>;
    mockRepository = (service as unknown as { repository: StoryRepository }).repository as jest.Mocked<StoryRepository>;
  });

  it('should successfully enrich a story', async () => {
    const mockedGeneratedText = 'Enriched content from Rabbi Nachman';
    const mockEnrichmentId = 'enrichment-123';
    
    mockLLMService.generateCompletion.mockResolvedValue(mockedGeneratedText);
    mockRepository.createGeneratedContent.mockResolvedValue({
      id: mockEnrichmentId,
      storyId: mockStory.id,
      providerName: 'OpenAI-Compatible',
      modelName: 'test-model',
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as Awaited<ReturnType<StoryRepository['createGeneratedContent']>>);
    mockRepository.updateGeneratedContent.mockResolvedValue({} as unknown as Awaited<ReturnType<StoryRepository['updateGeneratedContent']>>);

    await service.enrichStory(mockStory);

    // Verify database updates
    expect(mockRepository.createGeneratedContent).toHaveBeenCalledWith({
      storyId: mockStory.id,
      providerName: 'OpenAI-Compatible',
      modelName: 'test-model',
      status: 'pending',
    });

    expect(mockLLMService.generateCompletion).toHaveBeenCalledWith(
      expect.stringContaining(mockStory.title!)
    );

    expect(mockRepository.updateGeneratedContent).toHaveBeenCalledWith(mockEnrichmentId, {
      generatedText: mockedGeneratedText,
      status: 'completed',
    });
  });

  it('should handle LLM failure', async () => {
    const errorMsg = 'API Quota exceeded';
    const mockEnrichmentId = 'enrichment-456';
    
    mockLLMService.generateCompletion.mockRejectedValue(new Error(errorMsg));
    mockRepository.createGeneratedContent.mockResolvedValue({
      id: mockEnrichmentId,
      storyId: mockStory.id,
      providerName: 'OpenAI-Compatible',
      modelName: 'test-model',
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as Awaited<ReturnType<StoryRepository['createGeneratedContent']>>);

    await service.enrichStory(mockStory);

    expect(mockRepository.updateGeneratedContent).toHaveBeenCalledWith(mockEnrichmentId, {
      status: 'failed',
      errorMessage: errorMsg,
    });
  });

  it('should not enrich if disabled', async () => {
    process.env.ENABLE_LLM_ENRICHMENT = 'false';
    
    await service.enrichStory(mockStory);

    expect(mockRepository.createGeneratedContent).not.toHaveBeenCalled();
    expect(mockLLMService.generateCompletion).not.toHaveBeenCalled();
  });
});
