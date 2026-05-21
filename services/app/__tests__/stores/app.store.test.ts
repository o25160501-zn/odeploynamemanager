import { beforeEach, describe, expect, it } from 'vitest';
import { useAppStore } from '@/stores/app.store';
import type { DomainRecord } from '@/types';

const initialState = useAppStore.getState();

function domain(): DomainRecord {
  return {
    name: 'demo',
    namespace: '.dpdns.org',
    fqdn: 'demo.dpdns.org',
    cloudflare: { zone_id: 'zone-1', nameservers: ['anna.ns.cloudflare.com'] },
    dpdns: { registered: true },
    status: 'active',
    created_at: 1,
    updated_at: 1,
  };
}

describe('app.store', () => {
  beforeEach(() => {
    useAppStore.setState(initialState, true);
  });

  it('stores auth state, accounts, domains, and sidebar UI state', () => {
    const accounts = [
      {
        id: 'acc-1',
        name: 'My Account',
        dpdnsToken: 'dp-token',
        cloudflareEmail: 'user@example.com',
        cloudflareApiKey: 'cf-key',
        cloudflareAccountId: 'account-id',
        dpdnsVerified: true,
        cloudflareVerified: true,
        created_at: 1,
        updated_at: 1,
      },
    ];
    const user = { uid: 'uid-1', email: 'user@example.com' } as never;

    useAppStore.getState().setUser(user);
    useAppStore.getState().setAuthReady(true);
    useAppStore.getState().setAccounts(accounts);
    useAppStore.getState().setDomains([domain()]);
    useAppStore.getState().setSidebarOpen(true);
    useAppStore.getState().setSidebarCollapsed(true);

    expect(useAppStore.getState()).toMatchObject({
      user,
      authReady: true,
      accounts,
      sidebarOpen: true,
      sidebarCollapsed: true,
    });
    expect(useAppStore.getState().domains).toHaveLength(1);
  });

  it('clears accounts without clearing domains or user', () => {
    useAppStore.getState().setUser({ uid: 'uid-1' } as never);
    useAppStore.getState().setDomains([domain()]);
    useAppStore.getState().setAccounts([
      {
        id: 'acc-1',
        name: 'My Account',
        dpdnsToken: 'dp-token',
        cloudflareEmail: 'user@example.com',
        cloudflareApiKey: 'cf-key',
        cloudflareAccountId: 'account-id',
        dpdnsVerified: true,
        cloudflareVerified: true,
        created_at: 1,
        updated_at: 1,
      },
    ]);

    useAppStore.getState().clearCredentials();

    expect(useAppStore.getState().accounts).toEqual([]);
    expect(useAppStore.getState().user).toEqual({ uid: 'uid-1' });
    expect(useAppStore.getState().domains).toHaveLength(1);
  });
});
