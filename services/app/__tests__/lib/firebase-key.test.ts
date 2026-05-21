import { describe, expect, it } from 'vitest';
import { fromFirebaseKey, toFirebaseKey } from '@/lib/firebase-key';

describe('firebase-key utilities', () => {
  it('sanitizes every character forbidden by Firebase Realtime Database keys', () => {
    expect(toFirebaseKey('my.app$/#[].dpdns.org')).toBe('my_dot_app_dol__sl__hash__lb__rb__dot_dpdns_dot_org');
  });

  it('round-trips sanitized keys back to the original value', () => {
    const original = 'my-app.example$/#[]/dpdns.org';
    expect(fromFirebaseKey(toFirebaseKey(original))).toBe(original);
  });

  it('leaves Firebase-safe keys unchanged', () => {
    expect(toFirebaseKey('safe-domain_123')).toBe('safe-domain_123');
  });
});
