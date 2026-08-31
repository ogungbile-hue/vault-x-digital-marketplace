'use client';

import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Zap, Wallet, AlertTriangle, ShieldCheck, Loader2, PlusCircle } from 'lucide-react';
import { useMarketplaceStore } from '@/store/marketplace-store';
import { formatCurrency } from '@/lib/utils';

export function CheckoutModal() {
  const queryClient = useQueryClient();
  const {
    checkoutModal,
    closeCheckoutModal,
    openRevealModal,
    setTopupModalOpen,
    user,
  } = useMarketplaceStore();

  const [quantity, setQuantity] = useState(1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: walletData } = useQuery({
    queryKey: ['wallet', user.userId],
    queryFn: async () => {
      const res = await fetch(`/api/wallet?userId=${user.userId}`);
      return res.json();
    },
  });

  const walletBalance = walletData?.wallet?.balance ? BigInt(walletData.wallet.balance) : 0n;
  const totalPrice = checkoutModal.price * BigInt(quantity);
  const hasSufficientBalance = walletBalance >= totalPrice;

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.userId,
          items: [
            {
              productId: checkoutModal.productId,
              quantity,
            },
          ],
        }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Checkout failed');
      }
      return data;
    },
    onSuccess: (data) => {
      // Invalidate wallet and products cache
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      closeCheckoutModal();
      openRevealModal(data.order.orderId, data.order.items);
    },
    onError: (err: any) => {
      setErrorMessage(err.message || 'An error occurred during checkout');
    },
  });

  if (!checkoutModal.isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-md rounded-2xl border border-white/15 p-6 relative shadow-2xl overflow-hidden">
        {/* Close Button */}
        <button
          onClick={closeCheckoutModal}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/10 transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center">
            <Zap className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <h2 className="font-bold text-lg text-white">Instant Fulfillment</h2>
            <p className="text-xs text-muted-foreground">Pessimistic row-locking checkout</p>
          </div>
        </div>

        {/* Product Summary */}
        <div className="bg-slate-900/60 border border-white/5 rounded-xl p-4 mb-4">
          <span className="text-[10px] text-purple-400 uppercase font-semibold">Purchasing SKU</span>
          <h4 className="font-bold text-base text-white line-clamp-1">{checkoutModal.productTitle}</h4>
          <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
            <span>Unit Price:</span>
            <span className="font-mono text-white font-semibold">{formatCurrency(checkoutModal.price)}</span>
          </div>

          {/* Quantity Selector */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
            <span className="text-xs text-muted-foreground">Quantity:</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 text-white font-bold flex items-center justify-center hover:bg-slate-700 active:scale-95"
              >
                -
              </button>
              <span className="w-8 text-center font-mono font-bold text-white text-sm">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => Math.min(checkoutModal.availableStock, q + 1))}
                className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 text-white font-bold flex items-center justify-center hover:bg-slate-700 active:scale-95"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Financial Calculation */}
        <div className="space-y-2 mb-4 bg-slate-950/60 border border-white/5 rounded-xl p-3.5 text-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Total Payable:</span>
            <span className="font-mono font-bold text-white text-sm">{formatCurrency(totalPrice)}</span>
          </div>
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Current Wallet Balance:</span>
            <span className="font-mono font-bold text-purple-300">{formatCurrency(walletBalance)}</span>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-white/5 font-semibold">
            <span>Post-Purchase Balance:</span>
            <span
              className={`font-mono ${
                hasSufficientBalance ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {hasSufficientBalance
                ? formatCurrency(walletBalance - totalPrice)
                : `Insufficient funds (${formatCurrency(totalPrice - walletBalance)} needed)`}
            </span>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/50 border border-rose-800/50 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Action Button */}
        {hasSufficientBalance ? (
          <button
            onClick={() => checkoutMutation.mutate()}
            disabled={checkoutMutation.isPending}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 active:scale-98 transition"
          >
            {checkoutMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Locking Inventory & Fulfilling...
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                Confirm & Instant Reveal ({formatCurrency(totalPrice)})
              </>
            )}
          </button>
        ) : (
          <button
            onClick={() => {
              closeCheckoutModal();
              setTopupModalOpen(true);
            }}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-600/30 active:scale-98 transition"
          >
            <PlusCircle className="w-4 h-4" />
            Top Up Wallet to Purchase
          </button>
        )}
      </div>
    </div>
  );
}
