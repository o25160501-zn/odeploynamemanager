import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CredentialsService } from '@/services/credentials.service';
import { FirebaseService } from '@/services/firebase.service';
import { encrypt, decrypt } from '@/lib/crypto';

vi.mock('@/lib/crypto', () => ({
  encrypt: vi.fn((plain: string, uid: string) => `enc(${uid}:${plain})`),
  decrypt: vi.fn((cipher: string, uid: string) => cipher.replace(`enc(${uid}:`, '').replace(/\)$/, '')),
}));

vi.mock('@/services/firebase.service', () => ({
  FirebaseService: {
    saveCredentialAccount: vi.fn(),
    getCredentialAccounts: vi.fn(),
    getOldCredentials: vi.fn(),
    deleteOldCredentials: vi.fn(),
  },
}));

describe('CredentialsService', () => {
  beforeEach(() => {
    vi.mocked(FirebaseService.saveCredentialAccount).mockClear();
    vi.mocked(FirebaseService.getCredentialAccounts).mockReset();
    vi.mocked(FirebaseService.getOldCredentials).mockReset();
    vi.mocked(FirebaseService.deleteOldCredentials).mockClear();
    vi.mocked(encrypt).mockClear();
    vi.mocked(decrypt).mockClear();
    vi.spyOn(Date, 'now').mockReturnValue(1234);
  });

  it('encrypts sensitive values before saving credentials', async () => {
    const id = await CredentialsService.save(
      'uid-1',
      {
        id: 'acc-1',
        name: 'My Account',
        dpdnsToken: 'dp-token',
        cloudflareEmail: 'user@example.com',
        cloudflareApiKey: 'cf-api-key',
        cloudflareAccountId: 'account-id',
        dpdnsVerified: true,
        cloudflareVerified: false,
      },
      { dpdns: true, cloudflare: false },
    );

    expect(id).toBe('acc-1');
    expect(encrypt).toHaveBeenCalledWith('dp-token', 'shared_user');
    expect(encrypt).toHaveBeenCalledWith('cf-api-key', 'shared_user');
    expect(FirebaseService.saveCredentialAccount).toHaveBeenCalledWith('shared_user', {
      id: 'acc-1',
      name: 'My Account',
      dpdns: { token: 'enc(shared_user:dp-token)', verified: true, verified_at: 1234 },
      cloudflare: {
        email: 'user@example.com',
        api_key: 'enc(shared_user:cf-api-key)',
        account_id: 'account-id',
        verified: false,
        verified_at: 1234,
      },
      created_at: 1234,
      updated_at: 1234,
    });
  });

  it('decrypts credentials loaded from Firebase', async () => {
    vi.mocked(FirebaseService.getCredentialAccounts).mockResolvedValue({
      'acc-1': {
        id: 'acc-1',
        name: 'My Account',
        dpdns: { token: 'enc(shared_user:dp-token)', verified: true, verified_at: 1 },
        cloudflare: {
          email: 'user@example.com',
          api_key: 'enc(shared_user:cf-api-key)',
          account_id: 'account-id',
          verified: true,
          verified_at: 1,
        },
        created_at: 1,
        updated_at: 1,
      },
    });

    await expect(CredentialsService.load('uid-1')).resolves.toEqual([
      {
        id: 'acc-1',
        name: 'My Account',
        dpdnsToken: 'dp-token',
        cloudflareEmail: 'user@example.com',
        cloudflareApiKey: 'cf-api-key',
        cloudflareAccountId: 'account-id',
        dpdnsVerified: true,
        cloudflareVerified: true,
        created_at: 1,
        updated_at: 1,
      },
    ]);
  });

  it('returns empty array when no credentials are saved', async () => {
    vi.mocked(FirebaseService.getCredentialAccounts).mockResolvedValue(null);
    vi.mocked(FirebaseService.getOldCredentials).mockResolvedValue(null);

    await expect(CredentialsService.load('uid-1')).resolves.toEqual([]);
  });
});
