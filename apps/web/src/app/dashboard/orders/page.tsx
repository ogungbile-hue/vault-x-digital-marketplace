'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  History,
  KeyRound,
  ShieldCheck,
  Calendar,
  Layers,
  ArrowUpRight,
  Loader2,
  PackageOpen,
} from 'lucide-react';
import { useMarketplaceStore } from '@/store/marketplace-store';
import { formatCurrency } from '@/lib/utils';

export default function OrdersHistoryPage() {
  const { user, openRevealModal } = useMarketplaceStore();
  const [revealingOrderId, setRevealingOrderId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['orders', user.userId],
    queryFn: async () => {
      const res = await fetch(`/api/orders?userId=${user.userId}`);
      return res.json();
    },
  });

  const orders = data?.orders || [];

  const handleReveal = async (orderId: string) => {
    try {
      setRevealingOrderId(orderId);
      const res = await fetch(`/api/orders/${orderId}/reveal?userId=${user.userId}`);
      const json = await res.json();
      if (json.success) {
        openRevealModal(orderId, json.items);
      } else {
        alert(json.error || 'Failed to reveal credentials');
      }
    } catch (e: any) {
      alert(e.message || 'Error occurred while decrypting credentials');
    } finally {
      setRevealingOrderId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2.5">
            <History className="w-7 h-7 text-purple-400" />
            Purchase History & Vault
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Access, export, and decrypt previously purchased digital credentials on-demand.
          </p>
        </div>
      </div>

      {/* Orders Table */}
      {isLoading ? (
        <div className="glass-panel rounded-2xl p-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
        </div>
      ) : orders.length > 0 ? (
        <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/90 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-white/10">
                <tr>
                  <th className="px-6 py-4">Order ID & Date</th>
                  <th className="px-6 py-4">Purchased Items</th>
                  <th className="px-6 py-4">Total Amount</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Fulfillment Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {orders.map((order: any) => (
                  <tr key={order.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-mono font-bold text-white">#{order.id.slice(0, 8)}</span>
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3" />
                          {new Date(order.createdAt).toLocaleDateString()} {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        {order.items.map((item: any) => (
                          <span key={item.id} className="text-foreground font-medium flex items-center gap-1.5">
                            <KeyRound className="w-3.5 h-3.5 text-purple-400" />
                            {item.productTitle}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className="font-mono font-bold text-white text-sm">
                        {formatCurrency(BigInt(order.totalAmount), order.currency)}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/60 border border-emerald-500/40 text-emerald-300">
                        <ShieldCheck className="w-3 h-3" />
                        {order.status}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleReveal(order.id)}
                        disabled={revealingOrderId === order.id}
                        className="px-3.5 py-1.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-200 text-xs font-semibold inline-flex items-center gap-1.5 transition active:scale-95 shadow-sm"
                      >
                        {revealingOrderId === order.id ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin text-purple-300" />
                            Decrypting...
                          </>
                        ) : (
                          <>
                            <KeyRound className="w-3.5 h-3.5 text-purple-400" />
                            Reveal Credentials
                            <ArrowUpRight className="w-3 h-3 opacity-60" />
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="glass-panel rounded-3xl p-12 text-center border border-white/10 flex flex-col items-center justify-center max-w-md mx-auto my-8">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-muted-foreground mb-3">
            <PackageOpen className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-lg text-white mb-1">No Orders Yet</h3>
          <p className="text-xs text-muted-foreground mb-4">
            You have not placed any orders yet. Browse the catalog to purchase digital stock.
          </p>
        </div>
      )}
    </div>
  );
}
