import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';
import { POST } from '@/app/api/proxy/dpdns/route';

function request(body: unknown) {
  return { json: vi.fn().mockResolvedValue(body) } as unknown as NextRequest;
}

describe('DPDNS proxy route', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('rejects requests without token', async () => {
    const res = await POST(request({ endpoint: '/api/v1/domains', method: 'GET' }));

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ success: false, message: 'Missing DPDNS token' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects endpoints outside the DPDNS API path', async () => {
    const res = await POST(request({ endpoint: 'https://evil.example.com', method: 'GET', token: 'dp-token' }));

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ success: false, message: 'Invalid proxy request' });
  });

  it('forwards valid proxy requests to DigitalPlat with bearer auth', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ success: true, data: [] }), { status: 200 }));

    const res = await POST(request({
      endpoint: '/api/v1/domains',
      method: 'POST',
      token: 'dp-token',
      body: { domain: 'demo.dpdns.org' },
    }));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ success: true, data: [] });
    expect(fetchMock).toHaveBeenCalledWith('https://domain-api.digitalplat.org/api/v1/domains', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer dp-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ domain: 'demo.dpdns.org' }),
    });
  });

  it('returns a stable error envelope when the upstream fetch fails', async () => {
    fetchMock.mockRejectedValue(new Error('upstream unavailable'));

    const res = await POST(request({ endpoint: '/api/v1/domains', method: 'GET', token: 'dp-token' }));

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({ success: false, message: 'upstream unavailable' });
  });
});
