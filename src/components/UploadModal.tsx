"use client";

import React, { useState } from "react";
import type { AuditResponse } from "@/types/audit";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: AuditResponse) => void;
  tolerancePct: number;
}

export function UploadModal({ isOpen, onClose, onSuccess, tolerancePct }: UploadModalProps) {
  const [poPdf, setPoPdf] = useState<File | null>(null);
  const [invPdf, setInvPdf] = useState<File | null>(null);
  const [plPdf, setPlPdf] = useState<File | null>(null);
  const [customTolerance, setCustomTolerance] = useState(tolerancePct);
  const [useMock, setUseMock] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!useMock && (!poPdf || !invPdf || !plPdf)) {
      setError("Please upload all three PDF documents.");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      
      if (useMock) {
        // Mock mode: send dummy PDFs to satisfy FastAPI's required File() fields
        const dummyPdfContent = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R>>endobj
xref
0 4
trailer<</Root 1 0 R>>
%%EOF`;
        const dummyFile = new File([dummyPdfContent], "mock.pdf", { type: "application/pdf" });
        formData.append("po_pdf", dummyFile);
        formData.append("inv_pdf", dummyFile);
        formData.append("pl_pdf", dummyFile);
      } else if (poPdf && invPdf && plPdf) {
        // Live mode: send actual PDFs
        formData.append("po_pdf", poPdf);
        formData.append("inv_pdf", invPdf);
        formData.append("pl_pdf", plPdf);
      } else {
        // Should never reach here due to validation above
        throw new Error("PDF files are required");
      }
      
      formData.append("tolerance_pct", customTolerance.toString());
      formData.append("mock", useMock ? "true" : "false");

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/api/audit`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Audit request failed");
      }

      const data: AuditResponse = await response.json();
      onSuccess(data);
      onClose();
      // Reset state
      setPoPdf(null);
      setInvPdf(null);
      setPlPdf(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto m-4">
        {/* Header */}
        <div className="border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Upload PDF Packet</h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            >
              ×
            </button>
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Mock Mode Toggle */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={useMock}
                onChange={(e) => setUseMock(e.target.checked)}
                className="w-5 h-5"
              />
              <div>
                <div className="font-semibold text-gray-900">Backend Mock Mode</div>
                <div className="text-sm text-gray-600">
                  Use the backend's built-in sabotaged packet (Shreeji Textiles) instead of live
                  Gemini extraction. Useful for testing without consuming API tokens.
                </div>
              </div>
            </label>
          </div>

          {/* PDF Upload Dropzones (hidden in mock mode) */}
          {!useMock && (
            <div className="space-y-4">
              <FileDropzone
                label="1. US Buyer Purchase Order (PDF)"
                file={poPdf}
                onFileChange={setPoPdf}
              />
              <FileDropzone
                label="2. Indian Tally Prime Invoice (PDF)"
                file={invPdf}
                onFileChange={setInvPdf}
              />
              <FileDropzone
                label="3. Exporter Packing List (PDF)"
                file={plPdf}
                onFileChange={setPlPdf}
              />
            </div>
          )}

          {/* Tolerance Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Split-Shipment Tolerance (%)
            </label>
            <input
              type="number"
              min="0"
              max="25"
              step="0.1"
              value={customTolerance}
              onChange={(e) => setCustomTolerance(parseFloat(e.target.value) || 5.0)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="text-xs text-gray-500 mt-1">
              Quantities within this band emit WARN; above it emit CRIT.
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-3 text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || (!useMock && (!poPdf || !invPdf || !plPdf))}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              {loading ? "Processing..." : "⚡ Run Audit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// File Dropzone Component
interface FileDropzoneProps {
  label: string;
  file: File | null;
  onFileChange: (file: File | null) => void;
}

function FileDropzone({ label, file, onFileChange }: FileDropzoneProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped && dropped.type === "application/pdf") {
      onFileChange(dropped);
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <div
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          file
            ? "border-green-500 bg-green-50"
            : "border-gray-300 hover:border-blue-500 hover:bg-blue-50"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          onChange={(e) => onFileChange(e.target.files?.[0] || null)}
          className="hidden"
        />
        {file ? (
          <div className="text-green-700 font-medium">{file.name}</div>
        ) : (
          <div className="text-gray-500">Click or drag PDF here</div>
        )}
      </div>
    </div>
  );
}
