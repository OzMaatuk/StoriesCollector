// Set dummy DATABASE_URL before any imports that use prisma
process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';

jest.mock('@/repositories/story.repository');
jest.mock('@/services/enrichment.service', () => ({
  __esModule: true,
  EnrichmentService: jest.fn().mockImplementation(() => ({
    enrichStory: jest.fn(),
  })),
}));

import { StoryRepository } from '@/repositories/story.repository';
import { Story } from '@/types';
import type { StoryService } from '@/services/story.service';

describe('Enrichment Integration', () => {
  let storyService: StoryService;
  let mockRepository: jest.Mocked<StoryRepository>;
  let EnrichmentServiceMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { StoryService } = require('@/services/story.service');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { EnrichmentService } = require('@/services/enrichment.service');

    EnrichmentServiceMock = EnrichmentService as jest.Mock;
    storyService = new StoryService();
    mockRepository = (storyService as unknown as { repository: StoryRepository }).repository as jest.Mocked<StoryRepository>;
  });

  it('should trigger enrichment when a story is created', async () => {
    const input = {
      name: 'Test',
      email: 'test@example.com',
      content: 'Some content',
      language: 'en',
    };

    const createdStory: Story = {
      id: 'new-id',
      ...input,
      verifiedEmail: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockRepository.create.mockResolvedValue(createdStory);

    await storyService.createStory(input);

    // Verify that enrichStory was called
    const mockInstance = EnrichmentServiceMock.mock.results[0]?.value as { enrichStory?: unknown } | undefined;
    expect((mockInstance as { enrichStory: jest.Mock }).enrichStory).toHaveBeenCalledWith(expect.objectContaining({
      id: 'new-id',
      content: 'Some content'
    }));
  });
});
