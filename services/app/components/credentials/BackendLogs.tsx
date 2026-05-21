'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { ref as dbRef, onValue, remove } from 'firebase/database';
import { Trash2, Calendar, Filter, Search, AlertTriangle, ShieldCheck, RefreshCw } from 'lucide-react';
import { useFloatMessage } from '@/components/feedback/FloatMessageProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

interface LogItem {
  id: string; // timestamp
  date: string; // YYYY-MM-DD
  action: string;
  status: 'success' | 'failed';
  timestamp: number;
  ip?: string;
  userId?: string;
  email?: string;
  accountId?: string;
  message?: string;
  error?: string;
}

export function BackendLogs() {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { notify, notifySuccess, notifyError } = useFloatMessage();

  // Filter states
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterDate, setFilterDate] = useState('');

  // Bulk delete states
  const [deleteDate, setDeleteDate] = useState('');
  const [deleteMonth, setDeleteMonth] = useState('');

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
    variant?: 'danger' | 'primary';
  }>({
    open: false,
    title: '',
    description: '',
    onConfirm: () => {},
    variant: 'primary',
  });

  useEffect(() => {
    const logsRef = dbRef(db, 'logs');
    setLoading(true);

    const unsubscribe = onValue(logsRef, (snapshot) => {
      const data = snapshot.val();
      const flatLogs: LogItem[] = [];

      if (data) {
        // data: { "2026-05-20": { "1716223400000": LogItem } }
        Object.entries(data).forEach(([date, dateLogs]: [string, any]) => {
          if (dateLogs && typeof dateLogs === 'object') {
            Object.entries(dateLogs).forEach(([timestampStr, logDetail]: [string, any]) => {
              flatLogs.push({
                ...logDetail,
                id: timestampStr,
                date,
                timestamp: Number(timestampStr),
              });
            });
          }
        });
      }

      // Sắp xếp log mới nhất lên đầu
      flatLogs.sort((a, b) => b.timestamp - a.timestamp);
      setLogs(flatLogs);
      setLoading(false);
    }, (error) => {
      console.error('Failed to subscribe to logs:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Filter logic
  const filteredLogs = logs.filter((log) => {
    // Search filter (matches email, userId, ip, message, or error)
    const matchesSearch = search.trim() === '' || 
      (log.email?.toLowerCase().includes(search.toLowerCase())) ||
      (log.userId?.toLowerCase().includes(search.toLowerCase())) ||
      (log.ip?.toLowerCase().includes(search.toLowerCase())) ||
      (log.message?.toLowerCase().includes(search.toLowerCase())) ||
      (log.error?.toLowerCase().includes(search.toLowerCase()));

    // Action filter
    const matchesAction = filterAction === 'ALL' || log.action === filterAction;

    // Status filter
    const matchesStatus = filterStatus === 'ALL' || log.status === filterStatus;

    // Date filter
    const matchesDate = filterDate === '' || log.date === filterDate;

    return matchesSearch && matchesAction && matchesStatus && matchesDate;
  });

  // Extract unique actions for filter dropdown
  const uniqueActions = Array.from(new Set(logs.map(log => log.action)));

  // Delete individual log item
  const handleDeleteItem = (date: string, id: string) => {
    setConfirmDialog({
      open: true,
      title: 'Delete Log Entry',
      description: 'Are you sure you want to delete this log entry?',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await remove(dbRef(db, `logs/${date}/${id}`));
          notifySuccess('Logs · Delete Item', 'Log entry deleted successfully.');
        } catch (err: any) {
          notifyError('Logs · Delete Item', err);
        }
      }
    });
  };

  // Delete by day
  const handleDeleteByDay = () => {
    if (!deleteDate) {
      notify({
        type: 'error',
        title: 'Validation Error',
        message: 'Please select or input a date in YYYY-MM-DD format.',
        action: 'Logs · Bulk Delete',
        sticky: false
      });
      return;
    }
    setConfirmDialog({
      open: true,
      title: 'Delete Daily Logs',
      description: `Are you sure you want to delete all logs for date: ${deleteDate}?`,
      variant: 'danger',
      onConfirm: async () => {
        try {
          await remove(dbRef(db, `logs/${deleteDate}`));
          notifySuccess('Logs · Bulk Delete', `Deleted all logs for date ${deleteDate}.`);
          setDeleteDate('');
        } catch (err: any) {
          notifyError('Logs · Bulk Delete', err);
        }
      }
    });
  };

  // Delete by month
  const handleDeleteByMonth = () => {
    // deleteMonth format: YYYY-MM
    const regex = /^\d{4}-\d{2}$/;
    if (!regex.test(deleteMonth)) {
      notify({
        type: 'error',
        title: 'Validation Error',
        message: 'Please enter month in YYYY-MM format (e.g. 2026-05).',
        action: 'Logs · Bulk Delete',
        sticky: false
      });
      return;
    }
    setConfirmDialog({
      open: true,
      title: 'Delete Monthly Logs',
      description: `Are you sure you want to delete all logs for the month: ${deleteMonth}?`,
      variant: 'danger',
      onConfirm: async () => {
        try {
          // Tìm các date key bắt đầu bằng deleteMonth
          const uniqueDates = Array.from(new Set(logs.map(log => log.date)));
          const targetDates = uniqueDates.filter(date => date.startsWith(deleteMonth));

          if (targetDates.length === 0) {
            notifySuccess('Logs · Bulk Delete', `No logs found matching month ${deleteMonth}.`);
            return;
          }

          await Promise.all(
            targetDates.map(date => remove(dbRef(db, `logs/${date}`)))
          );
          
          notifySuccess('Logs · Bulk Delete', `Deleted logs for ${targetDates.length} days matching month ${deleteMonth}.`);
          setDeleteMonth('');
        } catch (err: any) {
          notifyError('Logs · Bulk Delete', err);
        }
      }
    });
  };

  // Clear all logs
  const handleClearAll = () => {
    setConfirmDialog({
      open: true,
      title: 'Clear All System Logs',
      description: 'WARNING: Are you sure you want to delete ALL logs in the system? This action is irreversible.',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await remove(dbRef(db, 'logs'));
          notifySuccess('Logs · Clear All', 'All system log entries cleared.');
        } catch (err: any) {
          notifyError('Logs · Clear All', err);
        }
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Bulk Delete Options */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Delete by Day */}
        <div className="feature-card p-4 space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-ink flex items-center gap-1.5">
            <Trash2 className="h-3.5 w-3.5 text-semantic-down" /> Delete by Day
          </h4>
          <div className="flex gap-2">
            <Input 
              type="date" 
              className="text-xs h-9 font-mono" 
              value={deleteDate} 
              onChange={(e) => setDeleteDate(e.target.value)} 
            />
            <Button 
              variant="danger" 
              size="sm"
              onClick={handleDeleteByDay}
            >
              Clear Day
            </Button>
          </div>
        </div>

        {/* Delete by Month */}
        <div className="feature-card p-4 space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-ink flex items-center gap-1.5">
            <Trash2 className="h-3.5 w-3.5 text-semantic-down" /> Delete by Month
          </h4>
          <div className="flex gap-2">
            <Input 
              placeholder="YYYY-MM (e.g. 2026-05)" 
              className="text-xs h-9 font-mono"
              value={deleteMonth} 
              onChange={(e) => setDeleteMonth(e.target.value)} 
            />
            <Button 
              variant="danger" 
              size="sm"
              onClick={handleDeleteByMonth}
            >
              Clear Month
            </Button>
          </div>
        </div>

        {/* Clear All */}
        <div className="feature-card p-4 flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-ink flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-red-500" /> Administrative Action
            </h4>
            <p className="text-[11px] text-body mt-1">Erase every action audit and daily access log recorded.</p>
          </div>
          <Button 
            variant="danger" 
            size="sm" 
            className="w-full mt-3"
            onClick={handleClearAll}
          >
            Erase All System Logs
          </Button>
        </div>
      </div>

      {/* Toolbar Filter */}
      <div className="feature-card p-4 space-y-4">
        <div className="flex items-center justify-between border-b border-hairline pb-2">
          <h3 className="text-sm font-semibold text-ink flex items-center gap-1.5">
            <Filter className="h-4 w-4 text-primary" /> Filter and Search
          </h3>
          <span className="text-xs font-mono text-body bg-surface-soft px-2 py-0.5 rounded">
            Found {filteredLogs.length} / {logs.length} logs
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-soft" />
            <Input
              placeholder="Search email, IP, message..."
              className="pl-9 text-xs h-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Action Select */}
          <select
            className="flex h-9 w-full rounded-md border border-hairline bg-canvas px-3 py-1 text-xs transition-colors hover:border-body focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary font-mono text-ink"
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
          >
            <option value="ALL">All Actions</option>
            {uniqueActions.map(action => (
              <option key={action} value={action}>{action}</option>
            ))}
          </select>

          {/* Status Select */}
          <select
            className="flex h-9 w-full rounded-md border border-hairline bg-canvas px-3 py-1 text-xs transition-colors hover:border-body focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary text-ink"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="ALL">All Statuses</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
          </select>

          {/* Date Picker */}
          <Input 
            type="date" 
            className="text-xs h-9 font-mono"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            title="Filter by specific day"
          />
        </div>
      </div>

      {/* Logs Table */}
      <div className="feature-card p-0 overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-xs text-body flex flex-col items-center justify-center gap-2">
            <RefreshCw className="h-6 w-6 animate-spin text-primary" />
            Loading system log stream...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-16 text-center text-xs text-body border border-dashed border-hairline rounded-xl">
            <ShieldCheck className="mx-auto h-10 w-10 text-muted-soft mb-2" />
            No logs matched the specified filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono text-ink border-collapse">
              <thead>
                <tr className="border-b border-hairline bg-surface-soft text-[10px] uppercase tracking-wider text-body">
                  <th className="px-4 py-3 font-semibold w-36">Time & Date</th>
                  <th className="px-4 py-3 font-semibold w-48">Action</th>
                  <th className="px-4 py-3 font-semibold w-24">Status</th>
                  <th className="px-4 py-3 font-semibold">Details</th>
                  <th className="px-4 py-3 font-semibold w-16 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-surface-soft/40 transition-colors">
                    <td className="px-4 py-3 align-top whitespace-nowrap">
                      <div className="font-semibold text-ink">{log.date}</div>
                      <div className="text-[10px] text-body mt-0.5">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span className="rounded bg-canvas border border-hairline px-1.5 py-0.5 font-bold text-[10px] tracking-tight text-primary">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span className={`pill-badge font-semibold text-[10px] uppercase ${
                        log.status === 'success' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top space-y-1">
                      {log.email && (
                        <div>
                          <span className="text-body text-[10px] mr-1.5">Email:</span>
                          <span className="text-ink text-[11px] font-semibold">{log.email}</span>
                        </div>
                      )}
                      {log.userId && (
                        <div className="truncate max-w-xs">
                          <span className="text-body text-[10px] mr-1.5">User UID:</span>
                          <span className="text-body text-[10px] select-all font-semibold">{log.userId}</span>
                        </div>
                      )}
                      {log.ip && (
                        <div>
                          <span className="text-body text-[10px] mr-1.5">IP:</span>
                          <span className="text-ink text-[10px]">{log.ip}</span>
                        </div>
                      )}
                      {log.message && (
                        <div className="text-[11px] font-sans text-ink leading-relaxed mt-1">
                          {log.message}
                        </div>
                      )}
                      {log.error && (
                        <div className="rounded bg-red-50/50 border border-red-100 p-2 text-[10px] text-red-800 font-mono mt-1 whitespace-pre-wrap select-all">
                          Error: {log.error}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top text-center">
                      <button
                        onClick={() => handleDeleteItem(log.date, log.id)}
                        className="rounded p-1 text-body hover:bg-red-50 hover:text-semantic-down transition-colors"
                        title="Delete log item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, open }))}
        title={confirmDialog.title}
        description={confirmDialog.description}
        variant={confirmDialog.variant}
        confirmLabel="Confirm"
        onConfirm={confirmDialog.onConfirm}
      />
    </div>
  );
}
