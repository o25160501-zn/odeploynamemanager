import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CredentialsForm } from '@/components/credentials/CredentialsForm';
import { CloudflareService } from '@/services/cloudflare.service';
import { CredentialsService } from '@/services/credentials.service';
import { DPDNSService } from '@/services/dpdns.service';
import { FirebaseService } from '@/services/firebase.service';
import { useAppStore } from '@/stores/app.store';

vi.mock('@/services/dpdns.service', () => ({ DPDNSService: { listDomains: vi.fn() } }));
vi.mock('@/services/cloudflare.service', () => ({ CloudflareService: { verifyCredentials: vi.fn(), resolveAccountId: vi.fn() } }));
vi.mock('@/services/credentials.service', () => ({ CredentialsService: { save: vi.fn(), load: vi.fn() } }));
vi.mock('@/services/firebase.service', () => ({ FirebaseService: { subscribeDomains: vi.fn() } }));
vi.mock('@/components/feedback/FloatMessageProvider', () => ({ useFloatMessage: () => ({ notifySuccess: vi.fn(), notifyError: vi.fn() }) }));

describe('CredentialsForm', () => {
  beforeEach(() => {
    useAppStore.setState({ authReady: true, user: { uid: 'uid-1' } as never, accounts: [], domains: [] });
    vi.mocked(FirebaseService.subscribeDomains).mockReturnValue(vi.fn());
    vi.mocked(DPDNSService.listDomains).mockResolvedValue({ success: true, data: [] });
    vi.mocked(CloudflareService.verifyCredentials).mockResolvedValue({ success: true, result: { id: 'user-1', email: 'user@example.com' } });
    vi.mocked(CloudflareService.resolveAccountId).mockResolvedValue('account-id');
    vi.mocked(CredentialsService.save).mockResolvedValue('acc-1' as any);
  });

  it('tests and saves credentials after validating both providers', async () => {
    render(<CredentialsForm />);

    // Click Add Account first to enter the add mode form
    fireEvent.click(screen.getAllByRole('button', { name: /Add Account/i })[0]);

    fireEvent.change(screen.getByPlaceholderText('e.g. Personal DPDNS Account'), { target: { value: 'Test Account' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. Tài khoản dùng cho project ABC...'), { target: { value: 'Test description' } });
    fireEvent.change(screen.getByPlaceholderText('dp_live_xxxxx'), { target: { value: 'dp-token' } });
    fireEvent.change(screen.getByPlaceholderText('user@example.com'), { target: { value: 'user@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('Auto-detect if blank'), { target: { value: 'account-id' } });
    fireEvent.change(screen.getByPlaceholderText('37-character global API key'), { target: { value: 'a'.repeat(37) } });
    fireEvent.click(screen.getByRole('button', { name: 'Save & Test →' }));

    await waitFor(() => expect(DPDNSService.listDomains).toHaveBeenCalledWith('dp-token'));
    expect(CloudflareService.verifyCredentials).toHaveBeenCalledWith('user@example.com', 'a'.repeat(37));
    expect(CredentialsService.save).toHaveBeenCalledWith('uid-1', {
      id: '',
      name: 'Test Account',
      description: 'Test description',
      dpdnsToken: 'dp-token',
      cloudflareEmail: 'user@example.com',
      cloudflareApiKey: 'a'.repeat(37),
      cloudflareAccountId: 'account-id',
      dpdnsVerified: true,
      cloudflareVerified: true,
    }, { dpdns: true, cloudflare: true });
  });

  it('can test only DPDNS token connectivity', async () => {
    render(<CredentialsForm />);

    // Click Add Account first to enter the add mode form
    fireEvent.click(screen.getAllByRole('button', { name: /Add Account/i })[0]);

    fireEvent.change(screen.getByPlaceholderText('dp_live_xxxxx'), { target: { value: 'dp-token' } });
    fireEvent.click(screen.getByRole('button', { name: 'Test Connection' }));

    await waitFor(() => expect(DPDNSService.listDomains).toHaveBeenCalledWith('dp-token'));
    expect(await screen.findByText('DPDNS connected successfully.')).toBeInTheDocument();
  });

  it('shows verification error dialog when API fails, and saves with unverified status upon confirmation', async () => {
    vi.mocked(DPDNSService.listDomains).mockRejectedValue(new Error('API rate limit exceeded'));
    
    render(<CredentialsForm />);

    // Click Add Account first to enter the add mode form
    fireEvent.click(screen.getAllByRole('button', { name: /Add Account/i })[0]);

    fireEvent.change(screen.getByPlaceholderText('e.g. Personal DPDNS Account'), { target: { value: 'Failed API Account' } });
    fireEvent.change(screen.getByPlaceholderText('dp_live_xxxxx'), { target: { value: 'dp-bad-token' } });
    fireEvent.change(screen.getByPlaceholderText('user@example.com'), { target: { value: 'user@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('37-character global API key'), { target: { value: 'a'.repeat(37) } });
    fireEvent.click(screen.getByRole('button', { name: 'Save & Test →' }));

    // Wait for the popup to show up
    const dialogTitle = await screen.findByText('Lưu Credentials bị lỗi xác thực');
    expect(dialogTitle).toBeInTheDocument();
    expect(screen.getByText('DPDNS: API rate limit exceeded')).toBeInTheDocument();

    // Click "Vẫn lưu" button
    fireEvent.click(screen.getByRole('button', { name: 'Vẫn lưu' }));

    await waitFor(() => {
      expect(CredentialsService.save).toHaveBeenCalledWith('uid-1', {
        id: '',
        name: 'Failed API Account',
        description: '',
        dpdnsToken: 'dp-bad-token',
        cloudflareEmail: 'user@example.com',
        cloudflareApiKey: 'a'.repeat(37),
        cloudflareAccountId: 'account-id',
        dpdnsVerified: false,
        cloudflareVerified: true,
      }, { dpdns: false, cloudflare: true });
    });
  });

  it('parses valid JSON config from quick import and fills the form', async () => {
    render(<CredentialsForm />);

    // Go to Add mode
    fireEvent.click(screen.getAllByRole('button', { name: /Add Account/i })[0]);

    // Check that we have the quick import textarea
    const textarea = screen.getByPlaceholderText(/Dán chuỗi cấu hình ở đây/);
    expect(textarea).toBeInTheDocument();

    // NOTE: Use clearly fake placeholder keys — never put real secrets in test files
    const FAKE_DPDNS_TOKEN = 'dp_live_FAKE_TEST_TOKEN_FOR_UNIT_TEST_ONLY';
    const FAKE_CF_API_KEY = 'cfk_FAKE_TEST_API_KEY_FOR_UNIT_TEST_ONLY_00000000000';
    const TEST_EMAIL = 'test-account@example-test.invalid';

    const jsonInput = JSON.stringify({
      email: TEST_EMAIL,
      userExtras: [
        { key: 'dpdns.apikey', value: FAKE_DPDNS_TOKEN },
        { key: 'cloudflare.token.global', value: FAKE_CF_API_KEY },
      ],
    });

    fireEvent.change(textarea, { target: { value: jsonInput } });
    fireEvent.click(screen.getByRole('button', { name: 'Trích xuất & Điền tự động' }));

    // Check that fields were populated
    expect(screen.getByPlaceholderText('e.g. Personal DPDNS Account')).toHaveValue('test-account'); // derived from email prefix
    expect(screen.getByPlaceholderText('dp_live_xxxxx')).toHaveValue(FAKE_DPDNS_TOKEN);
    expect(screen.getByPlaceholderText('user@example.com')).toHaveValue(TEST_EMAIL);
    expect(screen.getByPlaceholderText('37-character global API key')).toHaveValue(FAKE_CF_API_KEY);
  });

  it('parses unstructured plain text from quick import and fills the form', async () => {
    render(<CredentialsForm />);

    // Go to Add mode
    fireEvent.click(screen.getAllByRole('button', { name: /Add Account/i })[0]);

    const textarea = screen.getByPlaceholderText(/Dán chuỗi cấu hình ở đây/);

    const plainTextInput = `
      Some random text here
      email: test@example.com
      dpdns.apikey = dp_live_abcdef123
      cloudflare.token.global cfk_api_key_12345
      cloudflare.account_id = cf_acc_id_xyz
    `;

    fireEvent.change(textarea, { target: { value: plainTextInput } });
    fireEvent.click(screen.getByRole('button', { name: 'Trích xuất & Điền tự động' }));

    expect(screen.getByPlaceholderText('e.g. Personal DPDNS Account')).toHaveValue('test');
    expect(screen.getByPlaceholderText('dp_live_xxxxx')).toHaveValue('dp_live_abcdef123');
    expect(screen.getByPlaceholderText('user@example.com')).toHaveValue('test@example.com');
    expect(screen.getByPlaceholderText('37-character global API key')).toHaveValue('cfk_api_key_12345');
    expect(screen.getByPlaceholderText('Auto-detect if blank')).toHaveValue('cf_acc_id_xyz');
  });
});
