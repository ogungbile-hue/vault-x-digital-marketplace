'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Package,
  Plus,
  Tag,
  CheckCircle2,
  AlertCircle,
  Layers,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export default function AdminProductsPage() {
  const queryClient = useQueryClient();

  // New Category State
  const [catName, setCatName] = useState('');
  const [catBadges, setCatBadges] = useState('Instant Delivery, Warranty 30D');

  // New Product State
  const [prodTitle, setProdTitle] = useState('');
  const [prodCategoryId, setProdCategoryId] = useState('');
  const [prodPriceUsd, setProdPriceUsd] = useState('14.99');
  const [prodDesc, setProdDesc] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  // Fetch Categories
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await fetch('/api/categories');
      return res.json();
    },
  });

  // Fetch Products
  const { data: productsData, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await fetch('/api/products');
      return res.json();
    },
  });

  const categories = categoriesData?.categories || [];
  const products = productsData?.products || [];

  // Create Category Mutation
  const createCategoryMutation = useMutation({
    mutationFn: async () => {
      const badgesArray = catBadges.split(',').map((b) => b.trim()).filter(Boolean);
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: catName,
          badges: badgesArray,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to create category');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setCatName('');
      setNotice('Category created successfully!');
      setTimeout(() => setNotice(null), 2500);
    },
  });

  // Create Product Mutation
  const createProductMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: prodTitle,
          categoryId: prodCategoryId || undefined,
          price: prodPriceUsd,
          description: prodDesc,
          status: 'ACTIVE',
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to create product');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setProdTitle('');
      setProdDesc('');
      setProdPriceUsd('14.99');
      setNotice('Product SKU created successfully!');
      setTimeout(() => setNotice(null), 2500);
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2.5">
          <Package className="w-7 h-7 text-indigo-400" />
          Catalog & SKU Management
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Configure digital categories, create product SKUs, adjust pricing, and track live inventory distribution.
        </p>
      </div>

      {notice && (
        <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Creation Forms */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Creator */}
        <div className="glass-panel rounded-2xl border border-white/10 p-5 space-y-4">
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <Tag className="w-4 h-4 text-purple-400" />
            Add New Category
          </h3>

          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Category Name *</label>
            <input
              type="text"
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              placeholder="e.g. Social Accounts, Developer Tools, VPNs"
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Metadata Badges (Comma-separated)</label>
            <input
              type="text"
              value={catBadges}
              onChange={(e) => setCatBadges(e.target.value)}
              placeholder="e.g. USA, 2FA Enabled, Aged 2018, Instant"
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <button
            onClick={() => createCategoryMutation.mutate()}
            disabled={!catName.trim() || createCategoryMutation.isPending}
            className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-semibold text-xs transition flex items-center justify-center gap-1.5 shadow-md"
          >
            {createCategoryMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Create Category
          </button>
        </div>

        {/* Product SKU Creator */}
        <div className="glass-panel rounded-2xl border border-white/10 p-5 space-y-3">
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <Package className="w-4 h-4 text-indigo-400" />
            Add Product SKU
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Title *</label>
              <input
                type="text"
                value={prodTitle}
                onChange={(e) => setProdTitle(e.target.value)}
                placeholder="e.g. Windows 11 Pro Key"
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Price (USD) *</label>
              <input
                type="number"
                step="0.01"
                value={prodPriceUsd}
                onChange={(e) => setProdPriceUsd(e.target.value)}
                placeholder="14.99"
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Assign Category</label>
            <select
              value={prodCategoryId}
              onChange={(e) => setProdCategoryId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">-- No Category --</option>
              {categories.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Description</label>
            <input
              type="text"
              value={prodDesc}
              onChange={(e) => setProdDesc(e.target.value)}
              placeholder="Instant delivery license key..."
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <button
            onClick={() => createProductMutation.mutate()}
            disabled={!prodTitle.trim() || createProductMutation.isPending}
            className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-semibold text-xs transition flex items-center justify-center gap-1.5 shadow-md"
          >
            {createProductMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Save Product SKU
          </button>
        </div>
      </div>

      {/* Catalog & Inventory Table */}
      <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden shadow-xl">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <span className="font-bold text-sm text-white">Live Product Catalog ({products.length} SKUs)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/90 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-white/10">
              <tr>
                <th className="px-6 py-4">Product Title</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Unit Price</th>
                <th className="px-6 py-4">Available</th>
                <th className="px-6 py-4">Reserved</th>
                <th className="px-6 py-4">Sold</th>
                <th className="px-6 py-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {products.map((prod: any) => (
                <tr key={prod.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-bold text-white block">{prod.title}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">ID: {prod.id.slice(0, 8)}</span>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {prod.category?.name || 'Unassigned'}
                  </td>
                  <td className="px-6 py-4 font-mono font-bold text-white">
                    {formatCurrency(BigInt(prod.price), prod.currency)}
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded">
                      {prod.availableStock}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono font-bold text-amber-400 bg-amber-950/60 border border-amber-800/40 px-2 py-0.5 rounded">
                      {prod.reservedStock}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono font-bold text-purple-400 bg-purple-950/60 border border-purple-800/40 px-2 py-0.5 rounded">
                      {prod.soldStock}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-950/60 border border-indigo-500/40 text-indigo-300">
                      {prod.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
