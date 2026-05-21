import { beforeEach, describe, expect, it, vi } from 'vitest';
import { callWithFallback, parseApiResponse } from '@/services/api-caller';

describe('api-caller', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('always sends requests through the backend proxy', async () => {
    const proxyResponse = new Response(JSON.stringify({ success: true, proxied: true }), { status: 200 });
    fetchMock.mockResolvedValueOnce(proxyResponse);

    const res = await callWithFallback({
      directUrl: 'https://api.example.com/resource',
      directHeaders: { Authorization: 'Bearer token' },
      proxyPath: '/api/proxy/example',
      proxyBody: { endpoint: '/resource', token: 'token' },
      method: 'POST',
      body: { ok: true },
      timeoutMs: 100,
    });

    expect(res).toBe(proxyResponse);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('/api/proxy/example', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: '/resource', token: 'token' }),
    }));
  });

  it('parses successful API JSON responses', async () => {
    const data = await parseApiResponse<{ success: boolean; result: string }>(
      new Response(JSON.stringify({ success: true, result: 'ok' }), { status: 200 }),
      'fallback',
    );

    expect(data.result).toBe('ok');
  });

  it('uses API error details before fallback message', async () => {
    await expect(parseApiResponse(new Response(JSON.stringify({ success: false, errors: [{ message: 'token invalid' }] }), { status: 200 }), 'fallback'))
      .rejects.toThrow('token invalid');

    await expect(parseApiResponse(new Response(JSON.stringify({ message: 'bad request' }), { status: 400 }), 'fallback'))
      .rejects.toThrow('bad request');

    await expect(parseApiResponse(new Response('not json', { status: 500 }), 'fallback'))
      .rejects.toThrow('fallback');
  });
});
