'use client';

import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  Zap,
  ShieldCheck,
  Lock,
  Layers,
  Sparkles,
  RefreshCw,
  X,
  PackageOpen,
} from 'lucide-react';
import { useMarketplaceStore } from '@/store/marketplace-store';
import { ProductCard } from '@/components/product-card';

export default function StorefrontPage() {
  const {
    searchQuery,
    setSearchQuery,
    selectedCategoryId,
    setSelectedCategoryId,
    selectedBadge,
    setSelectedBadge,
  } = useMarketplaceStore();

  // Fetch Categories
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await fetch('/api/categories');
      return res.json();
    },
  });

  // Fetch Products with real-time stock
  const { data: productsData, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['products', selectedCategoryId],
    queryFn: async () => {
      const url = selectedCategoryId
        ? `/api/products?categoryId=${selectedCategoryId}`
        : '/api/products';
      const res = await fetch(url);
      return res.json();
    },
    refetchInterval: 10000,
  });

  const categories = categoriesData?.categories || [];
  const products = productsData?.products || [];

  // Client-side search and badge filtering
  const filteredProducts = useMemo(() => {
    return products.filter((prod: any) => {
      // Search filter
      const matchesSearch =
        searchQuery === '' ||
        prod.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prod.description?.toLowerCase().includes(searchQuery.toLowerCase());

      // Badge filter
      const matchesBadge =
        !selectedBadge ||
        (prod.category?.badges && prod.category.badges.includes(selectedBadge));

      return matchesSearch && matchesBadge;
    });
  }, [products, searchQuery, selectedBadge]);

  // Extract all unique badges from loaded categories
  const availableBadges = useMemo(() => {
    const badgesSet = new Set<string>();
    for (const cat of categories) {
      if (cat.badges) {
        for (const b of cat.badges) badgesSet.add(b);
      }
    }
    return Array.from(badgesSet);
  }, [categories]);

  return (
    <div className="space-y-8">
      {/* Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden glass-panel border border-purple-500/20 p-8 sm:p-12 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-purple-600/20 to-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-2xl relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950/80 border border-purple-500/40 text-purple-300 text-xs font-semibold mb-4">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            Zero-Wait Instant Stock Delivery
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight mb-4">
            Instant Digital Goods Vault.
          </h1>

          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-6">
            Pessimistic row-locking allocation with zero double-spend. Pre-funded internal wallet transactions and AES-256-GCM hardware-grade encryption at rest.
          </p>

          {/* Quick Value Props */}
          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/10 text-xs">
            <div className="flex items-center gap-2 text-slate-300 font-medium">
              <Zap className="w-4 h-4 text-purple-400 shrink-0" />
              <span>&lt; 50ms Fulfillment</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300 font-medium">
              <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>AES-256-GCM Vault</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300 font-medium">
              <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>Double-Entry Ledger</span>
            </div>
          </div>
        </div>
      </div>

      {/* Catalog Search & Category Filters Bar */}
      <div className="space-y-4">
        {/* Search & Refresh */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search licenses, credentials, streaming accounts, VPNs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="px-4 py-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-white/10 text-slate-300 text-xs font-semibold flex items-center justify-center gap-2 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-purple-400' : ''}`} />
            Live Sync
          </button>
        </div>

        {/* Category Selector Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setSelectedCategoryId(null)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition border ${
              selectedCategoryId === null
                ? 'bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-600/30'
                : 'bg-slate-900/60 border-white/5 text-muted-foreground hover:text-foreground hover:bg-slate-800'
            }`}
          >
            All Products ({products.length})
          </button>
          {categories.map((cat: any) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategoryId(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition border ${
                selectedCategoryId === cat.id
                  ? 'bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-600/30'
                  : 'bg-slate-900/60 border-white/5 text-muted-foreground hover:text-foreground hover:bg-slate-800'
              }`}
            >
              {cat.name} ({cat._count?.products || 0})
            </button>
          ))}
        </div>

        {/* Dynamic Badge Filter Chips */}
        {availableBadges.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap text-xs">
            <span className="text-muted-foreground text-[11px] font-medium mr-1">Filter Badges:</span>
            {availableBadges.map((badge) => (
              <button
                key={badge}
                onClick={() => setSelectedBadge(selectedBadge === badge ? null : badge)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition border ${
                  selectedBadge === badge
                    ? 'bg-indigo-600/40 border-indigo-400 text-indigo-200'
                    : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {badge}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Product Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="glass-card rounded-2xl p-5 h-56 animate-pulse bg-slate-900/40" />
          ))}
        </div>
      ) : filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product: any) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="glass-panel rounded-3xl p-12 text-center border border-white/10 flex flex-col items-center justify-center max-w-md mx-auto my-8">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-muted-foreground mb-3">
            <PackageOpen className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-lg text-white mb-1">No Products Found</h3>
          <p className="text-xs text-muted-foreground mb-4">
            Try adjusting your search query or switching category filters.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategoryId(null);
              setSelectedBadge(null);
            }}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition"
          >
            Clear All Filters
          </button>
        </div>
      )}
    </div>
  );
}
