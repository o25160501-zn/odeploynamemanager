import { describe, expect, it } from 'vitest';
import { credentialsSchema, editDomainSchema, namespaceSchema, registerDomainSchema, subdomainSchema } from '@/lib/validators';

describe('validators', () => {
  it('accepts a valid subdomain and normalizes casing/spacing', () => {
    expect(subdomainSchema.parse('  My-App1  ')).toBe('my-app1');
  });

  it.each(['-bad', 'bad-', 'bad_name', 'bad.name', '', 'a'.repeat(64)])('rejects invalid subdomain %s', (value) => {
    expect(() => subdomainSchema.parse(value)).toThrow();
  });

  it('accepts only supported namespaces', () => {
    expect(namespaceSchema.options).toEqual(['.dpdns.org', '.us.kg', '.qzz.io', '.xx.kg']);
    expect(() => namespaceSchema.parse('.example.com')).toThrow();
  });

  it('validates complete credential input', () => {
    const valid = {
      name: 'Test Account',
      dpdnsToken: 'dp_live_token',
      cloudflareEmail: 'user@example.com',
      cloudflareApiKey: 'a'.repeat(37),
      cloudflareAccountId: '01a7362d577a6c3019a474fd6f485823',
    };
    expect(credentialsSchema.parse(valid)).toEqual(valid);
  });

  it('rejects malformed credential input', () => {
    expect(() => credentialsSchema.parse({
      name: '',
      dpdnsToken: '',
      cloudflareEmail: 'not-an-email',
      cloudflareApiKey: 'short',
      cloudflareAccountId: '',
    })).toThrow();
  });

  it('validates register and edit forms', () => {
    expect(registerDomainSchema.parse({ subdomain: 'demo', namespace: '.dpdns.org', accountId: 'acc-123' })).toEqual({ subdomain: 'demo', namespace: '.dpdns.org', accountId: 'acc-123' });
    expect(editDomainSchema.parse({ notes: 'ok', status: 'deleted' })).toEqual({ notes: 'ok', status: 'deleted' });
    expect(() => editDomainSchema.parse({ notes: 'x'.repeat(501), status: 'active' })).toThrow();
  });
});
