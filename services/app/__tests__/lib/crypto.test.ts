import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('crypto helpers', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.NEXT_PUBLIC_DPDNS_CLOUDFLARED_MANAGER_ENCRYPT_SALT = 'test-salt-that-is-long-enough-for-suite';
  });

  it('encrypts and decrypts using salt plus uid', async () => {
    const { encrypt, decrypt } = await import('@/lib/crypto');
    const cipher = encrypt('secret-value', 'uid-123');
    expect(cipher).not.toBe('secret-value');
    expect(decrypt(cipher, 'uid-123')).toBe('secret-value');
  });

  it('does not decrypt with a different uid', async () => {
    const { encrypt, decrypt } = await import('@/lib/crypto');
    const cipher = encrypt('secret-value', 'uid-123');
    expect(decrypt(cipher, 'uid-456')).not.toBe('secret-value');
  });

  it('returns empty strings without invoking AES for empty values', async () => {
    const { encrypt, decrypt } = await import('@/lib/crypto');
    expect(encrypt('', 'uid-123')).toBe('');
    expect(decrypt('', 'uid-123')).toBe('');
  });

  it('throws when encryption salt is missing', async () => {
    delete process.env.NEXT_PUBLIC_DPDNS_CLOUDFLARED_MANAGER_ENCRYPT_SALT;
    const { encrypt } = await import('@/lib/crypto');
    expect(() => encrypt('secret', 'uid-123')).toThrow('NEXT_PUBLIC_DPDNS_CLOUDFLARED_MANAGER_ENCRYPT_SALT is missing');
  });
});
