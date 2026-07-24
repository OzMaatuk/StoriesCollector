import { callLLM } from '@/lib/llm-client';

describe('LLM client', () => {
  const originalEnv = process.env;
  const mockFetch = jest.fn();

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    process.env.LLM_API_KEY = 'test-key';
    global.fetch = mockFetch as unknown as typeof fetch;
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  it('calls the configured base URL with /v1/chat/completions appended', async () => {
    process.env.LLM_BASE_URL = 'https://api.example.com';

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'ok' } }] }),
    });

    await callLLM({ model: 'default', messages: [{ role: 'user', content: 'Hello' }] });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.example.com/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-key',
        }),
      })
    );
  });
});
