"use client";

import React, { useState, useEffect } from "react";
import {
  UploadCloud,
  FileText,
  Receipt,
  PackageCheck,
  FileCheck2,
  X,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { runAudit } from "@/lib/api";
import type { AuditResponse } from "@/lib/types";

interface UploadPacketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (audit: AuditResponse) => void;
  tolerancePct?: number;
}

interface DropzoneCardProps {
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  file: File | null;
  onFileSelect: (file: File | null) => void;
}

function DropzoneCard({
  label,
  sublabel,
  icon,
  file,
  onFileSelect,
}: DropzoneCardProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        const droppedFile = e.dataTransfer.files?.[0];
        if (droppedFile) onFileSelect(droppedFile);
      }}
      className={`block relative border-2 border-dashed rounded-xl p-3.5 transition cursor-pointer select-none ${
        file
          ? "border-emerald-300 bg-emerald-50/40 hover:bg-emerald-50/60"
          : isDragOver
          ? "border-indigo-500 bg-indigo-50/50"
          : "border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30"
      }`}
    >
      <input
        type="file"
        accept=".pdf,application/pdf"
        onChange={(e) => {
          onFileSelect(e.target.files?.[0] || null);
          e.target.value = "";
        }}
        className="sr-only"
      />

      {file ? (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
              <FileCheck2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-900 truncate">
                {file.name}
              </div>
              <div className="text-[11px] text-slate-500 font-mono">
                {(file.size / 1024).toFixed(1)} KB · Ready for Audit
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onFileSelect(null);
            }}
            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition shrink-0 cursor-pointer"
            title="Remove file"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
              {icon}
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-800">
                {label}
              </div>
              <div className="text-[11px] text-slate-500">
                {sublabel}
              </div>
            </div>
          </div>
          <span className="text-[11px] font-medium text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100 shrink-0">
            Choose PDF
          </span>
        </div>
      )}
    </label>
  );
}

export function UploadPacketModal({
  isOpen,
  onClose,
  onSuccess,
  tolerancePct: defaultTolerance = 5.0,
}: UploadPacketModalProps) {
  const [poFile, setPoFile] = useState<File | null>(null);
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [packingListFile, setPackingListFile] = useState<File | null>(null);

  const safeTolerance =
    typeof defaultTolerance === "number" && !isNaN(defaultTolerance)
      ? defaultTolerance
      : 5.0;
  const [tolerancePct, setTolerancePct] = useState<number>(safeTolerance);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof defaultTolerance === "number" && !isNaN(defaultTolerance)) {
      setTolerancePct(defaultTolerance);
    }
  }, [defaultTolerance]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!poFile || !invoiceFile || !packingListFile) {
      setError("All three PDF files (Buyer PO, Commercial Invoice, and Packing List) are required.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("po_pdf", poFile);
      formData.append("inv_pdf", invoiceFile);
      formData.append("pl_pdf", packingListFile);
      formData.append("tolerance_pct", tolerancePct.toString());
      formData.append("mock", "false");

      const data = await runAudit(formData);
      onSuccess(data);
      onClose();

      // Reset files
      setPoFile(null);
      setInvoiceFile(null);
      setPackingListFile(null);
    } catch (err: any) {
      setError(err?.detail || err?.message || "Audit request failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormComplete = Boolean(poFile && invoiceFile && packingListFile);

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
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 shrink-0" strokeWidth={2} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* 3 Document Upload Dropzones */}
          <div className="space-y-3">
            <DropzoneCard
              label="1. Buyer Purchase Order (PDF)"
              sublabel="Select or drop Buyer PO schedule (PDF)"
              icon={<FileText className="w-4 h-4" strokeWidth={1.75} />}
              file={poFile}
              onFileSelect={setPoFile}
            />

            <DropzoneCard
              label="2. Commercial Invoice (PDF)"
              sublabel="Select or drop Supplier Commercial Invoice (PDF)"
              icon={<Receipt className="w-4 h-4" strokeWidth={1.75} />}
              file={invoiceFile}
              onFileSelect={setInvoiceFile}
            />

            <DropzoneCard
              label="3. Packing List (PDF)"
              sublabel="Select or drop Final Packing List (PDF)"
              icon={<PackageCheck className="w-4 h-4" strokeWidth={1.75} />}
              file={packingListFile}
              onFileSelect={setPackingListFile}
            />
          </div>

          {/* Tolerance Setting */}
          <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
            <div>
              <label className="text-xs font-semibold text-slate-800 block">
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
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isFormComplete || isSubmitting}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-xs px-5 py-2.5 rounded-lg shadow-sm inline-flex items-center gap-2 transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
                  <span>Auditing 3-Document Packet...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4 shrink-0" strokeWidth={2} />
                  <span>Execute 3-Way Audit</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
