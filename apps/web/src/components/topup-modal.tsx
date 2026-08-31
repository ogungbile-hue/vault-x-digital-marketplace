'use client';

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Wallet, CreditCard, Coins, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { useMarketplaceStore } from '@/store/marketplace-store';
import { formatCurrency } from '@/lib/utils';

export function TopupModal() {
  const queryClient = useQueryClient();
  const { isTopupModalOpen, setTopupModalOpen, user } = useMarketplaceStore();

  const [selectedAmountMinor, setSelectedAmountMinor] = useState<bigint>(5000n); // $50 default
  const [selectedProvider, setSelectedProvider] = useState<'PAYSTACK' | 'CRYPTO'>('PAYSTACK');
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const presetAmounts = [
    { label: '$10', minor: 1000n },
    { label: '$25', minor: 2500n },
    { label: '$50', minor: 5000n },
    { label: '$100', minor: 10000n },
    { label: '$250', minor: 25000n },
  ];

  const topupMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/wallet/topup-simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.userId,
          amount: Number(selectedAmountMinor),
        }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Top-up failed');
      }
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      setSuccessNotice(`Successfully credited ${formatCurrency(selectedAmountMinor)} to your wallet! (Ref: ${data.referenceId})`);
      setTimeout(() => {
        setSuccessNotice(null);
        setTopupModalOpen(false);
      }, 2000);
    },
  });

  if (!isTopupModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-md rounded-2xl border border-white/15 p-6 relative shadow-2xl overflow-hidden">
        {/* Close Button */}
        <button
          onClick={() => setTopupModalOpen(false)}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/10 transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className="font-bold text-lg text-white">Top Up Internal Wallet</h2>
            <p className="text-xs text-muted-foreground">Automated Double-Entry Ledger Credit</p>
          </div>
        </div>

        {/* Amount Preset Buttons */}
        <div className="mb-4">
          <label className="text-xs font-semibold text-muted-foreground mb-2 block">
            Select Deposit Amount
          </label>
          <div className="grid grid-cols-5 gap-2">
            {presetAmounts.map((preset) => (
              <button
                key={preset.label}
                onClick={() => setSelectedAmountMinor(preset.minor)}
                className={`py-2.5 rounded-xl font-mono text-xs font-bold transition border ${
                  selectedAmountMinor === preset.minor
                    ? 'bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-600/30'
                    : 'bg-slate-900/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Payment Gateway Provider Selector */}
        <div className="mb-6">
          <label className="text-xs font-semibold text-muted-foreground mb-2 block">
            Select Payment Method
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setSelectedProvider('PAYSTACK')}
              className={`p-3 rounded-xl border flex flex-col items-start gap-1 transition ${
                selectedProvider === 'PAYSTACK'
                  ? 'bg-purple-950/60 border-purple-500/60 text-white shadow-md'
                  : 'bg-slate-900/60 border-slate-800 text-muted-foreground hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-bold">Paystack / Cards</span>
              </div>
              <span className="text-[10px] text-muted-foreground">Instant Debit/Naira/USD</span>
            </button>

            <button
              onClick={() => setSelectedProvider('CRYPTO')}
              className={`p-3 rounded-xl border flex flex-col items-start gap-1 transition ${
                selectedProvider === 'CRYPTO'
                  ? 'bg-purple-950/60 border-purple-500/60 text-white shadow-md'
                  : 'bg-slate-900/60 border-slate-800 text-muted-foreground hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold">Crypto / USDT</span>
              </div>
              <span className="text-[10px] text-muted-foreground">TRC-20, ERC-20, BTC</span>
            </button>
          </div>
        </div>

        {/* Success Feedback */}
        {successNotice && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successNotice}</span>
          </div>
        )}

        {/* Action Button: Instant Deposit Simulation */}
        <button
          onClick={() => topupMutation.mutate()}
          disabled={topupMutation.isPending}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 active:scale-98 transition"
        >
          {topupMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing Ledger Transaction...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-purple-200" />
              Instant Top Up {formatCurrency(selectedAmountMinor)}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
