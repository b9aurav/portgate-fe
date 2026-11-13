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
  FileCheck2,
  ShieldCheck,
  Clock,
  X,
} from "lucide-react";
import { reAudit } from "@/lib/api";
import type { AuditResponse } from "@/lib/types";

interface SupplierRevisionDropzoneProps {
  token: string;
  onAuditComplete: (audit: AuditResponse) => void;
  isLoading: boolean;
  setIsLoading: (v: boolean) => void;
  unresolvedCount?: number;
  revisionNumber?: number;
  isReopened?: boolean;
}

export function SupplierRevisionDropzone({
  token,
  onAuditComplete,
  isLoading,
  setIsLoading,
  unresolvedCount = 0,
  revisionNumber = 1,
  isReopened = false,
}: SupplierRevisionDropzoneProps) {
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [plFile, setPlFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [invDragging, setInvDragging] = useState(false);
  const [plDragging, setPlDragging] = useState(false);
  const [reAuditElapsed, setReAuditElapsed] = useState(0);

  React.useEffect(() => {
    let t: NodeJS.Timeout | null = null;
    if (isLoading) {
      t = setInterval(() => setReAuditElapsed((prev) => prev + 1), 1000);
    } else {
      setReAuditElapsed(0);
    }
    return () => {
      if (t) clearInterval(t);
    };
  }, [isLoading]);

  // If shipment has 0 unresolved discrepancies and is not reopened by buyer, lock the portal and show verified card
  if (unresolvedCount === 0 && !isReopened) {
    return (
      <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-5 select-none space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" strokeWidth={2} />
            <h3 className="text-xs font-bold text-emerald-950">
              Shipment Packet Verified & Locked
            </h3>
          </div>
          <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-100/80 border border-emerald-300 px-2 py-0.5 rounded-full">
            Rev v{revisionNumber} Final
          </span>
        </div>
        <p className="text-xs text-emerald-800 leading-relaxed">
          All pre-shipment discrepancies have been resolved and signed off. This document packet is now locked for US Buyer & Customs Broker entry filing. No further document uploads are permitted.
        </p>
      </div>
    );
  }

  const hasFiles = Boolean(invoiceFile || plFile);

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
    <div className="bg-white border border-slate-200 rounded-2xl p-3.5 space-y-3 shadow-xs select-none">
      {/* Streamlined Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <UploadCloud className="w-3.5 h-3.5" strokeWidth={1.75} />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-slate-900 leading-tight">
              Upload Corrected Documents
            </h3>
            <p className="text-[10px] text-slate-500 leading-tight">
              2-file revision dropzone · Locked Buyer PO baseline
            </p>
          </div>
        </div>

        {/* De-emphasized Simulation Trigger & Baseline Badge */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleReAudit(true)}
            disabled={isLoading}
            className="text-[11px] text-slate-400 hover:text-indigo-600 transition-colors inline-flex items-center gap-1 font-medium cursor-pointer disabled:opacity-50"
            title="Simulate supplier revision with golden corrected packet"
          >
            <Sparkles className="w-3 h-3 text-slate-400 shrink-0" />
            <span>Load test v2</span>
          </button>
          <span className="text-[9px] font-mono font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
            Locked PO
          </span>
        </div>
      </div>

      {/* Security Capability Bar */}
      <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 text-[10px] font-medium">
        <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
        <span className="truncate">
          Encrypted Capability Link · Expires in 7d · Upload SHA-256 & Timestamp Logged
        </span>
      </div>

      {/* Reopened Banner */}
      {isReopened && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 flex items-start gap-2 select-none">
          <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 leading-snug">
            <span className="font-bold">Shipment Reopened for Supplier Revision: </span>
            The buyer has reopened this packet for revised document submission. You may upload replacement Commercial Invoice and/or Packing List PDFs to trigger a revision audit against the locked Buyer PO baseline.
          </div>
        </div>
      )}

      {/* Styled 2-File Dropzones (sr-only native inputs) */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Commercial Invoice Dropzone */}
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setInvDragging(true);
          }}
          onDragLeave={() => setInvDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setInvDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file) setInvoiceFile(file);
          }}
          className={`relative flex flex-col justify-between p-2.5 rounded-xl border border-dashed transition-all cursor-pointer min-h-[78px] ${invoiceFile
              ? "border-emerald-300 bg-emerald-50/25 hover:border-emerald-400"
              : invDragging
                ? "border-indigo-400 bg-indigo-50/40"
                : "border-slate-200 bg-slate-50/50 hover:border-indigo-400 hover:bg-indigo-50/30"
            }`}
        >
          <input
            type="file"
            accept=".pdf,application/pdf"
            onChange={(e) => {
              setInvoiceFile(e.target.files?.[0] ?? null);
              e.target.value = "";
            }}
            className="sr-only"
          />

          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <Receipt className="w-3.5 h-3.5 text-slate-500 shrink-0" strokeWidth={1.75} />
              <span className="text-[11px] font-semibold text-slate-800 truncate">
                Commercial Invoice PDF
              </span>
            </div>
            {invoiceFile && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setInvoiceFile(null);
                }}
                className="w-4 h-4 rounded-full flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer shrink-0"
                title="Remove file"
              >
                <X className="w-3 h-3" strokeWidth={2} />
              </button>
            )}
          </div>

          {invoiceFile ? (
            <div className="flex items-center gap-1.5 bg-white border border-emerald-200/80 rounded-lg px-2 py-1 shadow-2xs mt-auto">
              <FileCheck2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" strokeWidth={2} />
              <div className="min-w-0 flex-1 flex items-baseline justify-between gap-1">
                <span
                  className="truncate max-w-[100px] text-xs font-medium text-slate-800"
                  title={invoiceFile.name}
                >
                  {invoiceFile.name}
                </span>
                <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                  {(invoiceFile.size / 1024).toFixed(0)} KB
                </span>
              </div>
            </div>
          ) : (
            <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-auto py-0.5">
              <UploadCloud className="w-3 h-3 text-slate-400 shrink-0" strokeWidth={1.75} />
              <span className="truncate">Click or drag PDF</span>
            </div>
          )}
        </label>

        {/* Final Packing List Dropzone */}
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setPlDragging(true);
          }}
          onDragLeave={() => setPlDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setPlDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file) setPlFile(file);
          }}
          className={`relative flex flex-col justify-between p-2.5 rounded-xl border border-dashed transition-all cursor-pointer min-h-[78px] ${plFile
              ? "border-emerald-300 bg-emerald-50/25 hover:border-emerald-400"
              : plDragging
                ? "border-indigo-400 bg-indigo-50/40"
                : "border-slate-200 bg-slate-50/50 hover:border-indigo-400 hover:bg-indigo-50/30"
            }`}
        >
          <input
            type="file"
            accept=".pdf,application/pdf"
            onChange={(e) => {
              setPlFile(e.target.files?.[0] ?? null);
              e.target.value = "";
            }}
            className="sr-only"
          />

          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <PackageCheck className="w-3.5 h-3.5 text-slate-500 shrink-0" strokeWidth={1.75} />
              <span className="text-[11px] font-semibold text-slate-800 truncate">
                Final Packing List PDF
              </span>
            </div>
            {plFile && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setPlFile(null);
                }}
                className="w-4 h-4 rounded-full flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer shrink-0"
                title="Remove file"
              >
                <X className="w-3 h-3" strokeWidth={2} />
              </button>
            )}
          </div>

          {plFile ? (
            <div className="flex items-center gap-1.5 bg-white border border-emerald-200/80 rounded-lg px-2 py-1 shadow-2xs mt-auto">
              <FileCheck2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" strokeWidth={2} />
              <div className="min-w-0 flex-1 flex items-baseline justify-between gap-1">
                <span
                  className="truncate max-w-[100px] text-xs font-medium text-slate-800"
                  title={plFile.name}
                >
                  {plFile.name}
                </span>
                <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                  {(plFile.size / 1024).toFixed(0)} KB
                </span>
              </div>
            </div>
          ) : (
            <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-auto py-0.5">
              <UploadCloud className="w-3 h-3 text-slate-400 shrink-0" strokeWidth={1.75} />
              <span className="truncate">Click or drag PDF</span>
            </div>
          )}
        </label>
      </div>

      {/* Error Banner */}
      {uploadError && (
        <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs text-rose-800">
          <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" strokeWidth={2} />
          <span className="text-[11px]">{uploadError}</span>
        </div>
      )}

      {/* Active Re-Audit Status Banner */}
      {isLoading && (
        <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2 animate-in fade-in duration-150">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-indigo-950">
              <RefreshCw className="w-3.5 h-3.5 text-indigo-600 animate-spin shrink-0" />
              <span>
                {reAuditElapsed < 4
                  ? "Uploading revised documents..."
                  : reAuditElapsed < 12
                    ? "Comparing revisions against PO & Packing List..."
                    : "Waking up Render backend container (~30–45s)..."}
              </span>
            </div>
            <span className="font-mono text-[11px] font-semibold text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded shrink-0">
              {reAuditElapsed}s
            </span>
          </div>
          {reAuditElapsed >= 6 && (
            <p className="text-[11px] text-indigo-800 leading-relaxed bg-white/70 p-2 rounded-lg border border-indigo-100">
              💡 <strong>Free Tier Spin-Up:</strong> If the backend was inactive, Render takes ~30–45s on first wake-up. Please hold on!
            </p>
          )}
        </div>
      )}

      {/* High-Contrast Action Button */}
      <button
        type="button"
        onClick={() => handleReAudit(false)}
        disabled={!hasFiles || isLoading}
        className={`w-full font-medium py-2 px-3.5 rounded-xl text-xs flex items-center justify-center gap-2 transition-all ${hasFiles
            ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm cursor-pointer"
            : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
          } ${isLoading ? "opacity-75 cursor-wait" : ""}`}
      >
        {isLoading ? (
          <>
            <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" strokeWidth={2} />
            <span>Re-Auditing Against Locked PO ({reAuditElapsed}s)...</span>
          </>
        ) : (
          <>
            <UploadCloud className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
            <span>Run Revision Audit Against Locked Buyer PO</span>
          </>
        )}
      </button>
    </div>
  );
}
