import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MaskedInput } from '@/components/credentials/MaskedInput';

describe('MaskedInput', () => {
  it('reveals, hides, and auto-hides the secret value', () => {
    vi.useFakeTimers();
    render(<MaskedInput aria-label="Secret" defaultValue="secret-value" />);

    const input = screen.getByLabelText('Secret');
    expect(input).toHaveAttribute('type', 'password');

    fireEvent.click(screen.getByRole('button', { name: 'Reveal secret' }));
    expect(input).toHaveAttribute('type', 'text');

    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(input).toHaveAttribute('type', 'password');

    fireEvent.click(screen.getByRole('button', { name: 'Reveal secret' }));
    fireEvent.click(screen.getByRole('button', { name: 'Hide secret' }));
    expect(input).toHaveAttribute('type', 'password');
  });
});
