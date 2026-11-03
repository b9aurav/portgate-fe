"use client";

import React, { useState } from "react";
import {
  UploadCloud,
  Receipt,
  PackageCheck,
  Check,
  AlertCircle,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { reAudit } from "@/lib/api";
import type { AuditResponse } from "@/lib/types";

interface SupplierRevisionDropzoneProps {
  token: string;
  onAuditComplete: (audit: AuditResponse) => void;
  isLoading: boolean;
  setIsLoading: (v: boolean) => void;
}

export function SupplierRevisionDropzone({
  token,
  onAuditComplete,
  isLoading,
  setIsLoading,
}: SupplierRevisionDropzoneProps) {
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [plFile, setPlFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleReAudit = async (useSample: boolean = false) => {
    setIsLoading(true);
    setUploadError(null);

    try {
      const formData = new FormData();

      if (useSample) {
        formData.append("mock", "true");
        const dummyPdf = new File(
          ["%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF"],
          "sample_revised.pdf",
          { type: "application/pdf" }
        );
        formData.append("invoice_file", dummyPdf);
        formData.append("packing_list_file", dummyPdf);
      } else {
        if (!invoiceFile && !plFile) {
          throw new Error("Please select at least one revised document (Invoice or Packing List) to upload.");
        }
        if (invoiceFile) formData.append("invoice_file", invoiceFile);
        if (plFile) formData.append("packing_list_file", plFile);
      }

      const updatedAudit = await reAudit(token, formData);
      onAuditComplete(updatedAudit);
      setInvoiceFile(null);
      setPlFile(null);
    } catch (err: any) {
      setUploadError(err?.message || "Re-audit failed. Check document format.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5 shadow-xs select-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <UploadCloud className="w-4 h-4 shrink-0" strokeWidth={1.75} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Upload Corrected Supplier Documents
            </h3>
            <p className="text-[11px] text-slate-500">
              2-File Revision Dropzone · Locked Buyer PO Paired Automatically
            </p>
          </div>
        </div>
        <span className="text-[10px] font-mono font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
          Locked PO Baseline
        </span>
      </div>

      {/* Quick Simulation Mode */}
      <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" strokeWidth={2} />
            <span className="text-xs font-semibold text-indigo-950">
              Quick Simulation Mode
            </span>
          </div>
          <span className="text-[10px] font-mono text-indigo-600">No local PDF required</span>
        </div>
        <button
          type="button"
          onClick={() => handleReAudit(true)}
          disabled={isLoading}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-3.5 rounded-lg transition-colors text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" strokeWidth={2} />
              <span>Re-auditing Against Locked PO...</span>
            </>
          ) : (
            <>
              <Check className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
              <span>Submit Corrected Revision (Auto-Resolves Discrepancies)</span>
            </>
          )}
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 border-t border-slate-200" />
        <span className="text-[11px] text-slate-400 font-medium font-sans">
          or upload your corrected PDF exports
        </span>
        <div className="flex-1 border-t border-slate-200" />
      </div>

      {/* 2-File Inputs */}
      <div className="grid grid-cols-2 gap-4">
        {/* Invoice File Slot */}
        <div className="border border-slate-200 rounded-xl p-3.5 hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-slate-500 shrink-0" strokeWidth={1.75} />
              <label className="text-xs font-semibold text-slate-800">
                Commercial Invoice PDF (Tally Prime)
              </label>
            </div>
            {invoiceFile && (
              <span className="text-[11px] text-emerald-600 font-medium inline-flex items-center gap-1">
                <Check className="w-3 h-3" strokeWidth={2} /> Attached
              </span>
            )}
          </div>
          <input
            type="file"
            accept=".pdf,application/pdf"
            onChange={(e) => setInvoiceFile(e.target.files?.[0] ?? null)}
            className="w-full text-xs text-slate-600 file:mr-2.5 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
          />
        </div>

        {/* Packing List File Slot */}
        <div className="border border-slate-200 rounded-xl p-3.5 hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <PackageCheck className="w-4 h-4 text-slate-500 shrink-0" strokeWidth={1.75} />
              <label className="text-xs font-semibold text-slate-800">
                Final Packing List PDF
              </label>
            </div>
            {plFile && (
              <span className="text-[11px] text-emerald-600 font-medium inline-flex items-center gap-1">
                <Check className="w-3 h-3" strokeWidth={2} /> Attached
              </span>
            )}
          </div>
          <input
            type="file"
            accept=".pdf,application/pdf"
            onChange={(e) => setPlFile(e.target.files?.[0] ?? null)}
            className="w-full text-xs text-slate-600 file:mr-2.5 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
          />
        </div>
      </div>

      {/* Error Banner */}
      {uploadError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs text-rose-800">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" strokeWidth={2} />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="button"
        onClick={() => handleReAudit(false)}
        disabled={(!invoiceFile && !plFile) || isLoading}
        className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-400 text-white font-medium py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
      >
        {isLoading ? (
          <>
            <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" strokeWidth={2} />
            <span>Running Compliance Re-Audit Against Locked PO...</span>
          </>
        ) : (
          <>
            <UploadCloud className="w-4 h-4 shrink-0" strokeWidth={2} />
            <span>Run Revision Audit Against Locked Buyer PO</span>
          </>
        )}
      </button>
    </div>
  );
}

