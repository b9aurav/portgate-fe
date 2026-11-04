"use client";

import React, { useState, useEffect } from "react";
import {
  UploadCloud,
  FileText,
  Receipt,
  PackageCheck,
  Check,
  X,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { runAudit } from "@/lib/api";
import type { AuditResponse } from "@/lib/types";

interface UploadPacketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (audit: AuditResponse) => void;
  tolerancePct?: number;
}

export function UploadPacketModal({
  isOpen,
  onClose,
  onSuccess,
  tolerancePct: defaultTolerance = 5.0,
}: UploadPacketModalProps) {
  const [poPdf, setPoPdf] = useState<File | null>(null);
  const [invPdf, setInvPdf] = useState<File | null>(null);
  const [plPdf, setPlPdf] = useState<File | null>(null);
  const safeTolerance =
    typeof defaultTolerance === "number" && !isNaN(defaultTolerance)
      ? defaultTolerance
      : 5.0;
  const [tolerancePct, setTolerancePct] = useState<number>(safeTolerance);
  const [useMock, setUseMock] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof defaultTolerance === "number" && !isNaN(defaultTolerance)) {
      setTolerancePct(defaultTolerance);
    }
  }, [defaultTolerance]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const formData = new FormData();

      if (useMock) {
        const dummyPdfContent = `%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R>>endobj\nxref\n0 4\ntrailer<</Root 1 0 R>>\n%%EOF`;
        const dummyFile = new File([dummyPdfContent], "mock.pdf", { type: "application/pdf" });
        formData.append("po_pdf", dummyFile);
        formData.append("inv_pdf", dummyFile);
        formData.append("pl_pdf", dummyFile);
      } else {
        if (!poPdf || !invPdf || !plPdf) {
          throw new Error("All three PDF files (Buyer PO, Commercial Invoice, and Packing List) are required for a live audit.");
        }
        formData.append("po_pdf", poPdf);
        formData.append("inv_pdf", invPdf);
        formData.append("pl_pdf", plPdf);
      }

      formData.append("tolerance_pct", tolerancePct.toString());
      formData.append("mock", useMock ? "true" : "false");

      const data = await runAudit(formData);
      onSuccess(data);
      onClose();
      // Reset state
      setPoPdf(null);
      setInvPdf(null);
      setPlPdf(null);
    } catch (err: any) {
      setError(err?.message || "Audit request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 select-none">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <UploadCloud className="w-5 h-5 shrink-0" strokeWidth={1.75} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                New Shipment Compliance Audit
              </h2>
              <p className="text-xs text-slate-500">
                Ingest 3-document packet for deterministic CBP & commercial linting
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4 shrink-0" strokeWidth={2} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Quick Simulation Mode Banner */}
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" strokeWidth={2} />
                <span className="text-xs font-semibold text-indigo-950">
                  Quick Simulation Mode (Embedded Sample)
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={useMock}
                  onChange={(e) => setUseMock(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
            <p className="text-[11px] text-indigo-900/80 leading-relaxed">
              When enabled, runs the reference India→US test packet with all standard conflict fixtures (carton drift, weight inversion, unit price variance, and missing LUT ARN) instantly without uploading local files.
            </p>
          </div>

          {/* 3 Document Upload Slots */}
          {!useMock && (
            <div className="space-y-3">
              {/* Document 1: Buyer PO */}
              <div className="border border-slate-200 rounded-xl p-3.5 hover:border-slate-300 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-500 shrink-0" strokeWidth={1.75} />
                    <span className="text-xs font-semibold text-slate-800">
                      1. US Buyer Purchase Order (PDF)
                    </span>
                  </div>
                  {poPdf && (
                    <span className="text-[11px] text-emerald-600 font-medium inline-flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" strokeWidth={2} /> Ready
                    </span>
                  )}
                </div>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={(e) => setPoPdf(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
                />
              </div>

              {/* Document 2: Commercial Invoice */}
              <div className="border border-slate-200 rounded-xl p-3.5 hover:border-slate-300 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-slate-500 shrink-0" strokeWidth={1.75} />
                    <span className="text-xs font-semibold text-slate-800">
                      2. Supplier Commercial Invoice (PDF)
                    </span>
                  </div>
                  {invPdf && (
                    <span className="text-[11px] text-emerald-600 font-medium inline-flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" strokeWidth={2} /> Ready
                    </span>
                  )}
                </div>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={(e) => setInvPdf(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
                />
              </div>

              {/* Document 3: Packing List */}
              <div className="border border-slate-200 rounded-xl p-3.5 hover:border-slate-300 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <PackageCheck className="w-4 h-4 text-slate-500 shrink-0" strokeWidth={1.75} />
                    <span className="text-xs font-semibold text-slate-800">
                      3. Final Packing List (PDF)
                    </span>
                  </div>
                  {plPdf && (
                    <span className="text-[11px] text-emerald-600 font-medium inline-flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" strokeWidth={2} /> Ready
                    </span>
                  )}
                </div>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={(e) => setPlPdf(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* Tolerance Setting */}
          <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <div>
              <label className="text-xs font-semibold text-slate-800">
                Split-Shipment Tolerance Band
              </label>
              <p className="text-[11px] text-slate-500">
                Variances above this percentage trigger a Critical finding
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min="0"
                max="25"
                step="0.5"
                value={tolerancePct ?? 5.0}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setTolerancePct(Number.isFinite(val) ? val : 0);
                }}
                className="w-16 px-2.5 py-1 text-xs font-mono font-semibold text-right bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-xs font-mono text-slate-500">%</span>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" strokeWidth={2} />
              <span>{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || (!useMock && (!poPdf || !invPdf || !plPdf))}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium text-xs px-5 py-2.5 rounded-lg shadow-sm inline-flex items-center gap-2 transition-all cursor-pointer"
            >
              <UploadCloud className="w-4 h-4 shrink-0" strokeWidth={2} />
              <span>{loading ? "Running 3-Way Audit..." : "Execute 3-Way Audit"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

