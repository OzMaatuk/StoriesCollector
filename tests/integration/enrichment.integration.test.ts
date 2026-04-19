import { StoryRepository } from '@/repositories/story.repository';
// Set dummy DATABASE_URL before any imports that use prisma
process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';

jest.mock('@/repositories/story.repository');
jest.mock('@/services/enrichment.service');

describe('Enrichment Integration', () => {
  let storyService: any;
  let mockRepository: jest.Mocked<StoryRepository>;
  let EnrichmentService: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.isolateModules(() => {
      const { StoryService } = require('@/services/story.service');
      const { EnrichmentService: ES } = require('@/services/enrichment.service');
      storyService = new StoryService();
      EnrichmentService = ES;
    });
    mockRepository = (storyService as any).repository;
  });

  it('should trigger enrichment when a story is created', async () => {
    const input = {
      name: 'Test',
      email: 'test@example.com',
      content: 'Some content',
      language: 'en',
    };

    const createdStory = {
      id: 'new-id',
      ...input,
      verifiedEmail: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockRepository.create.mockResolvedValue(createdStory as any);

    await storyService.createStory(input);

    // Verify that enrichStory was called
    const mockInstance = EnrichmentService.mock.instances[0];
    expect(mockInstance.enrichStory).toHaveBeenCalledWith(expect.objectContaining({
      id: 'new-id',
      content: 'Some content'
    }));
  });
});
