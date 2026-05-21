import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ConfirmDeleteDialog } from '@/components/domain/ConfirmDeleteDialog';
import { CloudflareService } from '@/services/cloudflare.service';
import { DPDNSService } from '@/services/dpdns.service';
import { FirebaseService } from '@/services/firebase.service';
import { useAppStore } from '@/stores/app.store';
import type { DomainRecord } from '@/types';

vi.mock('@/services/dpdns.service', () => ({ DPDNSService: { deleteDomain: vi.fn() } }));
vi.mock('@/services/cloudflare.service', () => ({ CloudflareService: { deleteZone: vi.fn() } }));
vi.mock('@/services/firebase.service', () => ({ FirebaseService: { deleteDomain: vi.fn() } }));

const initialState = useAppStore.getState();
const domain: DomainRecord = {
  name: 'demo',
  namespace: '.dpdns.org',
  fqdn: 'demo.dpdns.org',
  cloudflare: { zone_id: 'zone-1', nameservers: ['anna.ns.cloudflare.com'] },
  dpdns: { registered: true },
  credentialAccountId: 'acc-1',
  status: 'active',
  created_at: 1,
  updated_at: 1,
};

describe('ConfirmDeleteDialog', () => {
  beforeEach(() => {
    useAppStore.setState(initialState, true);
    useAppStore.setState({
      user: { uid: 'uid-1' } as never,
      accounts: [
        {
          id: 'acc-1',
          name: 'Default Account',
          dpdnsToken: 'dp-token',
          cloudflareEmail: 'user@example.com',
          cloudflareApiKey: 'cf-key',
          cloudflareAccountId: 'account-id',
          dpdnsVerified: true,
          cloudflareVerified: true,
          created_at: 1,
          updated_at: 1,
        },
      ],
    });
    vi.mocked(DPDNSService.deleteDomain).mockResolvedValue({ success: true, data: {} } as never);
    vi.mocked(CloudflareService.deleteZone).mockResolvedValue({ success: true, result: { id: 'zone-1' } } as never);
    vi.mocked(FirebaseService.deleteDomain).mockResolvedValue(undefined);
  });

  it('warns about pendingdelete and deletes DPDNS/Firebase with optional Cloudflare cleanup', async () => {
    const onOpenChange = vi.fn();
    render(<ConfirmDeleteDialog domain={domain} open onOpenChange={onOpenChange} />);

    expect(screen.getByText(/domain released after 7 days/i)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Also delete Cloudflare Zone'));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(DPDNSService.deleteDomain).toHaveBeenCalledWith('dp-token', 'demo.dpdns.org'));
    expect(CloudflareService.deleteZone).toHaveBeenCalledWith('user@example.com', 'cf-key', 'zone-1');
    expect(FirebaseService.deleteDomain).toHaveBeenCalledWith('uid-1', 'demo.dpdns.org');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('shows a credential warning when DPDNS token is unavailable', () => {
    useAppStore.setState({ accounts: [] });

    render(<ConfirmDeleteDialog domain={domain} open onOpenChange={vi.fn()} />);

    expect(screen.getByText(/database record only/i)).toBeInTheDocument();
  });
});
