import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CloudflareService } from '@/services/cloudflare.service';
import { callWithFallback, parseApiResponse } from '@/services/api-caller';

vi.mock('@/services/api-caller', () => ({
  callWithFallback: vi.fn(),
  parseApiResponse: vi.fn(async (response) => response),
}));

describe('CloudflareService', () => {
  beforeEach(() => {
    vi.mocked(callWithFallback).mockReset();
    vi.mocked(parseApiResponse).mockReset();
    vi.mocked(parseApiResponse).mockImplementation(async (response) => response);
  });

  it('verifies credentials against /user', async () => {
    vi.mocked(callWithFallback).mockResolvedValue({ success: true, result: { email: 'user@example.com' } } as unknown as Response);

    const result = await CloudflareService.verifyCredentials('user@example.com', 'api-key');

    expect(result.result.email).toBe('user@example.com');
    expect(callWithFallback).toHaveBeenCalledWith(expect.objectContaining({
      directUrl: 'https://api.cloudflare.com/client/v4/user',
      directHeaders: {
        'X-Auth-Email': 'user@example.com',
        'X-Auth-Key': 'api-key',
        'Content-Type': 'application/json',
      },
      proxyPath: '/api/proxy/cloudflare',
      proxyBody: { endpoint: '/user', method: 'GET', body: undefined, email: 'user@example.com', apiKey: 'api-key' },
      method: 'GET',
    }));
  });

  it('creates a full Cloudflare zone and returns the result object', async () => {
    const zone = { id: 'zone-1', name: 'demo.dpdns.org', name_servers: ['a.ns.cloudflare.com'], status: 'pending' };
    vi.mocked(callWithFallback).mockResolvedValue({ success: true, result: zone } as unknown as Response);

    await expect(CloudflareService.createZone('user@example.com', 'api-key', 'account-id', 'demo.dpdns.org')).resolves.toEqual(zone);

    expect(callWithFallback).toHaveBeenCalledTimes(1);
    expect(callWithFallback).toHaveBeenCalledWith(expect.objectContaining({
      directUrl: 'https://api.cloudflare.com/client/v4/zones',
      method: 'POST',
      body: {
        name: 'demo.dpdns.org',
        account: { id: 'account-id' },
        type: 'full',
      },
    }));
  });

  it('fetches the first Cloudflare account id', async () => {
    vi.mocked(callWithFallback).mockResolvedValue({ success: true, result: [{ id: 'account-1', name: 'Main' }] } as unknown as Response);

    await expect(CloudflareService.getAccountId('user@example.com', 'api-key')).resolves.toBe('account-1');

    expect(callWithFallback).toHaveBeenCalledWith(expect.objectContaining({
      directUrl: 'https://api.cloudflare.com/client/v4/accounts',
      method: 'GET',
      proxyBody: { endpoint: '/accounts', method: 'GET', body: undefined, email: 'user@example.com', apiKey: 'api-key' },
    }));
  });

  it('auto-resolves account id before creating a zone when account id is blank', async () => {
    const zone = { id: 'zone-1', name: 'demo.dpdns.org', name_servers: ['a.ns.cloudflare.com'], status: 'pending' };
    vi.mocked(callWithFallback).mockResolvedValue({} as Response);
    vi.mocked(parseApiResponse)
      .mockResolvedValueOnce({ success: true, result: [{ id: 'account-1', name: 'Main' }] })
      .mockResolvedValueOnce({ success: true, result: zone });

    await expect(CloudflareService.createZone('user@example.com', 'api-key', '', 'demo.dpdns.org')).resolves.toEqual(zone);

    expect(callWithFallback).toHaveBeenNthCalledWith(1, expect.objectContaining({
      directUrl: 'https://api.cloudflare.com/client/v4/accounts',
      method: 'GET',
    }));
    expect(callWithFallback).toHaveBeenNthCalledWith(2, expect.objectContaining({
      directUrl: 'https://api.cloudflare.com/client/v4/zones',
      method: 'POST',
      body: expect.objectContaining({ account: { id: 'account-1' } }),
    }));
  });

  it('reuses an existing zone when Cloudflare reports the zone already exists', async () => {
    const existingZone = { id: 'zone-existing', name: 'demo.dpdns.org', name_servers: ['a.ns.cloudflare.com'], status: 'pending' };
    vi.mocked(callWithFallback).mockResolvedValue({} as Response);
    vi.mocked(parseApiResponse)
      .mockRejectedValueOnce(new Error('zone already exists'))
      .mockResolvedValueOnce({ success: true, result: [existingZone] });

    await expect(CloudflareService.createZone('user@example.com', 'api-key', 'account-id', 'demo.dpdns.org')).resolves.toEqual(existingZone);

    expect(callWithFallback).toHaveBeenCalledTimes(2);
    expect(callWithFallback).toHaveBeenLastCalledWith(expect.objectContaining({
      directUrl: 'https://api.cloudflare.com/client/v4/zones?name=demo.dpdns.org&per_page=1',
      method: 'GET',
    }));
  });

  it('retries Cloudflare calls on rate-limit style errors', async () => {
    vi.useFakeTimers();
    const zone = { id: 'zone-retry', name: 'demo.dpdns.org', name_servers: ['a.ns.cloudflare.com'], status: 'pending' };
    vi.mocked(callWithFallback).mockResolvedValue({} as Response);
    vi.mocked(parseApiResponse)
      .mockRejectedValueOnce(new Error('429 rate limit'))
      .mockResolvedValueOnce({ success: true, result: zone });

    const promise = CloudflareService.createZone('user@example.com', 'api-key', 'account-id', 'demo.dpdns.org');
    await vi.advanceTimersByTimeAsync(5000);

    await expect(promise).resolves.toEqual(zone);
    expect(callWithFallback).toHaveBeenCalledTimes(2);
  });

  it('deletes a Cloudflare zone by id', async () => {
    vi.mocked(callWithFallback).mockResolvedValue({ success: true, result: { id: 'zone-1' } } as unknown as Response);

    await CloudflareService.deleteZone('user@example.com', 'api-key', 'zone-1');

    expect(callWithFallback).toHaveBeenCalledWith(expect.objectContaining({
      directUrl: 'https://api.cloudflare.com/client/v4/zones/zone-1',
      method: 'DELETE',
      proxyBody: { endpoint: '/zones/zone-1', method: 'DELETE', body: undefined, email: 'user@example.com', apiKey: 'api-key' },
    }));
  });
});
