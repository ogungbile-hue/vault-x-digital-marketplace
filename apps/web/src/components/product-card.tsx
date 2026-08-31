'use client';

import React from 'react';
import { Zap, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';
import { useMarketplaceStore } from '@/store/marketplace-store';
import { formatCurrency } from '@/lib/utils';

interface ProductCardProps {
  product: {
    id: string;
    title: string;
    description?: string | null;
    price: string | bigint;
    currency: string;
    availableStock: number;
    category?: {
      name: string;
      badges: string[];
    } | null;
  };
}

export function ProductCard({ product }: ProductCardProps) {
  const { openCheckoutModal } = useMarketplaceStore();
  const priceMinor = BigInt(product.price);
  const isOutOfStock = product.availableStock <= 0;

  return (
    <div className="glass-card rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden group">
      {/* Background Accent Glow */}
      <div className="absolute -top-12 -right-12 w-28 h-28 bg-purple-600/10 rounded-full blur-2xl group-hover:bg-purple-600/20 transition-all pointer-events-none" />

      <div>
        {/* Category & Status Bar */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-[11px] font-semibold tracking-wider text-purple-400 uppercase bg-purple-950/50 border border-purple-800/40 px-2.5 py-0.5 rounded-md">
            {product.category?.name || 'Digital Goods'}
          </span>

          {isOutOfStock ? (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-rose-400 bg-rose-950/40 border border-rose-800/30 px-2 py-0.5 rounded-md">
              <AlertCircle className="w-3 h-3" />
              Sold Out
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-800/30 px-2 py-0.5 rounded-md">
              <CheckCircle2 className="w-3 h-3" />
              {product.availableStock} In Stock
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="font-bold text-lg text-foreground group-hover:text-purple-300 transition-colors line-clamp-1 mb-1.5">
          {product.title}
        </h3>

        {/* Description */}
        <p className="text-xs text-muted-foreground line-clamp-2 mb-4 leading-relaxed">
          {product.description || 'Instant automated fulfillment. Zero-wait delivery directly to your account vault.'}
        </p>

        {/* Badges */}
        {product.category?.badges && product.category.badges.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {product.category.badges.map((badge, idx) => (
              <span
                key={idx}
                className="text-[10px] font-medium text-slate-300 bg-slate-800/80 border border-slate-700 px-2 py-0.5 rounded"
              >
                {badge}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Footer: Price & Instant Buy Button */}
      <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-3 mt-2">
        <div className="flex flex-col">
          <span className="text-[10px] text-muted-foreground font-semibold uppercase">Instant Price</span>
          <span className="text-xl font-extrabold text-white font-mono">
            {formatCurrency(priceMinor, product.currency)}
          </span>
        </div>

        <button
          onClick={() =>
            openCheckoutModal({
              id: product.id,
              title: product.title,
              price: priceMinor,
              availableStock: product.availableStock,
            })
          }
          disabled={isOutOfStock}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-lg active:scale-95 ${
            isOutOfStock
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-600/30'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          1-Click Buy
        </button>
      </div>
    </div>
  );
}
