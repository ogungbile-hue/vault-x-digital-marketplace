'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Lock,
  Layers,
  Sparkles,
  Loader2,
  FileText,
  Copy,
} from 'lucide-react';
import { DelimiterFormat } from '@app/types';

export default function BulkUploadPage() {
  const queryClient = useQueryClient();

  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [format, setFormat] = useState<DelimiterFormat>(DelimiterFormat.USER_PASS);
  const [customDelimiter, setCustomDelimiter] = useState<string>(':');
  const [rawText, setRawText] = useState<string>('');
  const [previewResult, setPreviewResult] = useState<any>(null);
  const [ingestionSummary, setIngestionSummary] = useState<any>(null);

  // Fetch product list for SKU selector
  const { data: productsData } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await fetch('/api/products');
      return res.json();
    },
  });

  const products = productsData?.products || [];

  // Live syntax parsing when rawText or format changes
  useEffect(() => {
    if (!rawText.trim()) {
      setPreviewResult(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/admin/inventory/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            previewOnly: true,
            rawContent: rawText,
            format,
            customDelimiter,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setPreviewResult(data.preview);
        }
      } catch {
        // Ignore preview errors in background
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [rawText, format, customDelimiter]);

  const uploadMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/admin/inventory/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProductId,
          rawContent: rawText,
          format,
          customDelimiter,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Ingestion failed');
      }
      return data.summary;
    },
    onSuccess: (summary) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setIngestionSummary(summary);
      setRawText('');
      setPreviewResult(null);
    },
  });

  const loadSampleData = (sampleFormat: DelimiterFormat) => {
    setFormat(sampleFormat);
    if (sampleFormat === DelimiterFormat.USER_PASS) {
      setRawText(
        `user_alpha@market.io:SecretPass#123\nuser_beta@market.io:SafePassword!456\nuser_gamma@market.io:UltraSecure789`
      );
    } else if (sampleFormat === DelimiterFormat.UID_PASS_2FA) {
      setRawText(
        `alex1001:pass999:JBSWY3DPEHPK3PXP\nbob1002:pass888:KRSXG5CTMVRXEZLU\ncharlie1003:pass777:MZXW633PN5XW6MZX`
      );
    } else if (sampleFormat === DelimiterFormat.LICENSE_KEY) {
      setRawText(
        `WIN11-PRO-ABCD-EFGH-1234\nWIN11-PRO-5678-9012-IJKL\nWIN11-PRO-MNOP-QRST-3456`
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2.5">
          <UploadCloud className="w-7 h-7 text-purple-400" />
          Bulk Stock Delimiter Ingestion
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Parse raw digital lines, detect duplicates & syntax errors, and batch-encrypt with AES-256-GCM into inventory.
        </p>
      </div>

      {/* Ingestion Results Summary Banner */}
      {ingestionSummary && (
        <div className="glass-panel rounded-2xl border border-emerald-500/40 p-5 bg-emerald-950/40 shadow-xl animate-in fade-in">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-emerald-200 text-sm">Batch Ingestion Completed Successfully</h3>
          </div>
          <div className="grid grid-cols-4 gap-3 text-xs mt-3 bg-slate-950/60 p-3 rounded-xl border border-emerald-900/50">
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase">Total Parsed</span>
              <span className="font-mono font-bold text-white text-base">{ingestionSummary.totalParsed}</span>
            </div>
            <div>
              <span className="text-emerald-400 block text-[10px] uppercase">Encrypted & Stored</span>
              <span className="font-mono font-bold text-emerald-400 text-base">{ingestionSummary.inserted}</span>
            </div>
            <div>
              <span className="text-amber-400 block text-[10px] uppercase">Duplicates Skipped</span>
              <span className="font-mono font-bold text-amber-400 text-base">{ingestionSummary.duplicatesSkipped}</span>
            </div>
            <div>
              <span className="text-rose-400 block text-[10px] uppercase">Errors</span>
              <span className="font-mono font-bold text-rose-400 text-base">{ingestionSummary.errors.length}</span>
            </div>
          </div>
        </div>
      )}

      {/* Ingestion Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <div className="glass-panel rounded-2xl border border-white/10 p-5 space-y-4">
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-400" />
            Upload Settings
          </h3>

          {/* Target SKU Selection */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
              Target Product SKU *
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">-- Select Product SKU --</option>
              {products.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.title} ({p.availableStock} in stock)
                </option>
              ))}
            </select>
          </div>

          {/* Delimiter Format Selection */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
              Delimiter Format
            </label>
            <div className="space-y-1.5">
              {[
                { label: 'user:pass', val: DelimiterFormat.USER_PASS },
                { label: 'uid:pass:2fa_secret', val: DelimiterFormat.UID_PASS_2FA },
                { label: 'uid:pass:2fa_secret:cookie', val: DelimiterFormat.UID_PASS_2FA_COOKIE },
                { label: 'license_key (Single Token)', val: DelimiterFormat.LICENSE_KEY },
                { label: 'Custom Delimiter', val: DelimiterFormat.CUSTOM },
              ].map((f) => (
                <label
                  key={f.val}
                  className={`flex items-center gap-2 p-2 rounded-xl text-xs cursor-pointer border transition ${
                    format === f.val
                      ? 'bg-purple-950/60 border-purple-500/50 text-purple-200'
                      : 'bg-slate-900/40 border-transparent text-muted-foreground hover:bg-slate-900'
                  }`}
                >
                  <input
                    type="radio"
                    name="format"
                    checked={format === f.val}
                    onChange={() => setFormat(f.val)}
                    className="accent-purple-600"
                  />
                  <span>{f.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Custom Delimiter input */}
          {format === DelimiterFormat.CUSTOM && (
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                Custom Separator Character
              </label>
              <input
                type="text"
                value={customDelimiter}
                onChange={(e) => setCustomDelimiter(e.target.value)}
                placeholder="e.g. | or ;"
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          )}

          {/* Mock Presets */}
          <div className="pt-2 border-t border-white/10">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase block mb-2">
              Quick Test Presets
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => loadSampleData(DelimiterFormat.USER_PASS)}
                className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] text-slate-300 transition"
              >
                Sample user:pass
              </button>
              <button
                type="button"
                onClick={() => loadSampleData(DelimiterFormat.UID_PASS_2FA)}
                className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] text-slate-300 transition"
              >
                Sample 2FA Combo
              </button>
              <button
                type="button"
                onClick={() => loadSampleData(DelimiterFormat.LICENSE_KEY)}
                className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] text-slate-300 transition"
              >
                Sample License Keys
              </button>
            </div>
          </div>
        </div>

        {/* Text Input & Live Validation Preview */}
        <div className="lg:col-span-2 space-y-4">
          {/* Raw Text Input */}
          <div className="glass-panel rounded-2xl border border-white/10 p-5 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-purple-400" />
                Raw Stock Data (1 item per line)
              </label>
              {rawText && (
                <button
                  onClick={() => setRawText('')}
                  className="text-[11px] text-muted-foreground hover:text-foreground"
                >
                  Clear Input
                </button>
              )}
            </div>

            <textarea
              rows={8}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Paste raw stock lines here (e.g. user@mail.com:password123)..."
              className="w-full p-3.5 rounded-xl bg-slate-950/80 border border-white/10 text-xs font-mono text-emerald-300 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />

            {/* Ingest Action Button */}
            <button
              onClick={() => uploadMutation.mutate()}
              disabled={
                !selectedProductId ||
                !previewResult ||
                previewResult.validItems.length === 0 ||
                uploadMutation.isPending
              }
              className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition active:scale-98 shadow-lg ${
                !selectedProductId || !previewResult || previewResult.validItems.length === 0
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-600/30'
              }`}
            >
              {uploadMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Encrypting with AES-256-GCM & Inserting...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  Encrypt & Ingest ({previewResult?.validItems?.length || 0} Valid Items)
                </>
              )}
            </button>
          </div>

          {/* Interactive Live Syntax Preview */}
          {previewResult && (
            <div className="glass-panel rounded-2xl border border-white/10 p-5 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white">Live Syntax Analysis</span>
                <div className="flex items-center gap-3">
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {previewResult.validItems.length} Valid
                  </span>
                  {previewResult.duplicates.length > 0 && (
                    <span className="text-amber-400 font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {previewResult.duplicates.length} Duplicates
                    </span>
                  )}
                  {previewResult.errors.length > 0 && (
                    <span className="text-rose-400 font-semibold flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {previewResult.errors.length} Syntax Errors
                    </span>
                  )}
                </div>
              </div>

              {/* Preview Rows Container */}
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {/* Errors first */}
                {previewResult.errors.map((err: any) => (
                  <div
                    key={`err-${err.lineNumber}`}
                    className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/40 text-xs flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className="px-1.5 py-0.5 rounded bg-rose-900/60 font-mono text-[10px] text-rose-300 font-bold shrink-0">
                        Line {err.lineNumber}
                      </span>
                      <span className="font-mono text-rose-300 truncate">{err.rawLine}</span>
                    </div>
                    <span className="text-[11px] text-rose-400 font-medium shrink-0">{err.error}</span>
                  </div>
                ))}

                {/* Duplicates */}
                {previewResult.duplicates.map((dup: any) => (
                  <div
                    key={`dup-${dup.lineNumber}`}
                    className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-800/40 text-xs flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className="px-1.5 py-0.5 rounded bg-amber-900/60 font-mono text-[10px] text-amber-300 font-bold shrink-0">
                        Line {dup.lineNumber}
                      </span>
                      <span className="font-mono text-amber-300 truncate">{dup.rawLine}</span>
                    </div>
                    <span className="text-[11px] text-amber-400 font-medium shrink-0">In-batch duplicate (skipped)</span>
                  </div>
                ))}

                {/* Valid Lines */}
                {previewResult.validItems.map((val: any) => (
                  <div
                    key={`val-${val.lineNumber}`}
                    className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-800/30 text-xs flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className="px-1.5 py-0.5 rounded bg-emerald-900/60 font-mono text-[10px] text-emerald-300 font-bold shrink-0">
                        Line {val.lineNumber}
                      </span>
                      <span className="font-mono text-emerald-300 truncate">{val.normalizedPayload}</span>
                    </div>
                    <span className="text-[11px] text-emerald-400 font-medium shrink-0">Ready for AES-256</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
