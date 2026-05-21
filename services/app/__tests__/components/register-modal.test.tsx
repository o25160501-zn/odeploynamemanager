import { describe, expect, it } from 'vitest';
import { getSlotType } from '@/components/domain/RegisterModal';

describe('RegisterModal helpers', () => {
  it('maps free namespaces to free slot type', () => {
    expect(getSlotType('.dpdns.org')).toBe('free');
    expect(getSlotType('.qzz.io')).toBe('free');
  });

  it('maps paid/subscription namespaces to paid slot type', () => {
    expect(getSlotType('.us.kg')).toBe('paid');
    expect(getSlotType('.xx.kg')).toBe('paid');
  });
});
