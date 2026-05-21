import { describe, expect, it } from 'vitest';
import { cn, maskSecret, toErrorMessage } from '@/lib/utils';

describe('utils', () => {
  it('merges Tailwind classes with later classes taking precedence', () => {
    expect(cn('px-2 text-sm', false && 'hidden', 'px-4')).toContain('px-4');
    expect(cn('px-2 text-sm', 'px-4')).not.toContain('px-2');
  });

  it('masks long and short secrets safely', () => {
    expect(maskSecret('abcdef1234567890', 4, 4)).toBe('abcd••••7890');
    expect(maskSecret('short')).toBe('••••••••');
    expect(maskSecret('')).toBe('');
  });

  it('formats unknown errors into a safe fallback', () => {
    expect(toErrorMessage(new Error('boom'))).toBe('boom');
    expect(toErrorMessage('plain')).toBe('plain');
    expect(toErrorMessage({ bad: true }, 'fallback')).toBe('fallback');
  });
});
