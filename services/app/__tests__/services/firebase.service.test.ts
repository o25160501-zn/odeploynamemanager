import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DomainRecord, EncryptedCredentials } from '@/types';

const databaseMocks = vi.hoisted(() => ({
  get: vi.fn(),
  onValue: vi.fn(),
  ref: vi.fn((_db: unknown, path: string) => ({ path })),
  remove: vi.fn(),
  set: vi.fn(),
  update: vi.fn(),
}));

vi.mock('firebase/database', () => ({
  get: databaseMocks.get,
  onValue: databaseMocks.onValue,
  ref: databaseMocks.ref,
  remove: databaseMocks.remove,
  set: databaseMocks.set,
  update: databaseMocks.update,
}));

vi.mock('@/lib/firebase', () => ({ db: { app: 'mock-db' } }));

import { FirebaseService } from '@/services/firebase.service';

function makeDomain(overrides: Partial<DomainRecord> = {}): DomainRecord {
  return {
    name: 'demo',
    namespace: '.dpdns.org',
    fqdn: 'demo.dpdns.org',
    cloudflare: { zone_id: 'zone-1', nameservers: ['anna.ns.cloudflare.com'] },
    dpdns: { registered: true, registration_response: 'success' },
    status: 'active',
    notes: '',
    created_at: 1000,
    updated_at: 1000,
    ...overrides,
  };
}

describe('FirebaseService', () => {
  beforeEach(() => {
    Object.values(databaseMocks).forEach((mock) => mock.mockClear());
    databaseMocks.ref.mockImplementation((_db: unknown, path: string) => ({ path }));
  });

  it('saves domains under sanitized Firebase keys', async () => {
    const domain = makeDomain({ fqdn: 'demo.dpdns.org' });

    await FirebaseService.saveDomain('uid-1', domain);

    expect(databaseMocks.ref).toHaveBeenCalledWith({ app: 'mock-db' }, 'users/shared_user/domains/demo_dot_dpdns_dot_org');
    expect(databaseMocks.set).toHaveBeenCalledWith({ path: 'users/shared_user/domains/demo_dot_dpdns_dot_org' }, domain);
  });

  it('subscribes to domains, attaches the internal Firebase key, and sorts newest first', () => {
    const unsubscribe = vi.fn();
    let callback: ((snapshot: { val: () => Record<string, DomainRecord> }) => void) | undefined;
    databaseMocks.onValue.mockImplementation((_ref, cb) => {
      callback = cb;
      return unsubscribe;
    });
    const onDomains = vi.fn();

    const result = FirebaseService.subscribeDomains('uid-1', onDomains);
    callback?.({
      val: () => ({
        old_dot_dpdns_dot_org: makeDomain({ fqdn: 'old.dpdns.org', created_at: 10 }),
        new_dot_dpdns_dot_org: makeDomain({ fqdn: 'new.dpdns.org', created_at: 20 }),
      }),
    });

    expect(result).toBe(unsubscribe);
    expect(onDomains).toHaveBeenCalledWith([
      expect.objectContaining({ fqdn: 'new.dpdns.org', _key: 'new_dot_dpdns_dot_org' }),
      expect.objectContaining({ fqdn: 'old.dpdns.org', _key: 'old_dot_dpdns_dot_org' }),
    ]);
  });

  it('returns an empty list when there are no domains', () => {
    let callback: ((snapshot: { val: () => null }) => void) | undefined;
    databaseMocks.onValue.mockImplementation((_ref, cb) => {
      callback = cb;
      return vi.fn();
    });
    const onDomains = vi.fn();

    FirebaseService.subscribeDomains('uid-1', onDomains);
    callback?.({ val: () => null });

    expect(onDomains).toHaveBeenCalledWith([]);
  });

  it('deletes domains with sanitized keys', async () => {
    await FirebaseService.deleteDomain('uid-1', 'demo.dpdns.org');

    expect(databaseMocks.ref).toHaveBeenCalledWith({ app: 'mock-db' }, 'users/shared_user/domains/demo_dot_dpdns_dot_org');
    expect(databaseMocks.remove).toHaveBeenCalledWith({ path: 'users/shared_user/domains/demo_dot_dpdns_dot_org' });
  });

  it('updates domains and refreshes updated_at', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(123456);

    await FirebaseService.updateDomain('uid-1', 'demo.dpdns.org', { notes: 'updated' });

    expect(databaseMocks.update).toHaveBeenCalledWith(
      { path: 'users/shared_user/domains/demo_dot_dpdns_dot_org' },
      { notes: 'updated', updated_at: 123456 },
    );
  });

  it('saves credential account and refreshes settings updated_at', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(777);
    const account = {
      id: 'acc-1',
      name: 'My Account',
      dpdns: { token: 'encrypted-token', verified: true, verified_at: 1 },
      cloudflare: { email: 'user@example.com', api_key: 'encrypted-key', account_id: 'account-id', verified: true, verified_at: 1 },
      created_at: 1,
      updated_at: 1,
    };

    await FirebaseService.saveCredentialAccount('uid-1', account);

    expect(databaseMocks.set).toHaveBeenCalledWith({ path: 'users/shared_user/settings/accounts/acc-1' }, account);
    expect(databaseMocks.update).toHaveBeenCalledWith({ path: 'users/shared_user/settings' }, { updated_at: 777 });
  });

  it('loads credential accounts from Firebase', async () => {
    const accounts = {
      'acc-1': {
        id: 'acc-1',
        name: 'My Account',
        dpdns: { token: 'encrypted-token', verified: true, verified_at: 1 },
        cloudflare: { email: 'user@example.com', api_key: 'encrypted-key', account_id: 'account-id', verified: true, verified_at: 1 },
        created_at: 1,
        updated_at: 1,
      }
    };
    databaseMocks.get.mockResolvedValue({ val: () => accounts });

    await expect(FirebaseService.getCredentialAccounts('uid-1')).resolves.toEqual(accounts);
    expect(databaseMocks.ref).toHaveBeenCalledWith({ app: 'mock-db' }, 'users/shared_user/settings/accounts');
  });
});
