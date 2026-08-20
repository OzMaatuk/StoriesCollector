import { ENRICHMENT } from '@/lib/constants';
import { ConflictError, LimitExceededError } from '@/lib/errors';

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    $transaction: jest.fn(),
  },
}));

describe('StoryRepository.claimDraftForGeneration', () => {
  let repo: any;
  const mockTx: any = {};

  beforeEach(() => {
    jest.resetModules();
    // Require the repository after resetting modules so mocks apply
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { StoryRepository } = require('@/repositories/story.repository');
    repo = new StoryRepository();
  });

  it('creates a new draft and increments retryCount when under limit', async () => {
    const storyId = 'story-1';

    mockTx.$executeRaw = jest.fn().mockResolvedValue(undefined);
    mockTx.story = {
      findUnique: jest.fn().mockResolvedValue({ id: storyId, retryCount: 0 }),
      update: jest.fn().mockResolvedValue({}),
    };
    mockTx.generatedContent = {
      findMany: jest.fn().mockResolvedValue([]),
      create: jest
        .fn()
        .mockResolvedValue({ id: 'draft-1', storyId, status: 'pending', version: null }),
      update: jest.fn(),
    };

    const { default: prisma } = await import('@/lib/prisma');
    (prisma.$transaction as jest.Mock).mockImplementation(async (fn: any) => fn(mockTx));

    const draft = await repo.claimDraftForGeneration(storyId, ENRICHMENT.MAX_RETRIES);

    expect(mockTx.story.findUnique).toHaveBeenCalledWith({ where: { id: storyId } });
    expect(mockTx.generatedContent.findMany).toHaveBeenCalled();
    expect(mockTx.story.update).toHaveBeenCalled();
    expect(draft).toBeDefined();
    expect(draft.id).toBe('draft-1');
  });

  it('throws LimitExceededError when retryCount >= max', async () => {
    const storyId = 'story-2';

    mockTx.$executeRaw = jest.fn().mockResolvedValue(undefined);
    mockTx.story = {
      findUnique: jest.fn().mockResolvedValue({ id: storyId, retryCount: ENRICHMENT.MAX_RETRIES }),
      update: jest.fn().mockResolvedValue({}),
    };
    mockTx.generatedContent = {
      findMany: jest.fn().mockResolvedValue([]),
    };

    const { default: prisma } = await import('@/lib/prisma');
    (prisma.$transaction as jest.Mock).mockImplementation(async (fn: any) => fn(mockTx));

    await expect(repo.claimDraftForGeneration(storyId, ENRICHMENT.MAX_RETRIES)).rejects.toThrow(
      'This story has reached its enrichment limit'
    );
  });

  it('throws ConflictError when a non-stale draft is pending', async () => {
    const storyId = 'story-3';
    const recent = new Date();

    mockTx.$executeRaw = jest.fn().mockResolvedValue(undefined);
    mockTx.story = {
      findUnique: jest.fn().mockResolvedValue({ id: storyId, retryCount: 0 }),
      update: jest.fn().mockResolvedValue({}),
    };
    mockTx.generatedContent = {
      findMany: jest
        .fn()
        .mockResolvedValue([
          { id: 'd1', storyId, version: null, status: 'pending', updatedAt: recent },
        ]),
    };

    const { default: prisma } = await import('@/lib/prisma');
    (prisma.$transaction as jest.Mock).mockImplementation(async (fn: any) => fn(mockTx));

    await expect(repo.claimDraftForGeneration(storyId, ENRICHMENT.MAX_RETRIES)).rejects.toThrow(
      'An enrichment is already being generated for this story'
    );
  });
});
