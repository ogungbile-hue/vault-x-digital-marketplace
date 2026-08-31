'use client';

import React, { useState } from 'react';
import { X, ShieldCheck, Copy, Check, Download, Eye, EyeOff, KeyRound } from 'lucide-react';
import { useMarketplaceStore } from '@/store/marketplace-store';

export function RevealModal() {
  const { revealModal, closeRevealModal } = useMarketplaceStore();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showPlaintext, setShowPlaintext] = useState<Record<string, boolean>>({});

  if (!revealModal.isOpen || revealModal.items.length === 0) return null;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleDownloadTxt = () => {
    const content = revealModal.items
      .map((item, idx) => `Item #${idx + 1} (${item.productTitle}):\n${item.decryptedPayload}\n`)
      .join('\n----------------------------------------\n\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `order-${revealModal.orderId || 'credentials'}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const toggleMask = (stockId: string) => {
    setShowPlaintext((prev) => ({
      ...prev,
      [stockId]: !prev[stockId],
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-lg rounded-2xl border border-purple-500/30 p-6 relative shadow-2xl overflow-hidden">
        {/* Close Button */}
        <button
          onClick={closeRevealModal}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/10 transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-950/60 border border-emerald-500/40 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="font-bold text-lg text-white">Encrypted Stock Delivered</h2>
            <p className="text-xs text-muted-foreground">
              Order #{revealModal.orderId?.slice(0, 8)} • AES-256-GCM In-Memory Decryption
            </p>
          </div>
        </div>

        {/* Credentials Container */}
        <div className="space-y-3 max-h-80 overflow-y-auto pr-1 my-4">
          {revealModal.items.map((item, idx) => {
            const isVisible = showPlaintext[item.stockItemId] ?? true;
            return (
              <div
                key={item.stockItemId || idx}
                className="bg-slate-950/80 border border-purple-500/20 rounded-xl p-4 relative"
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-purple-400" />
                    <span className="text-xs font-semibold text-purple-300">
                      {item.productTitle}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleMask(item.stockItemId)}
                      className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/10 transition"
                      title={isVisible ? 'Hide Secret' : 'Show Secret'}
                    >
                      {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5 text-purple-400" />}
                    </button>
                    <button
                      onClick={() => handleCopy(item.decryptedPayload, item.stockItemId)}
                      className="px-2 py-1 rounded-md bg-purple-950/60 border border-purple-700/50 hover:bg-purple-900/60 text-purple-200 text-xs font-medium flex items-center gap-1 transition"
                    >
                      {copiedId === item.stockItemId ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Secret Display Box */}
                <div className="bg-slate-900 border border-white/5 rounded-lg p-3 font-mono text-xs text-emerald-300 break-all select-all">
                  {isVisible ? item.decryptedPayload : '••••••••••••••••••••••••••••••••••••••••'}
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-3">
          <button
            onClick={handleDownloadTxt}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            Download .txt
          </button>
          <button
            onClick={closeRevealModal}
            className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition active:scale-95 shadow-md shadow-purple-600/30"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
