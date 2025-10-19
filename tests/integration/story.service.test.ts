import { StoryService } from '@/services/story.service';
import { StoryRepository } from '@/repositories/story.repository';

// Mock the repository
jest.mock('@/repositories/story.repository');

describe('StoryService', () => {
  let service: StoryService;
  let mockRepository: jest.Mocked<StoryRepository>;

  beforeEach(() => {
    service = new StoryService();
    mockRepository = new StoryRepository() as jest.Mocked<StoryRepository>;
    (service as any).repository = mockRepository;
  });

  describe('createStory', () => {
    it('should create a story with valid data', async () => {
      const input = {
        name: 'John Doe',
        phone: '+1234567890',
        email: 'john@example.com',
        content: 'This is my story.',
        language: 'en',
      };

      const expectedStory = {
        id: '123',
        ...input,
        verifiedPhone: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.create.mockResolvedValue(expectedStory as any);

      const result = await service.createStory(input);

      expect(result).toEqual(expectedStory);
      expect(mockRepository.create).toHaveBeenCalled();
    });

    it('should sanitize input data', async () => {
      const input = {
        name: 'John<script>alert("xss")</script>Doe',
        phone: '+1234567890',
        content: '<p>This is my <strong>story</strong>.</p>',
        language: 'en',
      };

      mockRepository.create.mockResolvedValue({} as any);

      await service.createStory(input);

      const callArg = mockRepository.create.mock.calls[0][0];
      expect(callArg.name).not.toContain('<script>');
    });

    it('should throw error for invalid data', async () => {
      const input = {
        name: 'John Doe',
        phone: 'invalid-phone',
        content: 'Story',
        language: 'en',
      };

      await expect(service.createStory(input)).rejects.toThrow();
    });
  });

  describe('getStories', () => {
    it('should return paginated stories', async () => {
      const mockStories = [
        {
          id: '1',
          name: 'John',
          phone: '+1234567890',
          content: 'Story 1',
          language: 'en',
          verifiedPhone: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockRepository.findMany.mockResolvedValue(mockStories as any);
      mockRepository.count.mockResolvedValue(1);

      const result = await service.getStories({ page: 1, pageSize: 10 });

      expect(result.data).toEqual(mockStories);
      expect(result.pagination.totalCount).toBe(1);
      expect(result.pagination.page).toBe(1);
    });
  });
});
