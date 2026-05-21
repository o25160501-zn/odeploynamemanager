import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import DashboardPage from '@/app/page';
import { FirebaseService } from '@/services/firebase.service';
import { useAppStore } from '@/stores/app.store';
import type { DomainRecord } from '@/types';

vi.mock('@/services/firebase.service', () => ({ FirebaseService: { subscribeDomains: vi.fn() } }));
vi.mock('@/components/domain/RegisterModal', () => ({
  RegisterModal: ({ open }: { open: boolean }) => (open ? <div role="dialog">Register New Domain Modal</div> : null),
}));
vi.mock('@/components/domain/EditDomainModal', () => ({ EditDomainModal: () => null }));
vi.mock('@/components/domain/ConfirmDeleteDialog', () => ({ ConfirmDeleteDialog: () => null }));
vi.mock('@/components/feedback/FloatMessageProvider', () => ({ useFloatMessage: () => ({ notifySuccess: vi.fn(), notifyError: vi.fn() }) }));

const initialState = useAppStore.getState();

const domain: DomainRecord = {
  name: 'demo',
  namespace: '.dpdns.org',
  fqdn: 'demo.dpdns.org',
  cloudflare: { zone_id: 'zone-1', nameservers: ['anna.ns.cloudflare.com'] },
  dpdns: { registered: true },
  status: 'active',
  created_at: 1,
  updated_at: 1,
};

describe('DashboardPage', () => {
  beforeEach(() => {
    useAppStore.setState({ authReady: true, user: { uid: 'uid-1' } as never, domains: [], accounts: [] });
    vi.mocked(FirebaseService.subscribeDomains).mockReturnValue(vi.fn());
  });

  it('subscribes to realtime domains and renders the empty state', () => {
    useAppStore.setState({ domains: [] });

    render(<DashboardPage />);

    expect(FirebaseService.subscribeDomains).toHaveBeenCalledWith('uid-1', expect.any(Function));
    expect(screen.getByRole('heading', { name: 'Your Domains' })).toBeInTheDocument();
    expect(screen.getByText('No domains yet')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: /Register New Domain/i })[0]);
    expect(screen.getByRole('dialog')).toHaveTextContent('Register New Domain Modal');
  });

  it('renders domain rows when domains exist', () => {
    useAppStore.setState({ domains: [domain] });

    render(<DashboardPage />);

    expect(screen.getByText('demo.dpdns.org')).toBeInTheDocument();
    expect(screen.queryByText('No domains yet')).not.toBeInTheDocument();
  });
});
