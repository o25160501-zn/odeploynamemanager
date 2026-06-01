'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  CheckCircle2,
  ShieldAlert,
  XCircle,
  Plus,
  Pencil,
  Trash2,
  ArrowLeft,
  Play,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Globe2,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useEffect, useMemo, useState } from 'react';
import { useFloatMessage } from '@/components/feedback/FloatMessageProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MaskedInput } from '@/components/credentials/MaskedInput';
import { credentialsSchema, type CredentialsFormValues } from '@/lib/validators';

interface ParsedValues {
  name?: string;
  description?: string;
  dpdnsToken?: string;
  cloudflareEmail?: string;
  cloudflareApiKey?: string;
  cloudflareAccountId?: string;
}

export const parseCredentialsText = (text: string): ParsedValues => {
  const result: ParsedValues = {};
  if (!text) return result;

  // 1. Try parsing as JSON first
  try {
    const cleanText = text.trim();
    if ((cleanText.startsWith('{') && cleanText.endsWith('}')) || 
        (cleanText.startsWith('[') && cleanText.endsWith(']'))) {
      const parsed = JSON.parse(cleanText);
      
      if (parsed && typeof parsed === 'object') {
        let extras: Array<{ key?: string; value?: any }> = [];
        if (Array.isArray(parsed)) {
          extras = parsed;
        } else {
          if (parsed.email) result.cloudflareEmail = String(parsed.email);
          if (parsed.cloudflareEmail) result.cloudflareEmail = String(parsed.cloudflareEmail);
          if (parsed.cloudflareApiKey) result.cloudflareApiKey = String(parsed.cloudflareApiKey);
          if (parsed.cloudflareAccountId) result.cloudflareAccountId = String(parsed.cloudflareAccountId);
          if (parsed.dpdnsToken) result.dpdnsToken = String(parsed.dpdnsToken);
          if (parsed.name) result.name = String(parsed.name);
          if (parsed.description) result.description = String(parsed.description);
          
          if (Array.isArray(parsed.userExtras)) {
            extras = parsed.userExtras;
          }
        }
        
        for (const item of extras) {
          if (item && typeof item === 'object' && 'key' in item && 'value' in item) {
            const k = String(item.key).trim();
            const v = String(item.value).trim();
            
            if (k === 'dpdns.apikey' || k === 'dpdns.token') {
              result.dpdnsToken = v;
            } else if (k === 'cloudflare.token.global' || k === 'cloudflare.apikey' || k === 'cloudflare.api_key' || k === 'cloudflare.token') {
              result.cloudflareApiKey = v;
            } else if (k === 'email' || k === 'cloudflare.email') {
              result.cloudflareEmail = v;
            } else if (k === 'cloudflare.account_id' || k === 'cloudflare.accountId') {
              result.cloudflareAccountId = v;
            }
          }
        }
        
        if (Object.keys(result).length > 0) {
          return result;
        }
      }
    }
  } catch (e) {
    // Fail silently and proceed to regex
  }

  // 2. Regex parsing (Fallback for non-JSON or malformed JSON)
  // Check key-value blocks e.g. "key": "dpdns.apikey", "value": "dp_live_xxx"
  const keyValBlockRegex = /["']key["']\s*:\s*["']([^"']+)["']\s*,\s*["']value["']\s*:\s*["']([^"']+)["']/g;
  let match;
  while ((match = keyValBlockRegex.exec(text)) !== null) {
    const k = match[1].trim();
    const v = match[2].trim();
    if (k === 'dpdns.apikey' || k === 'dpdns.token') {
      result.dpdnsToken = v;
    } else if (k === 'cloudflare.token.global' || k === 'cloudflare.apikey' || k === 'cloudflare.api_key' || k === 'cloudflare.token') {
      result.cloudflareApiKey = v;
    } else if (k === 'email' || k === 'cloudflare.email') {
      result.cloudflareEmail = v;
    } else if (k === 'cloudflare.account_id' || k === 'cloudflare.accountId') {
      result.cloudflareAccountId = v;
    }
  }

  const findValueWithRegex = (keys: string[]): string | undefined => {
    for (const key of keys) {
      const escapedKey = key.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`["']?${escapedKey}["']?\\s*[:=\\s]\\s*["']?([^"'\\r\\n,\\t\\s]+)["']?`, 'i');
      const m = text.match(regex);
      if (m && m[1]) {
        return m[1].trim();
      }
    }
    return undefined;
  };

  const email = findValueWithRegex(['cloudflareEmail', 'cloudflare_email', 'email']);
  if (email) result.cloudflareEmail = email;

  const dpdnsToken = findValueWithRegex(['dpdnsToken', 'dpdns_token', 'dpdns.apikey', 'dpdns.token', 'dpdns']);
  if (dpdnsToken) result.dpdnsToken = dpdnsToken;

  const cfApiKey = findValueWithRegex(['cloudflareApiKey', 'cloudflare_api_key', 'cloudflare.token.global', 'cloudflare.apikey', 'cloudflare.token', 'cloudflare']);
  if (cfApiKey) result.cloudflareApiKey = cfApiKey;

  const cfAccountId = findValueWithRegex(['cloudflareAccountId', 'cloudflare_account_id', 'cloudflare.account_id']);
  if (cfAccountId) result.cloudflareAccountId = cfAccountId;

  const name = findValueWithRegex(['name', 'friendlyName', 'accountName']);
  if (name) result.name = name;

  const desc = findValueWithRegex(['description', 'desc']);
  if (desc) result.description = desc;

  // 3. Absolute Fallbacks
  if (!result.dpdnsToken) {
    const dpdnsMatch = text.match(/(dp_live_[a-zA-Z0-9]+)/);
    if (dpdnsMatch) result.dpdnsToken = dpdnsMatch[1];
  }

  if (!result.cloudflareApiKey) {
    const cfkMatch = text.match(/(cfk_[a-zA-Z0-9]+)/);
    if (cfkMatch) result.cloudflareApiKey = cfkMatch[1];
  }

  if (!result.cloudflareEmail) {
    const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (emailMatch) result.cloudflareEmail = emailMatch[0];
  }

  return result;
};
import { toErrorMessage, formatDateYYYYMMDD } from '@/lib/utils';
import { CloudflareService } from '@/services/cloudflare.service';
import { CredentialsService } from '@/services/credentials.service';
import { DPDNSService } from '@/services/dpdns.service';
import { FirebaseService } from '@/services/firebase.service';
import { useAppStore } from '@/stores/app.store';
import type { DecryptedCredentialAccount } from '@/types';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { RegisterModal } from '@/components/domain/RegisterModal';

