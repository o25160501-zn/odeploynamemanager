import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';
import { POST } from '@/app/api/proxy/cloudflare/route';

function request(body: unknown) {
  return { json: vi.fn().mockResolvedValue(body) } as unknown as NextRequest;
}

describe('Cloudflare proxy route', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('rejects requests without Cloudflare credentials', async () => {
    const res = await POST(request({ endpoint: '/user', method: 'GET' }));

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ success: false, message: 'Missing Cloudflare credentials' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects suspicious endpoints and unsupported methods', async () => {
    const endpointRes = await POST(request({ endpoint: '//evil.example.com', method: 'GET', email: 'user@example.com', apiKey: 'key' }));
    const methodRes = await POST(request({ endpoint: '/user', method: 'PUT', email: 'user@example.com', apiKey: 'key' }));

    expect(endpointRes.status).toBe(400);
    expect(methodRes.status).toBe(400);
  });

  it('forwards valid requests to Cloudflare API with auth headers', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ success: true, result: { id: 'user-1' } }), { status: 200 }));

    const res = await POST(request({
      endpoint: '/zones',
      method: 'POST',
      email: 'user@example.com',
      apiKey: 'cf-key',
      body: { name: 'demo.dpdns.org' },
    }));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ success: true, result: { id: 'user-1' } });
    expect(fetchMock).toHaveBeenCalledWith('https://api.cloudflare.com/client/v4/zones', {
      method: 'POST',
      headers: {
        'X-Auth-Email': 'user@example.com',
        'X-Auth-Key': 'cf-key',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'demo.dpdns.org' }),
    });
  });

  it('returns a stable error envelope when the upstream fetch fails', async () => {
    fetchMock.mockRejectedValue(new Error('Cloudflare unavailable'));

    const res = await POST(request({ endpoint: '/user', method: 'GET', email: 'user@example.com', apiKey: 'cf-key' }));

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({ success: false, message: 'Cloudflare unavailable' });
  });
});
