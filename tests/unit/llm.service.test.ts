import { LLMService } from '@/services/llm.service';
import { callLLM } from '@/lib/llm-client';

jest.mock('@/lib/llm-client', () => ({
  callLLM: jest.fn(),
}));

describe('LLMService', () => {
  const mockedCallLLM = callLLM as jest.MockedFunction<typeof callLLM>;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.LLM_MODEL_NAME;
  });

  it('uses the default model when no model is configured', async () => {
    mockedCallLLM.mockResolvedValue({
      choices: [{ message: { content: 'ok' } }],
    } as Awaited<ReturnType<typeof callLLM>>);

    const service = new LLMService();
    await service.generateCompletion('hello');

    expect(mockedCallLLM).toHaveBeenCalledWith(expect.objectContaining({ model: 'default' }));
  });
});