type SortField = 'created_at' | 'name' | 'description' | 'domains_count';
type SortDir = 'asc' | 'desc';

export function CredentialsForm({
  onOpenPlayground,
}: {
  onOpenPlayground?: (accountId: string) => void;
}) {
  const user = useAppStore((state) => state.user);
  const accounts = useAppStore((state) => state.accounts) || [];
  const domains = useAppStore((state) => state.domains) || [];
  const setAccounts = useAppStore((state) => state.setAccounts);
  const setDomains = useAppStore((state) => state.setDomains);
  const { notifyError, notifySuccess } = useFloatMessage();

  // Mode state: 'list' | 'add' | 'edit'
  const [mode, setMode] = useState<'list' | 'add' | 'edit'>('list');
  const [editingAccount, setEditingAccount] = useState<DecryptedCredentialAccount | null>(null);
  const [quickImportText, setQuickImportText] = useState('');

  const [dpdnsStatus, setDpdnsStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [cfStatus, setCfStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');

  const [isReloading, setIsReloading] = useState(false);
  const [filterEmail, setFilterEmail] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterDpdns, setFilterDpdns] = useState<'all' | 'verified' | 'unverified'>('all');
  const [filterCloudflare, setFilterCloudflare] = useState<'all' | 'verified' | 'unverified'>('all');

  // Sort state
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Direct register modal
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [registerDefaultAccountId, setRegisterDefaultAccountId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!user) return undefined;
    return FirebaseService.subscribeDomains(user.uid, setDomains);
  }, [setDomains, user]);

  // Per-account domain count
  const domainCountByAccount = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const d of domains) {
      if (d.credentialAccountId) {
        counts[d.credentialAccountId] = (counts[d.credentialAccountId] || 0) + 1;
      }
    }
    return counts;
  }, [domains]);

  // Domains per account
  const domainsByAccount = useMemo(() => {
    const map: Record<string, typeof domains> = {};
    for (const d of domains) {
      if (d.credentialAccountId) {
        if (!map[d.credentialAccountId]) map[d.credentialAccountId] = [];
        map[d.credentialAccountId].push(d);
      }
    }
    return map;
  }, [domains]);

  const reloadAccounts = async () => {
    if (!user) return;
    setIsReloading(true);
    try {
      const freshAccounts = await CredentialsService.load(user.uid);
      setAccounts(freshAccounts);
      notifySuccess('Settings · Reload accounts', 'Account list reloaded.');
    } catch (error) {
      notifyError('Settings · Reload accounts', error);
    } finally {
      setIsReloading(false);
    }
  };

  const form = useForm<CredentialsFormValues>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: {
      name: '',
      description: '',
      dpdnsToken: '',
      cloudflareEmail: '',
      cloudflareApiKey: '',
      cloudflareAccountId: '',
    },
  });

  const enterAddMode = () => {
    setMode('add');
    setEditingAccount(null);
    setQuickImportText('');
    form.reset({
      name: '',
      description: '',
      dpdnsToken: '',
      cloudflareEmail: '',
      cloudflareApiKey: '',
      cloudflareAccountId: '',
    });
    setDpdnsStatus('idle');
    setCfStatus('idle');
    setMessage('');
  };

  const enterEditMode = (account: DecryptedCredentialAccount) => {
    setMode('edit');
    setEditingAccount(account);
    setQuickImportText('');
    form.reset({
      name: account.name,
      description: account.description || '',
      dpdnsToken: account.dpdnsToken,
      cloudflareEmail: account.cloudflareEmail,
      cloudflareApiKey: account.cloudflareApiKey,
      cloudflareAccountId: account.cloudflareAccountId,
    });
    setDpdnsStatus(account.dpdnsVerified ? 'success' : 'idle');
    setCfStatus(account.cloudflareVerified ? 'success' : 'idle');
    setMessage('');
  };

  const exitToListView = async () => {
    setMode('list');
    setEditingAccount(null);
    setQuickImportText('');
    if (user) {
      // Reload accounts from DB to ensure local sync
      const freshAccounts = await CredentialsService.load(user.uid);
      setAccounts(freshAccounts);
    }
  };

  const applyQuickImport = () => {
    if (!quickImportText.trim()) return;

    try {
      const parsed = parseCredentialsText(quickImportText);
      const foundFields: string[] = [];

      if (parsed.cloudflareEmail ) {
        form.setValue('name', parsed.cloudflareEmail);
        foundFields.push('Friendly Name');
      } else if (parsed.cloudflareEmail) {
        const prefix = parsed.cloudflareEmail.split('@')[0];
        form.setValue('name', prefix);
        foundFields.push('Friendly Name (từ Email)');
      }

      if (parsed.description) {
        form.setValue('description', parsed.description);
        foundFields.push('Description');
      }

      if (parsed.dpdnsToken) {
        form.setValue('dpdnsToken', parsed.dpdnsToken);
        foundFields.push('DPDNS Token');
      }

      if (parsed.cloudflareEmail) {
        form.setValue('cloudflareEmail', parsed.cloudflareEmail);
        foundFields.push('Cloudflare Email');
      }

      if (parsed.cloudflareApiKey) {
        form.setValue('cloudflareApiKey', parsed.cloudflareApiKey);
        foundFields.push('Cloudflare Global API Key');
      }

      if (parsed.cloudflareAccountId) {
        form.setValue('cloudflareAccountId', parsed.cloudflareAccountId);
        foundFields.push('Cloudflare Account ID');
      }

      if (foundFields.length > 0) {
        notifySuccess(
          'Quick Import',
          `Đã tự động điền các trường: ${foundFields.join(', ')}`
        );
      } else {
        notifyError(
          'Quick Import',
          new Error('Không tìm thấy thông tin cấu hình hợp lệ (Email, DPDNS Token, hay Cloudflare API Key) trong chuỗi đã dán.')
        );
      }
    } catch (err) {
      notifyError('Quick Import', err);
    }
  };

  const testDpdns = async () => {
    setMessage('');
    const token = form.getValues('dpdnsToken');
    if (!token) return setDpdnsStatus('error');
    try {
      await DPDNSService.listDomains(token);
      setDpdnsStatus('success');
      setMessage('DPDNS connected successfully.');
      notifySuccess('Settings · Test DPDNS connection', 'DPDNS connected successfully.');
    } catch (error) {
      setDpdnsStatus('error');
      setMessage(toErrorMessage(error, 'API Token không hợp lệ'));
      notifyError('Settings · Test DPDNS connection', error, [token]);
    }
  };

  const testCloudflare = async () => {
    setMessage('');
    const email = form.getValues('cloudflareEmail');
    const apiKey = form.getValues('cloudflareApiKey');
    if (!email || !apiKey) return setCfStatus('error');
    try {
      await CloudflareService.verifyCredentials(email, apiKey);
      setCfStatus('success');
      setMessage('Cloudflare credentials are valid.');
      notifySuccess('Settings · Test Cloudflare connection', 'Cloudflare credentials are valid.');
    } catch (error) {
      setCfStatus('error');
      setMessage(toErrorMessage(error, 'Cloudflare credentials are invalid'));
      notifyError('Settings · Test Cloudflare connection', error, [apiKey]);
    }
  };

  const onSubmit = async (values: CredentialsFormValues) => {
    if (!user) return;
    setMessage('');
    setDpdnsStatus('idle');
    setCfStatus('idle');

    let dpdnsOk = false;
    let cfOk = false;
    let resolvedAccountId = values.cloudflareAccountId || '';
    const errorMsgs: string[] = [];

    // Step 1: Verify DPDNS Token
    try {
      await DPDNSService.listDomains(values.dpdnsToken);
      setDpdnsStatus('success');
      dpdnsOk = true;
    } catch (error) {
      setDpdnsStatus('error');
      errorMsgs.push(`DPDNS: ${toErrorMessage(error, 'Token không hợp lệ')}`);
    }

    // Step 2: Verify Cloudflare
    try {
      await CloudflareService.verifyCredentials(values.cloudflareEmail, values.cloudflareApiKey);
      resolvedAccountId = await CloudflareService.resolveAccountId(
        values.cloudflareEmail,
        values.cloudflareApiKey,
        values.cloudflareAccountId
      );
      setCfStatus('success');
      cfOk = true;
    } catch (error) {
      setCfStatus('error');
      errorMsgs.push(`Cloudflare: ${toErrorMessage(error, 'Credentials are invalid')}`);
    }

    if (!dpdnsOk || !cfOk) {
      const combinedError = errorMsgs.join(' | ');
      setMessage(combinedError);
      setConfirmSaveError({
        open: true,
        values,
        dpdnsOk,
        cfOk,
        errorMessage: combinedError,
      });
      return;
    }

    try {
      // Step 3: Encrypt and save account to Firebase
      const accountData: Omit<DecryptedCredentialAccount, 'created_at' | 'updated_at'> & { created_at?: number } = {
        id: editingAccount?.id || '', // Service will generate ID if blank
        name: values.name,
        description: values.description || '',
        dpdnsToken: values.dpdnsToken,
        cloudflareEmail: values.cloudflareEmail,
        cloudflareApiKey: values.cloudflareApiKey,
        cloudflareAccountId: resolvedAccountId,
        dpdnsVerified: true,
        cloudflareVerified: true,
      };
      if (editingAccount?.created_at) {
        accountData.created_at = editingAccount.created_at;
      }

      await CredentialsService.save(user.uid, accountData, { dpdns: true, cloudflare: true });
      
      notifySuccess('Settings · Save credentials', 'Account credentials saved and verified.');
      await exitToListView();
    } catch (error) {
      setMessage(toErrorMessage(error, 'Verification or save failed'));
      notifyError('Settings · Save credentials', error, [values.dpdnsToken, values.cloudflareApiKey]);
    }
  };

  const saveWithErrors = async () => {
    if (!user || !confirmSaveError.values) return;
    const { values, dpdnsOk, cfOk } = confirmSaveError;

    try {
      let resolvedAccountId = values.cloudflareAccountId || '';

      if (cfOk) {
        try {
          resolvedAccountId = await CloudflareService.resolveAccountId(
            values.cloudflareEmail,
            values.cloudflareApiKey,
            values.cloudflareAccountId
          );
        } catch (e) {
          // Ignore error since we are in save with errors mode
        }
      }

      const accountData: Omit<DecryptedCredentialAccount, 'created_at' | 'updated_at'> & { created_at?: number } = {
        id: editingAccount?.id || '',
        name: values.name,
        description: values.description || '',
        dpdnsToken: values.dpdnsToken,
        cloudflareEmail: values.cloudflareEmail,
        cloudflareApiKey: values.cloudflareApiKey,
        cloudflareAccountId: resolvedAccountId,
        dpdnsVerified: dpdnsOk,
        cloudflareVerified: cfOk,
      };
      if (editingAccount?.created_at) {
        accountData.created_at = editingAccount.created_at;
      }

      await CredentialsService.save(user.uid, accountData, { dpdns: dpdnsOk, cloudflare: cfOk });

      notifySuccess('Settings · Save credentials', 'Account credentials saved (unverified services recorded).');
      await exitToListView();
    } catch (error) {
      setMessage(toErrorMessage(error, 'Save failed'));
      notifyError('Settings · Save credentials', error, [values.dpdnsToken, values.cloudflareApiKey]);
    } finally {
      setConfirmSaveError({ open: false, values: null, dpdnsOk: false, cfOk: false, errorMessage: '' });
    }
  };

  const [confirmDelete, setConfirmDelete] = useState<{
    open: boolean;
    accountId: string;
  }>({ open: false, accountId: '' });

  const [confirmSaveError, setConfirmSaveError] = useState<{
    open: boolean;
    values: CredentialsFormValues | null;
    dpdnsOk: boolean;
    cfOk: boolean;
    errorMessage: string;
  }>({
    open: false,
    values: null,
    dpdnsOk: false,
    cfOk: false,
    errorMessage: '',
  });

  const deleteAccount = async (accountId: string) => {
    if (!user) return;
    try {
      await CredentialsService.delete(user.uid, accountId);
      const updated = await CredentialsService.load(user.uid);
      setAccounts(updated);
      notifySuccess('Settings · Delete credentials', 'Account configuration deleted.');
    } catch (error) {
      notifyError('Settings · Delete credentials', error);
    }
  };

  const error = form.formState.errors;

  const openRegisterForAccount = (accountId: string) => {
    setRegisterDefaultAccountId(accountId);
    setRegisterModalOpen(true);
  };

  const hasActiveFilters = filterEmail !== '' || filterDate !== '' || filterDpdns !== 'all' || filterCloudflare !== 'all';
  const resetFilters = () => {
    setFilterEmail('');
    setFilterDate('');
    setFilterDpdns('all');
    setFilterCloudflare('all');
  };

  const toggleSortDir = () => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));

  const filteredAndSortedAccounts = useMemo(() => {
    let result = accounts.filter((acc) => {
      if (filterEmail) {
        const emailLower = acc.cloudflareEmail.toLowerCase();
        const filterEmailLower = filterEmail.toLowerCase();
        if (!emailLower.includes(filterEmailLower)) return false;
      }
      if (filterDate) {
        const dateStr = acc.created_at ? formatDateYYYYMMDD(acc.created_at) : 'N/A';
        const cleanFilterDate = filterDate.replace(/-/g, '.');
        if (!dateStr.includes(cleanFilterDate)) return false;
      }
      if (filterDpdns !== 'all') {
        const wantVerified = filterDpdns === 'verified';
        if (acc.dpdnsVerified !== wantVerified) return false;
      }
      if (filterCloudflare !== 'all') {
        const wantVerified = filterCloudflare === 'verified';
        if (acc.cloudflareVerified !== wantVerified) return false;
      }
      return true;
    });

    result = [...result].sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;
      switch (sortField) {
        case 'name':
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case 'description':
          aVal = (a.description || '').toLowerCase();
          bVal = (b.description || '').toLowerCase();
          break;
        case 'domains_count':
          aVal = domainCountByAccount[a.id] || 0;
          bVal = domainCountByAccount[b.id] || 0;
          break;
        case 'created_at':
        default:
          aVal = a.created_at || 0;
          bVal = b.created_at || 0;
          break;
      }
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [accounts, filterEmail, filterDate, filterDpdns, filterCloudflare, sortField, sortDir, domainCountByAccount]);

  const SortDirIcon = sortDir === 'asc' ? ArrowUp : ArrowDown;

  if (mode === 'list') {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-ink">Configured Accounts</h2>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={reloadAccounts} disabled={isReloading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isReloading ? 'animate-spin' : ''}`} /> Reload
            </Button>
            <Button onClick={enterAddMode}>
              <Plus className="mr-2 h-4 w-4" /> Add Account
            </Button>
          </div>
        </div>

        {user && (
          <div className="flex items-center justify-between rounded-xl border border-hairline bg-surface-soft p-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-ink">Your User ID (UID) for API Testing:</span>
              <code className="rounded bg-canvas px-2 py-1 font-mono text-primary select-all">{user.uid}</code>
            </div>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(user.uid);
                notifySuccess('Copy UID', 'User ID copied to clipboard.');
              }}
              className="text-[10px] font-semibold uppercase tracking-wider text-primary hover:underline"
            >
              Copy UID
            </button>
          </div>
        )}

        {accounts.length === 0 ? (
          <div className="feature-card py-12 text-center">
            <ShieldAlert className="mx-auto h-12 w-12 text-muted-soft mb-3" />
            <h3 className="text-lg font-medium text-ink">No credential accounts</h3>
            <p className="text-body text-sm mt-1 max-w-sm mx-auto">Configure your first DPDNS token and Cloudflare credentials to start registering domains.</p>
            <Button className="mt-4" onClick={enterAddMode}>Add Account</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Filter + Sort controls */}
            <div className="rounded-xl border border-hairline bg-surface-soft p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-ink/80">Filter & Sort Accounts</span>
                {hasActiveFilters && (
                  <button onClick={resetFilters} className="text-xs font-semibold text-primary hover:underline">
                    Reset Filters
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-soft">Cloudflare Email</label>
                  <Input
                    placeholder="Filter by email..."
                    value={filterEmail}
                    onChange={(e) => setFilterEmail(e.target.value)}
                    className="h-8 text-xs bg-canvas"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-soft">Date (YYYY.MM.DD)</label>
                  <Input
                    placeholder="e.g. 2026.05.22"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="h-8 text-xs bg-canvas font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-soft">DPDNS API Status</label>
                  <select
                    value={filterDpdns}
                    onChange={(e) => setFilterDpdns(e.target.value as any)}
                    className="flex h-8 w-full rounded-md border border-input bg-canvas px-3 py-1 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="all">All</option>
                    <option value="verified">Verified (Active)</option>
                    <option value="unverified">Unverified (Error)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-soft">Cloudflare API Status</label>
                  <select
                    value={filterCloudflare}
                    onChange={(e) => setFilterCloudflare(e.target.value as any)}
                    className="flex h-8 w-full rounded-md border border-input bg-canvas px-3 py-1 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="all">All</option>
                    <option value="verified">Verified (Active)</option>
                    <option value="unverified">Unverified (Error)</option>
                  </select>
                </div>
              </div>

              {/* Sort controls */}
              <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-hairline">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-soft">Sort By</span>
                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      { value: 'created_at', label: 'Date Created' },
                      { value: 'name', label: 'Name' },
                      { value: 'description', label: 'Description' },
                      { value: 'domains_count', label: 'Domains' },
                    ] as { value: SortField; label: string }[]
                  ).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        if (sortField === opt.value) {
                          toggleSortDir();
                        } else {
                          setSortField(opt.value);
                          setSortDir('asc');
                        }
                      }}
                      className={`flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold transition-all ${
                        sortField === opt.value
                          ? 'bg-primary text-white shadow-sm'
                          : 'bg-canvas text-body border border-hairline hover:text-ink'
                      }`}
                    >
                      {opt.label}
                      {sortField === opt.value && <SortDirIcon className="h-3 w-3" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* List of Accounts */}
            {filteredAndSortedAccounts.length === 0 ? (
              <div className="feature-card py-8 text-center border border-dashed border-hairline rounded-xl">
                <p className="text-body text-sm">No accounts found matching your filters.</p>
                <Button variant="secondary" className="mt-2 text-xs h-8" onClick={resetFilters}>Clear Filters</Button>
              </div>
            ) : (
              filteredAndSortedAccounts.map((acc) => {
                const accDomains = domainsByAccount[acc.id] || [];
                const domainCount = accDomains.length;
                return (
                  <div key={acc.id} className="asset-row p-6 bg-canvas border border-hairline rounded-xl hover:shadow-sm transition-all duration-200">
                    <div className="flex min-w-0 items-start gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="break-all text-lg font-semibold tracking-tight text-ink">{acc.name}</h3>
                          <span className="pill-badge bg-surface-soft text-body text-xs font-mono">{acc.cloudflareEmail}</span>
                          <span className="text-[11px] text-muted-soft bg-surface-soft px-2 py-0.5 rounded font-mono">
                            Created: {acc.created_at ? formatDateYYYYMMDD(acc.created_at) : 'N/A'}
                          </span>
                        </div>

                        {/* Description */}
                        {acc.description && (
                          <p className="mt-1.5 text-sm text-body italic">{acc.description}</p>
                        )}

                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className={`pill-badge text-xs gap-1.5 ${acc.dpdnsVerified ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                            {acc.dpdnsVerified ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                            DPDNS API
                          </span>
                          <span className={`pill-badge text-xs gap-1.5 ${acc.cloudflareVerified ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                            {acc.cloudflareVerified ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                            Cloudflare API
                          </span>
                          {/* Domain count badge */}
                          <span className="pill-badge text-xs gap-1.5 bg-blue-50 text-blue-700">
                            <Globe2 className="h-3 w-3" />
                            {domainCount} domain{domainCount !== 1 ? 's' : ''}
                          </span>
                        </div>

                        {/* List of registered domains */}
                        {accDomains.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {accDomains.map((d) => (
                              <span
                                key={d.fqdn}
                                className={`inline-flex items-center gap-1 rounded px-2 py-0.5 font-mono text-[11px] font-medium border ${
                                  d.status === 'active'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                    : d.status === 'error'
                                    ? 'bg-red-50 text-red-700 border-red-100'
                                    : 'bg-surface-soft text-body border-hairline'
                                }`}
                              >
                                {d.fqdn}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      {/* Register domain directly from this account */}
                      <Button
                        variant="secondary"
                        size="sm"
                        className="text-xs"
                        onClick={() => openRegisterForAccount(acc.id)}
                        title="Register a new domain using this account"
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" /> Register Domain
                      </Button>

                      {onOpenPlayground && (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="text-xs"
                          onClick={() => onOpenPlayground(acc.id)}
                          title="Open this account in API Playground"
                        >
                          <Play className="h-3.5 w-3.5 mr-1" /> Playground
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => enterEditMode(acc)} aria-label="Edit account" title="Edit account">
                        <Pencil className="h-4 w-4 text-body hover:text-ink" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setConfirmDelete({ open: true, accountId: acc.id })} aria-label="Delete account" title="Delete account">
                        <Trash2 className="h-4 w-4 text-semantic-down" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        <ConfirmDialog
          open={confirmDelete.open}
          onOpenChange={(open) => setConfirmDelete((prev) => ({ ...prev, open }))}
          title="Delete Account Credentials"
          description="Are you sure you want to delete this account configuration? This will not affect registered domains, but you will not be able to manage them unless another account is selected."
          variant="danger"
          confirmLabel="Delete"
          onConfirm={() => deleteAccount(confirmDelete.accountId)}
        />

        {/* Direct register modal from account item */}
        <RegisterModal
          open={registerModalOpen}
          onOpenChange={(open) => {
            setRegisterModalOpen(open);
            if (!open) setRegisterDefaultAccountId(undefined);
          }}
          defaultAccountId={registerDefaultAccountId}
        />
      </div>
    );
  }

  return (
    <>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="flex items-center gap-4">
          <Button type="button" variant="ghost" size="icon" onClick={exitToListView}>
            <ArrowLeft className="h-5 w-5 text-body hover:text-ink" />
          </Button>
          <div>
            <h2 className="text-xl font-semibold text-ink">
              {mode === 'edit' ? `Edit Account: ${editingAccount?.name}` : 'Add New Credentials Account'}
            </h2>
            <p className="text-sm text-body">Provide connection details for your DPDNS and Cloudflare credentials.</p>
          </div>
        </div>

        <section className="feature-card border border-primary/20 bg-primary/5">
          <div className="flex flex-col gap-1">
            <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
              <span>⚡ Nhập nhanh cấu hình (Quick Import)</span>
            </h3>
            <p className="text-xs text-body">
              Dán chuỗi cấu hình (định dạng JSON hoặc dạng văn bản chứa key-value) vào ô bên dưới. Hệ thống sẽ tự động tìm kiếm các trường tương ứng (Email, DPDNS Token, Cloudflare Global API Key, Account ID...) và điền vào form.
            </p>
          </div>
          <div className="mt-4 space-y-3">
            <Textarea
              placeholder={`Dán chuỗi cấu hình ở đây...\nVí dụ:\n{\n  "email": "user@example.com",\n  "userExtras": [\n    { "key": "dpdns.apikey", "value": "dp_live_xxxx" },\n    { "key": "cloudflare.token.global", "value": "cfk_xxxx" }\n  ]\n}`}
              value={quickImportText}
              onChange={(e) => setQuickImportText(e.target.value)}
              className="font-mono text-xs bg-canvas/50 min-h-24"
            />
            <div className="flex justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={applyQuickImport}
                disabled={!quickImportText.trim()}
                className="text-xs h-9"
              >
                Trích xuất & Điền tự động
              </Button>
            </div>
          </div>
        </section>

        <section className="feature-card">
          <h3 className="text-lg font-semibold text-ink mb-4">Account Label</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-ink">Friendly Account Name</label>
              <Input className="mt-2" placeholder="e.g. Personal DPDNS Account" {...form.register('name')} />
              {error.name ? <p className="mt-2 text-sm text-red-600">{error.name.message}</p> : null}
            </div>
            <div>
              <label className="block text-sm font-semibold text-ink">
                Description / Diễn giải <span className="font-normal text-muted-soft">(Optional)</span>
              </label>
              <Input className="mt-2" placeholder="e.g. Tài khoản dùng cho project ABC..." {...form.register('description')} />
              {error.description ? <p className="mt-2 text-sm text-red-600">{error.description.message}</p> : null}
            </div>
          </div>
        </section>

        <section className="feature-card">
          <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-ink">DigitalPlat DPDNS</h2>
              <p className="text-sm text-body">Bearer API token used to register and manage DPDNS domains.</p>
            </div>
            {dpdnsStatus === 'success' ? <Status ok label="Connected" /> : dpdnsStatus === 'error' ? <Status label="Invalid token" /> : null}
          </div>
          <label className="block text-sm font-semibold text-ink">DPDNS Token</label>
          <div className="mt-2 flex flex-col gap-3 md:flex-row">
            <MaskedInput placeholder="dp_live_xxxxx" {...form.register('dpdnsToken')} />
            <Button type="button" variant="secondary" onClick={testDpdns} disabled={form.formState.isSubmitting}>
              Test Connection
            </Button>
          </div>
          {error.dpdnsToken ? <p className="mt-2 text-sm text-red-600">{error.dpdnsToken.message}</p> : null}
        </section>

        <section className="feature-card">
          <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-ink">Cloudflare</h2>
              <p className="text-sm text-body">Required to create Zones and manage nameservers dynamically.</p>
            </div>
            {cfStatus === 'success' ? <Status ok label="Connected" /> : cfStatus === 'error' ? <Status label="Invalid credentials" /> : null}
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <div className="flex gap-2">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <p>Cloudflare Global API Key grants broad access. Make sure your Firebase project is secure and rotate key if necessary.</p>
            </div>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-ink">Cloudflare Email</label>
              <Input className="mt-2" placeholder="user@example.com" {...form.register('cloudflareEmail')} />
              {error.cloudflareEmail ? <p className="mt-2 text-sm text-red-600">{error.cloudflareEmail.message}</p> : null}
            </div>
            <div>
              <label className="block text-sm font-semibold text-ink">Cloudflare Account ID</label>
              <Input className="mt-2 font-mono" placeholder="Auto-detect if blank" {...form.register('cloudflareAccountId')} />
              {error.cloudflareAccountId ? <p className="mt-2 text-sm text-red-600">{error.cloudflareAccountId.message}</p> : null}
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-ink">Cloudflare Global API Key</label>
              <div className="mt-2 flex flex-col gap-3 md:flex-row">
                <MaskedInput className="font-mono flex-1" placeholder="37-character global API key" {...form.register('cloudflareApiKey')} />
                <Button type="button" variant="secondary" onClick={testCloudflare} disabled={form.formState.isSubmitting}>
                  Test Cloudflare
                </Button>
              </div>
              {error.cloudflareApiKey ? <p className="mt-2 text-sm text-red-600">{error.cloudflareApiKey.message}</p> : null}
            </div>
          </div>
        </section>

        {message ? <p className="rounded-lg border border-hairline bg-surface-soft p-4 text-sm text-body">{message}</p> : null}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={exitToListView} disabled={form.formState.isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Testing…' : 'Save & Test →'}
          </Button>
        </div>
      </form>

      <ConfirmDialog
        open={confirmSaveError.open}
        onOpenChange={(open) => setConfirmSaveError((prev) => ({ ...prev, open }))}
        title="Lưu Credentials bị lỗi xác thực"
        description={`Có lỗi xảy ra khi xác thực API: ${confirmSaveError.errorMessage}. Bạn có chắc chắn muốn lưu thông tin credentials này bất chấp lỗi kết nối không?`}
        confirmLabel="Vẫn lưu"
        cancelLabel="Hủy"
        onConfirm={saveWithErrors}
      />
    </>
  );
}

function Status({ ok = false, label }: { ok?: boolean; label: string }) {
  return (
    <span className={`pill-badge gap-2 ${ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
      {ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
      {label}
    </span>
  );
}
