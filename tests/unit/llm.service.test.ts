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
    await service.generateCompletion('hello', 'world');

    expect(mockedCallLLM).toHaveBeenCalledWith(expect.objectContaining({ model: 'default' }));
  });

  it('retries on status 524 Cloudflare gateway timeout', async () => {
    jest.spyOn(global, 'setTimeout').mockImplementation((fn: any) => {
      fn();
      return 0 as any;
    });

    mockedCallLLM
      .mockRejectedValueOnce(new Error('LLM Error 524: upstream request failed'))
      .mockResolvedValueOnce({
        choices: [{ message: { content: 'recovered' } }],
      } as Awaited<ReturnType<typeof callLLM>>);

    const service = new LLMService();
    const result = await service.generateCompletion('sys', 'user');

    expect(result).toBe('recovered');
    expect(mockedCallLLM).toHaveBeenCalledTimes(2);

    (global.setTimeout as unknown as jest.Mock).mockRestore();
  });

  it('retries on client request timeout error', async () => {
    jest.spyOn(global, 'setTimeout').mockImplementation((fn: any) => {
      fn();
      return 0 as any;
    });

    mockedCallLLM
      .mockRejectedValueOnce(new Error('LLM Error: request timed out after 300000ms'))
      .mockResolvedValueOnce({
        choices: [{ message: { content: 'recovered' } }],
      } as Awaited<ReturnType<typeof callLLM>>);

    const service = new LLMService();
    const result = await service.generateCompletion('sys', 'user');

    expect(result).toBe('recovered');
    expect(mockedCallLLM).toHaveBeenCalledTimes(2);

    (global.setTimeout as unknown as jest.Mock).mockRestore();
  });
});
