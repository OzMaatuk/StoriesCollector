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
    mockLLMService = (service as any).llmService;
    mockRepository = (service as any).repository;
  });

  it('should successfully enrich a story', async () => {
    const mockedGeneratedText = 'Enriched content from Rabbi Nachman';
    mockLLMService.generateCompletion.mockResolvedValue(mockedGeneratedText);
    mockRepository.createGeneratedContent.mockResolvedValue({} as any);
    mockRepository.updateGeneratedContent.mockResolvedValue({} as any);

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

    expect(mockRepository.updateGeneratedContent).toHaveBeenCalledWith(mockStory.id, {
      generatedText: mockedGeneratedText,
      status: 'completed',
    });
  });

  it('should handle LLM failure', async () => {
    const errorMsg = 'API Quota exceeded';
    mockLLMService.generateCompletion.mockRejectedValue(new Error(errorMsg));
    mockRepository.createGeneratedContent.mockResolvedValue({} as any);

    await service.enrichStory(mockStory);

    expect(mockRepository.updateGeneratedContent).toHaveBeenCalledWith(mockStory.id, {
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
