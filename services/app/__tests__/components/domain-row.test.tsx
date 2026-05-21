import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DomainRow } from '@/components/domain/DomainRow';
import type { DomainRecord } from '@/types';

const domain: DomainRecord = {
  name: 'demo',
  namespace: '.dpdns.org',
  fqdn: 'demo.dpdns.org',
  cloudflare: { zone_id: 'zone-1', nameservers: ['anna.ns.cloudflare.com', 'bob.ns.cloudflare.com'] },
  dpdns: { registered: true, registration_response: 'success' },
  status: 'active',
  notes: 'Production domain',
  created_at: 1716192000000,
  updated_at: 1716192000000,
};

describe('DomainRow', () => {
  it('renders domain metadata and triggers row actions', async () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);

    render(<DomainRow domain={domain} onEdit={onEdit} onDelete={onDelete} />);

    expect(screen.getByText('demo.dpdns.org')).toBeInTheDocument();
    expect(screen.getByText('.dpdns.org')).toBeInTheDocument();
    expect(screen.getByText('Production domain')).toBeInTheDocument();
    expect(screen.getByText('anna.ns.cloudflare.com')).toBeInTheDocument();
    expect(screen.getByText('bob.ns.cloudflare.com')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Copy nameservers' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('anna.ns.cloudflare.com\nbob.ns.cloudflare.com'));

    fireEvent.click(screen.getByRole('button', { name: 'Edit domain' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete domain' }));
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
