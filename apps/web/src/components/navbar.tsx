'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  Wallet,
  PlusCircle,
  ShoppingBag,
  History,
  Sun,
  Moon,
  Zap,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useMarketplaceStore } from '@/store/marketplace-store';
import { formatCurrency } from '@/lib/utils';

export function Navbar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { user, setTopupModalOpen } = useMarketplaceStore();

  const { data: walletData } = useQuery({
    queryKey: ['wallet', user.userId],
    queryFn: async () => {
      const res = await fetch(`/api/wallet?userId=${user.userId}`);
      return res.json();
    },
    refetchInterval: 6000,
  });

  const balance = walletData?.wallet?.balance ? BigInt(walletData.wallet.balance) : 0n;

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-purple-500/25 group-hover:scale-105 transition-transform">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg leading-none tracking-tight bg-gradient-to-r from-white via-purple-200 to-indigo-300 bg-clip-text text-transparent">
                VAULT-X
              </span>
              <span className="text-[10px] font-medium text-purple-400/80 tracking-widest uppercase">
                Encrypted Stock Engine
              </span>
            </div>
          </Link>

          {/* Clean Buyer-Only Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            <Link
              href="/"
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                pathname === '/'
                  ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              Storefront
            </Link>
            <Link
              href="/dashboard/orders"
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                pathname.startsWith('/dashboard')
                  ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
              }`}
            >
              <History className="w-4 h-4" />
              My Orders
            </Link>
          </nav>
        </div>

        {/* Right Actions: Live Wallet & Theme Toggle */}
        <div className="flex items-center gap-3">
          {/* Live Wallet Balance */}
          <div className="flex items-center gap-2 bg-slate-900/80 border border-purple-500/20 rounded-xl p-1 pl-3 shadow-inner">
            <div className="flex items-center gap-1.5">
              <Wallet className="w-4 h-4 text-purple-400" />
              <div className="flex flex-col text-right">
                <span className="text-[10px] uppercase font-semibold text-muted-foreground leading-none">
                  Balance
                </span>
                <span className="text-sm font-bold text-white font-mono">
                  {formatCurrency(balance)}
                </span>
              </div>
            </div>
            <button
              onClick={() => setTopupModalOpen(true)}
              className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-1 transition shadow-md shadow-purple-600/30 active:scale-95"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Top Up
            </button>
          </div>

          {/* Theme Toggle */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-xl border border-white/10 hover:bg-white/5 text-muted-foreground hover:text-foreground transition"
            aria-label="Toggle Theme"
          >
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
}
