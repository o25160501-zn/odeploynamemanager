import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import SettingsPage from '@/app/settings/page';

vi.mock('@/components/credentials/CredentialsForm', () => ({
  CredentialsForm: () => <div>Credentials form placeholder</div>,
}));

import { useAppStore } from '@/stores/app.store';

describe('SettingsPage', () => {
  it('renders settings header and credentials form', () => {
    useAppStore.setState({ authReady: true, user: { uid: 'uid-1' } as never });
    render(<SettingsPage />);

    expect(screen.getByRole('heading', { name: 'Credentials' })).toBeInTheDocument();
    expect(screen.getByText(/Store DPDNS and Cloudflare credentials/i)).toBeInTheDocument();
    expect(screen.getByText('Credentials form placeholder')).toBeInTheDocument();
  });
});
