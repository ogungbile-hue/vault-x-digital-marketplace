'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  UploadCloud,
  Package,
  FileSpreadsheet,
  ShieldCheck,
  ArrowLeft,
  Lock,
  KeyRound,
  AlertCircle,
} from 'lucide-react';
import { useMarketplaceStore } from '@/store/marketplace-store';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, setUserRole } = useMarketplaceStore();
  const [passkey, setPasskey] = useState('');
  const [error, setError] = useState(false);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (passkey.trim() === 'admin' || passkey.trim() === 'admin2026' || passkey.trim() === 'vaultx') {
      setUserRole('ADMIN');
      setError(false);
    } else {
      setError(true);
    }
  };

  // If user is not yet unlocked as admin, show isolated Operator Gate
  if (user.role !== 'ADMIN') {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="glass-panel w-full max-w-md rounded-3xl p-8 border border-white/10 shadow-2xl relative overflow-hidden">
          <div className="w-12 h-12 rounded-2xl bg-indigo-950/80 border border-indigo-500/40 flex items-center justify-center text-indigo-400 mx-auto mb-4">
            <Lock className="w-6 h-6" />
          </div>

          <div className="text-center mb-6">
            <h2 className="text-xl font-black text-white">Operator Access Gate</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Enter your master operator passkey to access the back-office command center.
            </p>
          </div>

          <form onSubmit={handleUnlock} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
                Operator Passkey
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={passkey}
                  onChange={(e) => setPasskey(e.target.value)}
                  placeholder="Enter operator passkey (e.g. admin)..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-xs text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500"
                  autoFocus
                />
              </div>
            </div>

            {error && (
              <div className="p-2.5 rounded-xl bg-rose-950/50 border border-rose-800/40 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Invalid operator passkey</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 transition active:scale-98"
            >
              Authenticate as Operator
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-white/10 text-center">
            <Link
              href="/"
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 font-medium transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Return to Storefront
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const navItems = [
    { label: 'Overview', href: '/admin', icon: LayoutDashboard },
    { label: 'Bulk Ingestion', href: '/admin/inventory/upload', icon: UploadCloud },
    { label: 'Catalog & SKUs', href: '/admin/products', icon: Package },
    { label: 'Ledger & Webhooks', href: '/admin/ledger', icon: FileSpreadsheet },
  ];

  return (
    <div className="space-y-6">
      {/* Dedicated Admin Portal Header & Subnav */}
      <div className="glass-panel rounded-2xl border border-white/10 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left: Brand / Return Link */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-white/10 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 shadow-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Storefront
          </Link>

          <div className="h-5 w-px bg-white/10 hidden sm:block" />

          <div className="px-2.5 py-1 rounded-lg bg-indigo-950/80 border border-indigo-500/40 text-indigo-300 text-xs font-bold flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            Operator Portal
          </div>
        </div>

        {/* Right: Section Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition whitespace-nowrap ${
                  isActive
                    ? 'bg-purple-600 text-white font-semibold shadow-md shadow-purple-600/25'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div>{children}</div>
    </div>
  );
}
