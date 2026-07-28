import { callLLM, getLLMRequestTimeoutMs } from '@/lib/llm-client';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

describe('getLLMRequestTimeoutMs', () => {
  const originalTimeout = process.env.LLM_REQUEST_TIMEOUT_MS;

  afterEach(() => {
    if (originalTimeout === undefined) {
      delete process.env.LLM_REQUEST_TIMEOUT_MS;
    } else {
      process.env.LLM_REQUEST_TIMEOUT_MS = originalTimeout;
    }
  });

  it('defaults to one day when unset', () => {
    delete process.env.LLM_REQUEST_TIMEOUT_MS;
    expect(getLLMRequestTimeoutMs()).toBe(ONE_DAY_MS);
  });

  it('uses configured timeout when valid', () => {
    process.env.LLM_REQUEST_TIMEOUT_MS = '7200000';
    expect(getLLMRequestTimeoutMs()).toBe(7200000);
  });

  it('falls back to one day for invalid values', () => {
    process.env.LLM_REQUEST_TIMEOUT_MS = 'not-a-number';
    expect(getLLMRequestTimeoutMs()).toBe(ONE_DAY_MS);

    process.env.LLM_REQUEST_TIMEOUT_MS = '0';
    expect(getLLMRequestTimeoutMs()).toBe(ONE_DAY_MS);
  });
});

describe('callLLM', () => {
  const originalFetch = global.fetch;
  const originalBaseUrl = process.env.LLM_BASE_URL;
  const originalApiKey = process.env.LLM_API_KEY;
  const originalTimeout = process.env.LLM_REQUEST_TIMEOUT_MS;

  beforeEach(() => {
    process.env.LLM_BASE_URL = 'https://llm.example.com/v1';
    process.env.LLM_API_KEY = 'test-key';
    delete process.env.LLM_REQUEST_TIMEOUT_MS;
  });

  afterEach(() => {
    global.fetch = originalFetch;

    if (originalBaseUrl === undefined) {
      delete process.env.LLM_BASE_URL;
    } else {
      process.env.LLM_BASE_URL = originalBaseUrl;
    }

    if (originalApiKey === undefined) {
      delete process.env.LLM_API_KEY;
    } else {
      process.env.LLM_API_KEY = originalApiKey;
    }

    if (originalTimeout === undefined) {
      delete process.env.LLM_REQUEST_TIMEOUT_MS;
    } else {
      process.env.LLM_REQUEST_TIMEOUT_MS = originalTimeout;
    }
  });

  it('passes a long-lived abort signal and undici dispatcher to fetch', async () => {
    const mockJson = jest.fn().mockResolvedValue({
      choices: [{ message: { content: 'done' } }],
    });

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: mockJson,
    });

    await callLLM({ model: 'test-model', messages: [] });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://llm.example.com/v1/chat/completions',
      expect.objectContaining({
        signal: expect.any(AbortSignal),
        dispatcher: expect.anything(),
      })
    );

    const fetchOptions = (global.fetch as jest.Mock).mock.calls[0][1] as {
      signal: AbortSignal;
      dispatcher: unknown;
    };

    expect(fetchOptions.signal).toBeInstanceOf(AbortSignal);
    expect(fetchOptions.dispatcher).toBeDefined();
  });

  it('uses configured timeout for fetch options', async () => {
    process.env.LLM_REQUEST_TIMEOUT_MS = '3600000';

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        choices: [{ message: { content: 'done' } }],
      }),
    });

    await callLLM({ model: 'test-model', messages: [] });

    const fetchOptions = (global.fetch as jest.Mock).mock.calls[0][1] as {
      signal: AbortSignal;
    };

    expect(fetchOptions.signal).toBeInstanceOf(AbortSignal);
  });

  it('throws a timeout error when fetch aborts', async () => {
    global.fetch = jest.fn().mockRejectedValue(Object.assign(new Error('The operation was aborted'), { name: 'AbortError' }));

    await expect(callLLM({ model: 'test-model', messages: [] })).rejects.toThrow(
      `LLM Error: request timed out after ${ONE_DAY_MS}ms`
    );
  });

  it('throws when upstream returns a non-success status', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 524,
      text: jest.fn().mockResolvedValue('timeout'),
    });

    await expect(callLLM({ model: 'test-model', messages: [] })).rejects.toThrow(
      'LLM Error 524: upstream request failed'
    );
  });
});
