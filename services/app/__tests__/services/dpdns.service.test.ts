import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DPDNSService } from '@/services/dpdns.service';
import { callWithFallback, parseApiResponse } from '@/services/api-caller';

vi.mock('@/services/api-caller', () => ({
  callWithFallback: vi.fn(),
  parseApiResponse: vi.fn(async (response) => response),
}));

describe('DPDNSService', () => {
  let now = 1_000_000;

  beforeEach(() => {
    vi.mocked(callWithFallback).mockReset();
    vi.mocked(parseApiResponse).mockClear();
    vi.mocked(callWithFallback).mockResolvedValue({ ok: true } as unknown as Response);
    now += 100_000;
    vi.spyOn(Date, 'now').mockImplementation(() => {
      now += 1_000;
      return now;
    });
  });

  it('lists domains through direct URL and DPDNS proxy fallback metadata', async () => {
    await DPDNSService.listDomains('dp-token');

    expect(callWithFallback).toHaveBeenCalledWith(expect.objectContaining({
      directUrl: 'https://domain-api.digitalplat.org/api/v1/domains',
      directHeaders: expect.objectContaining({ Authorization: 'Bearer dp-token' }),
      proxyPath: '/api/proxy/dpdns',
      proxyBody: { endpoint: '/api/v1/domains', method: 'GET', token: 'dp-token' },
      method: 'GET',
    }));
    expect(parseApiResponse).toHaveBeenCalledWith({ ok: true }, 'API Token không hợp lệ');
  });

  it('registers a domain with auto-detected slot type and nameservers', async () => {
    await DPDNSService.registerDomain('dp-token', 'demo.dpdns.org', 'free', ['anna.ns.cloudflare.com', 'bob.ns.cloudflare.com']);

    expect(callWithFallback).toHaveBeenCalledWith(expect.objectContaining({
      method: 'POST',
      body: {
        domain: 'demo.dpdns.org',
        slot_type: 'free',
        nameservers: ['anna.ns.cloudflare.com', 'bob.ns.cloudflare.com'],
      },
      proxyBody: {
        endpoint: '/api/v1/domains',
        method: 'POST',
        body: {
          domain: 'demo.dpdns.org',
          slot_type: 'free',
          nameservers: ['anna.ns.cloudflare.com', 'bob.ns.cloudflare.com'],
        },
        token: 'dp-token',
      },
    }));
  });

  it('URL-encodes domain names for nameserver updates', async () => {
    await DPDNSService.updateNameservers('dp-token', 'demo.dpdns.org', ['new.ns.cloudflare.com']);

    expect(callWithFallback).toHaveBeenCalledWith(expect.objectContaining({
      directUrl: 'https://domain-api.digitalplat.org/api/v1/domains/demo.dpdns.org/nameservers',
      proxyBody: expect.objectContaining({ endpoint: '/api/v1/domains/demo.dpdns.org/nameservers', method: 'PATCH' }),
      body: { nameservers: ['new.ns.cloudflare.com'] },
    }));
  });

  it('deletes a domain through DELETE endpoint', async () => {
    await DPDNSService.deleteDomain('dp-token', 'demo.dpdns.org');

    expect(callWithFallback).toHaveBeenCalledWith(expect.objectContaining({
      method: 'DELETE',
      directUrl: 'https://domain-api.digitalplat.org/api/v1/domains/demo.dpdns.org',
      proxyBody: { endpoint: '/api/v1/domains/demo.dpdns.org', method: 'DELETE', token: 'dp-token' },
    }));
  });
});
