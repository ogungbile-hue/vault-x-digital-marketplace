'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FileSpreadsheet,
  ShieldCheck,
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Eye,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export default function AdminLedgerPage() {
  const [selectedWebhookPayload, setSelectedWebhookPayload] = useState<string | null>(null);

  // Fetch Ledger Transactions
  const { data: ledgerData, refetch: refetchLedger, isFetching: isFetchingLedger } = useQuery({
    queryKey: ['admin-ledger'],
    queryFn: async () => {
      const res = await fetch('/api/admin/ledger');
      return res.json();
    },
    refetchInterval: 10000,
  });

  // Fetch Webhook Events
  const { data: webhooksData, refetch: refetchWebhooks } = useQuery({
    queryKey: ['admin-webhooks'],
    queryFn: async () => {
      const res = await fetch('/api/admin/webhooks');
      return res.json();
    },
    refetchInterval: 10000,
  });

  const audit = ledgerData?.audit;
  const transactions = ledgerData?.transactions || [];
  const webhooks = webhooksData?.webhooks || [];

  const isBalanced = audit?.isBalanced ?? true;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2.5">
            <FileSpreadsheet className="w-7 h-7 text-emerald-400" />
            Financial Ledger & Webhook Audit
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Zero-trust double-entry journal transactions and idempotent gateway delivery logs.
          </p>
        </div>

        <button
          onClick={() => {
            refetchLedger();
            refetchWebhooks();
          }}
          disabled={isFetchingLedger}
          className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-xs font-semibold text-slate-300 flex items-center gap-2 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetchingLedger ? 'animate-spin text-emerald-400' : ''}`} />
          Refresh Audit Trail
        </button>
      </div>

      {/* Global Invariant Status Card */}
      <div className="glass-panel rounded-2xl border border-white/10 p-5 bg-gradient-to-r from-slate-900/90 to-slate-950/90 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-md shadow-emerald-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                Double-Entry Invariant Status
              </span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-white">
                  {isBalanced ? 'System Ledger Invariant Maintained' : 'Ledger Invariant Discrepancy!'}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    isBalanced
                      ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-300'
                      : 'bg-rose-950/80 border border-rose-500/40 text-rose-300'
                  }`}
                >
                  {isBalanced ? 'SUM(Debits) === SUM(Credits)' : 'CRITICAL ERROR'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs bg-slate-950/80 px-4 py-2.5 rounded-xl border border-white/5 font-mono">
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase">Total Debits</span>
              <span className="font-bold text-emerald-400">
                {audit?.totalDebits ? formatCurrency(BigInt(audit.totalDebits)) : '$0.00'}
              </span>
            </div>
            <div className="h-6 w-px bg-white/10" />
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase">Total Credits</span>
              <span className="font-bold text-emerald-400">
                {audit?.totalCredits ? formatCurrency(BigInt(audit.totalCredits)) : '$0.00'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Double-Entry Transactions Table */}
      <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden shadow-xl">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <span className="font-bold text-sm text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            Ledger Journal Transactions ({transactions.length})
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/90 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-white/10">
              <tr>
                <th className="px-6 py-4">Transaction ID & Ref</th>
                <th className="px-6 py-4">Event Type & Description</th>
                <th className="px-6 py-4">Journal Entries (Debits & Credits)</th>
                <th className="px-6 py-4 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {transactions.map((tx: any) => (
                <tr key={tx.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-mono font-bold text-white block">#{tx.id.slice(0, 8)}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">Ref: {tx.referenceId}</span>
                  </td>

                  <td className="px-6 py-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-950/60 border border-purple-800/40 text-purple-300 inline-block mb-1">
                      {tx.type}
                    </span>
                    <span className="text-foreground block text-xs font-medium">{tx.description}</span>
                  </td>

                  <td className="px-6 py-4">
                    <div className="space-y-1 font-mono text-[11px]">
                      {tx.entries.map((entry: any) => (
                        <div key={entry.id} className="flex items-center gap-2">
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                              entry.direction === 'DEBIT'
                                ? 'bg-amber-950/60 text-amber-300 border border-amber-800/40'
                                : 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/40'
                            }`}
                          >
                            {entry.direction}
                          </span>
                          <span className="text-slate-300">{entry.accountId}:</span>
                          <span className="font-bold text-white">
                            {formatCurrency(BigInt(entry.amount), entry.currency)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </td>

                  <td className="px-6 py-4 text-right text-muted-foreground text-[11px] whitespace-nowrap">
                    {new Date(tx.createdAt).toLocaleDateString()} {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Webhook Events Audit Table */}
      <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden shadow-xl">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <span className="font-bold text-sm text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-400" />
            Gateway Webhook Ingestion Logs ({webhooks.length})
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/90 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-white/10">
              <tr>
                <th className="px-6 py-4">Provider</th>
                <th className="px-6 py-4">External Event ID</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Received At</th>
                <th className="px-6 py-4 text-right">Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {webhooks.map((hook: any) => (
                <tr key={hook.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 font-bold text-white">{hook.provider}</td>
                  <td className="px-6 py-4 font-mono text-muted-foreground">{hook.externalEventId}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                        hook.status === 'PROCESSED'
                          ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300'
                          : hook.status === 'DUPLICATE'
                          ? 'bg-amber-950/60 border border-amber-500/40 text-amber-300'
                          : 'bg-rose-950/60 border border-rose-500/40 text-rose-300'
                      }`}
                    >
                      {hook.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground text-[11px]">
                    {new Date(hook.createdAt).toLocaleDateString()} {new Date(hook.createdAt).toLocaleTimeString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => setSelectedWebhookPayload(hook.payloadJson)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1 inline-flex transition"
                    >
                      <Eye className="w-3 h-3" />
                      View JSON
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* JSON Payload Modal */}
      {selectedWebhookPayload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-lg rounded-2xl border border-white/15 p-6 relative shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm text-white">Raw Webhook Payload</h3>
              <button
                onClick={() => setSelectedWebhookPayload(null)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Close
              </button>
            </div>
            <pre className="bg-slate-950 p-4 rounded-xl border border-white/5 font-mono text-xs text-emerald-300 max-h-80 overflow-y-auto overflow-x-auto whitespace-pre-wrap">
              {(() => {
                try {
                  return JSON.stringify(JSON.parse(selectedWebhookPayload), null, 2);
                } catch {
                  return selectedWebhookPayload;
                }
              })()}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
