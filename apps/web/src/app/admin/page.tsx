'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  UploadCloud,
  Package,
  FileSpreadsheet,
  ShieldCheck,
  Zap,
  TrendingUp,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export default function AdminOverviewPage() {
  const { data: productsData } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await fetch('/api/products');
      return res.json();
    },
  });

  const { data: ledgerData } = useQuery({
    queryKey: ['admin-ledger'],
    queryFn: async () => {
      const res = await fetch('/api/admin/ledger');
      return res.json();
    },
  });

  const products = productsData?.products || [];
  const totalStockAvailable = products.reduce((acc: number, p: any) => acc + (p.availableStock || 0), 0);
  const totalStockSold = products.reduce((acc: number, p: any) => acc + (p.soldStock || 0), 0);
  const isLedgerBalanced = ledgerData?.audit?.isBalanced ?? true;
  const totalLedgerDebits = ledgerData?.audit?.totalDebits ? BigInt(ledgerData.audit.totalDebits) : 0n;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-white">Back-Office Command Center</h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Real-time stock reserves, cryptographic audit status, and double-entry ledger totals.
        </p>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card rounded-2xl p-5 border border-white/10">
          <div className="flex items-center justify-between text-muted-foreground text-xs mb-2">
            <span>Available Stock</span>
            <Package className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">{totalStockAvailable}</div>
          <span className="text-[11px] text-emerald-400 font-medium">Ready for instant checkout</span>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-white/10">
          <div className="flex items-center justify-between text-muted-foreground text-xs mb-2">
            <span>Sold Inventory</span>
            <Zap className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">{totalStockSold}</div>
          <span className="text-[11px] text-purple-400 font-medium">Fulfilled & decrypted</span>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-white/10">
          <div className="flex items-center justify-between text-muted-foreground text-xs mb-2">
            <span>Active SKUs</span>
            <Layers className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">{products.length}</div>
          <span className="text-[11px] text-indigo-400 font-medium">Catalog items</span>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-white/10">
          <div className="flex items-center justify-between text-muted-foreground text-xs mb-2">
            <span>Ledger Invariant</span>
            <ShieldCheck className={`w-4 h-4 ${isLedgerBalanced ? 'text-emerald-400' : 'text-rose-400'}`} />
          </div>
          <div className="text-lg font-bold text-white flex items-center gap-1.5 font-mono">
            {isLedgerBalanced ? (
              <span className="text-emerald-400">100% Balanced</span>
            ) : (
              <span className="text-rose-400">Unbalanced</span>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground font-mono">
            Total Flow: {formatCurrency(totalLedgerDebits)}
          </span>
        </div>
      </div>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          href="/admin/inventory/upload"
          className="glass-card rounded-2xl p-6 border border-white/10 hover:border-purple-500/40 group flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-purple-950/80 border border-purple-500/40 flex items-center justify-center text-purple-400 mb-4 group-hover:scale-105 transition-transform">
              <UploadCloud className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-white group-hover:text-purple-300 transition-colors mb-1">
              Bulk Stock Ingestion
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Upload multi-line account credentials with live delimiter validation and AES-256-GCM batch encryption.
            </p>
          </div>
          <div className="flex items-center gap-1 text-xs font-semibold text-purple-400 mt-6 group-hover:translate-x-1 transition-transform">
            <span>Open Bulk Upload</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        <Link
          href="/admin/products"
          className="glass-card rounded-2xl p-6 border border-white/10 hover:border-indigo-500/40 group flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-indigo-950/80 border border-indigo-500/40 flex items-center justify-center text-indigo-400 mb-4 group-hover:scale-105 transition-transform">
              <Package className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-white group-hover:text-indigo-300 transition-colors mb-1">
              Product & Category Catalog
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Create product SKUs, adjust unit prices, configure metadata badges, and monitor real-time stock levels.
            </p>
          </div>
          <div className="flex items-center gap-1 text-xs font-semibold text-indigo-400 mt-6 group-hover:translate-x-1 transition-transform">
            <span>Manage Catalog</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        <Link
          href="/admin/ledger"
          className="glass-card rounded-2xl p-6 border border-white/10 hover:border-emerald-500/40 group flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-4 group-hover:scale-105 transition-transform">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-white group-hover:text-emerald-300 transition-colors mb-1">
              Ledger & Webhook Inspector
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Audit immutable double-entry journal transactions, verify financial balances, and inspect gateway webhook payloads.
            </p>
          </div>
          <div className="flex items-center gap-1 text-xs font-semibold text-emerald-400 mt-6 group-hover:translate-x-1 transition-transform">
            <span>Inspect Ledger</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Link>
      </div>
    </div>
  );
}
