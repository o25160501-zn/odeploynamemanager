import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { EditDomainModal } from '@/components/domain/EditDomainModal';
import { FirebaseService } from '@/services/firebase.service';
import { useAppStore } from '@/stores/app.store';
import type { DomainRecord } from '@/types';

vi.mock('@/services/firebase.service', () => ({ FirebaseService: { updateDomain: vi.fn() } }));
vi.mock('@/components/feedback/FloatMessageProvider', () => ({ useFloatMessage: () => ({ notifySuccess: vi.fn(), notifyError: vi.fn() }) }));

const initialState = useAppStore.getState();
const domain: DomainRecord = {
  name: 'demo',
  namespace: '.dpdns.org',
  fqdn: 'demo.dpdns.org',
  cloudflare: { zone_id: 'zone-1', nameservers: ['anna.ns.cloudflare.com'] },
  dpdns: { registered: true },
  status: 'active',
  notes: 'old note',
  created_at: 1,
  updated_at: 1,
};

describe('EditDomainModal', () => {
  beforeEach(() => {
    useAppStore.setState(initialState, true);
    useAppStore.setState({ user: { uid: 'uid-1' } as never });
    vi.mocked(FirebaseService.updateDomain).mockResolvedValue(undefined);
  });

  it('loads domain values and saves status/notes changes', async () => {
    const onOpenChange = vi.fn();
    render(<EditDomainModal domain={domain} open onOpenChange={onOpenChange} />);

    expect(screen.getByDisplayValue('old note')).toBeInTheDocument();
    fireEvent.change(screen.getByDisplayValue('old note'), { target: { value: 'new note' } });
    fireEvent.change(screen.getByDisplayValue('active'), { target: { value: 'deleted' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(FirebaseService.updateDomain).toHaveBeenCalledWith('uid-1', 'demo.dpdns.org', { notes: 'new note', status: 'deleted' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
