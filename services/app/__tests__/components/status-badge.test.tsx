import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from '@/components/layout/StatusBadge';

describe('StatusBadge', () => {
  it.each([
    ['active', 'Active'],
    ['pending', 'Pending'],
    ['error', 'Error'],
    ['deleted', 'Pending delete'],
  ] as const)('renders %s label', (status, label) => {
    render(<StatusBadge status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('adds the 7-day release tooltip for deleted domains', () => {
    render(<StatusBadge status="deleted" />);
    expect(screen.getByTitle('DNS stops immediately. Domain release after 7 days.')).toBeInTheDocument();
  });

  it('can render the status dot without visible label', () => {
    render(<StatusBadge status="active" withLabel={false} />);
    expect(screen.queryByText('Active')).not.toBeInTheDocument();
  });
});
