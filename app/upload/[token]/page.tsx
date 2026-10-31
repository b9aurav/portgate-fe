"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { HighlightProvider, useHighlight } from "@/context/HighlightContext";
import { DocumentViewer } from "@/components/DocumentViewer";
import type {
  AuditResponse,
  BuyerPO,
  DiscrepancyItem,
} from "@/types/audit";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ────────────────────────────────────────────────────────────────────────────
// Category Styling
// ────────────────────────────────────────────────────────────────────────────
const CATEGORY_STYLE = {
  DETERMINISTIC_CONFLICT: {
    border: "border-l-4 border-l-rose-600 border-gray-200 bg-white",
    badge: "bg-rose-100 text-rose-800 border-rose-300",
    label: "Must Fix in Tally Before Submission",
    icon: "🚫",
  },
  COMMERCIAL_VARIANCE: {
    border: "border-l-4 border-l-amber-500 border-gray-200 bg-white",
    badge: "bg-amber-100 text-amber-800 border-amber-300",
    label: "Commercial Variance vs PO",
    icon: "⚠️",
  },
  COMPLIANCE_ADVISORY: {
    border: "border-l-4 border-l-sky-500 border-gray-200 bg-white",
    badge: "bg-sky-100 text-sky-800 border-sky-300",
    label: "Compliance Advisory",
    icon: "ℹ️",
  },
};

// ────────────────────────────────────────────────────────────────────────────
// Locked Buyer PO Reference Card
// ────────────────────────────────────────────────────────────────────────────
function BuyerPOReferenceCard({
  po,
  revisionNumber,
}: {
  po: BuyerPO;
  revisionNumber: number;
}) {
  return (
    <div className="bg-white border-2 border-blue-200 rounded-xl p-5 space-y-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-sm font-bold shadow">
            🇺🇸
          </div>
          <div>
            <div className="text-sm font-bold text-blue-900">Locked Buyer PO Reference</div>
            <div className="text-[11px] text-blue-600">
              Pre-loaded by US Buyer · Read-Only · Locked in Session
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="font-mono text-xs font-bold text-blue-800 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg">
            {po.po_number}
          </div>
          <div className="font-mono text-xs font-bold text-indigo-800 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg">
            Revision #v{revisionNumber}
          </div>
        </div>
      </div>

      {/* PO Metadata */}
      <div className="grid grid-cols-3 gap-3 text-xs">
        <div className="bg-gray-50 rounded-lg p-2.5">
          <div className="text-gray-500 text-[10px] font-semibold uppercase tracking-wider mb-1">
            Buyer Name
          </div>
          <div className="font-semibold text-gray-900 leading-tight">{po.buyer_name}</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-2.5">
          <div className="text-gray-500 text-[10px] font-semibold uppercase tracking-wider mb-1">
            Incoterms
          </div>
          <div className="font-semibold text-gray-900">{po.incoterms}</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-2.5">
          <div className="text-gray-500 text-[10px] font-semibold uppercase tracking-wider mb-1">
            Total PO Value
          </div>
          <div className="font-semibold text-gray-900">
            ${po.total_po_value_usd.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Line Items */}
      <div>
        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">
          PO Line Items (Your Invoice & Packing List Must Cover These)
        </div>
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-2.5 py-1.5 text-gray-600 font-semibold">#</th>
                <th className="px-2.5 py-1.5 text-gray-600 font-semibold">Description</th>
                <th className="px-2.5 py-1.5 text-gray-600 font-semibold">HTS Code</th>
                <th className="px-2.5 py-1.5 text-gray-600 font-semibold text-right">Qty</th>
                <th className="px-2.5 py-1.5 text-gray-600 font-semibold text-right">
                  Unit Price
                </th>
                <th className="px-2.5 py-1.5 text-gray-600 font-semibold text-right">
                  Total (USD)
                </th>
              </tr>
            </thead>
            <tbody>
              {po.line_items.map((line) => (
                <tr key={line.line_no} className="border-t border-gray-100">
                  <td className="px-2.5 py-1.5 text-gray-500">{line.line_no}</td>
                  <td className="px-2.5 py-1.5 text-gray-900 font-medium">{line.description}</td>
                  <td className="px-2.5 py-1.5 font-mono text-gray-700">{line.hts_code}</td>
                  <td className="px-2.5 py-1.5 text-right text-gray-900">
                    {line.quantity.toLocaleString()} {line.uom}
                  </td>
                  <td className="px-2.5 py-1.5 text-right font-semibold text-gray-900">
                    ${line.unit_price_usd.toFixed(2)}
                  </td>
                  <td className="px-2.5 py-1.5 text-right font-bold text-gray-900">
                    ${line.total_usd.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload note */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-800 flex items-center gap-2">
        <span>ℹ️</span>
        <span>
          <span className="font-semibold">Locked PO:</span> You do not need to upload a PO
          document. Only upload your corrected Commercial Invoice and/or Packing List.
        </span>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Supplier 2-File Revision Dropzone
// ────────────────────────────────────────────────────────────────────────────
interface RevisionDropzoneProps {
  token: string;
  onAuditComplete: (audit: AuditResponse) => void;
  isLoading: boolean;
  setIsLoading: (v: boolean) => void;
}

function RevisionDropzone({
  token,
  onAuditComplete,
  isLoading,
  setIsLoading,
}: RevisionDropzoneProps) {
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [plFile, setPlFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleReAudit = async (useSample: boolean = false) => {
    setIsLoading(true);
    setUploadError(null);

    try {
      const formData = new FormData();

      if (useSample) {
        // Quick sample revision: dummy file triggers backend mock/sample revision
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
          throw new Error("Please select at least one revised document to upload.");
        }
        if (invoiceFile) formData.append("invoice_file", invoiceFile);
        if (plFile) formData.append("packing_list_file", plFile);
      }

      const res = await fetch(`${API_URL}/api/links/${token}/re-audit`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Re-audit failed");
      }

      const updatedAudit: AuditResponse = await res.json();
      onAuditComplete(updatedAudit);
      setInvoiceFile(null);
      setPlFile(null);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">📤</span>
          <span className="text-sm font-bold text-gray-900">
            Upload Corrected Supplier Documents
          </span>
        </div>
        <div className="text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded font-mono">
          2-File Dropzone · Locked PO Paired Automatically
        </div>
      </div>

      {/* Quick test revision button */}
      <div className="border border-dashed border-indigo-200 bg-indigo-50/50 rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">
            Quick Simulation Mode
          </div>
          <span className="text-[10px] text-indigo-500 font-mono">No local PDF needed</span>
        </div>
        <button
          type="button"
          onClick={() => handleReAudit(true)}
          disabled={isLoading}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-3 rounded-lg transition-colors text-xs flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <span className="animate-spin">⟳</span>
              <span>Re-auditing Against Locked PO...</span>
            </>
          ) : (
            <>
              <span>⚡</span>
              <span>Submit Corrected Revision (Auto-Resolves Discrepancies)</span>
            </>
          )}
        </button>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1 border-t border-gray-200" />
        <span className="text-[11px] text-gray-400 font-medium">or upload your revised PDF files</span>
        <div className="flex-1 border-t border-gray-200" />
      </div>

      {/* File inputs */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Commercial Invoice PDF (Tally Prime)
          </label>
          <input
            type="file"
            accept=".pdf,application/pdf"
            onChange={(e) => setInvoiceFile(e.target.files?.[0] ?? null)}
            className="w-full text-xs text-gray-700 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border border-gray-300 rounded-lg p-1"
          />
          {invoiceFile && (
            <div className="text-[11px] text-emerald-700 mt-1 truncate">✓ {invoiceFile.name}</div>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Packing List PDF
          </label>
          <input
            type="file"
            accept=".pdf,application/pdf"
            onChange={(e) => setPlFile(e.target.files?.[0] ?? null)}
            className="w-full text-xs text-gray-700 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border border-gray-300 rounded-lg p-1"
          />
          {plFile && (
            <div className="text-[11px] text-emerald-700 mt-1 truncate">✓ {plFile.name}</div>
          )}
        </div>
      </div>

      {uploadError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg px-3 py-2">
          ⚠️ {uploadError}
        </div>
      )}

      <button
        type="button"
        onClick={() => handleReAudit(false)}
        disabled={(!invoiceFile && !plFile) || isLoading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors text-xs flex items-center justify-center gap-2 shadow-sm"
      >
        {isLoading ? (
          <>
            <span className="animate-spin">⟳</span>
            <span>Running Compliance Re-Audit...</span>
          </>
        ) : (
          <>
            <span>🔍</span>
            <span>Run Revision Audit Against Locked Buyer PO</span>
          </>
        )}
      </button>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Discrepancy Queue Component
// ────────────────────────────────────────────────────────────────────────────
function DiscrepancyList({
  audit,
  onSubmitToBuyer,
}: {
  audit: AuditResponse;
  onSubmitToBuyer: () => void;
}) {
  const { setHighlight, setActiveTab } = useHighlight();

  const deterministicItems = audit.items.filter(
    (d) => d.category === "DETERMINISTIC_CONFLICT"
  );
  const commercialItems = audit.items.filter(
    (d) => d.category === "COMMERCIAL_VARIANCE"
  );
  const advisoryItems = audit.items.filter(
    (d) => d.category === "COMPLIANCE_ADVISORY"
  );

  const unresolvedCount = audit.summary.unresolved_count ?? audit.items.filter(
    (d) => !d.resolution_state || d.resolution_state === "UNRESOLVED"
  ).length;

  const renderItem = (disc: DiscrepancyItem) => {
    const style = CATEGORY_STYLE[disc.category || "DETERMINISTIC_CONFLICT"];
    const isResolved =
      disc.resolution_state === "ACCEPTED_EXCEPTION" ||
      disc.resolution_state === "ESCALATED_TO_BROKER";

    return (
      <div
        key={disc.id}
        onClick={() => {
          if (disc.locs && disc.locs[0]) {
            setActiveTab(disc.locs[0][0]);
            setHighlight(disc.id, disc.cells || [], disc.sev || "crit", disc.locs[0][0]);
          }
        }}
        className={`rounded-xl border p-4 space-y-2.5 transition-all shadow-xs cursor-pointer hover:shadow-md ${
          isResolved
            ? "border-emerald-300 bg-emerald-50/40"
            : style.border
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-base">{style.icon}</span>
            <span className="font-mono text-xs font-bold text-gray-900">{disc.id}</span>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${style.badge}`}>
              {style.label}
            </span>
          </div>

          {/* Resolution Badge */}
          {disc.resolution_state && disc.resolution_state !== "UNRESOLVED" ? (
            <div className="text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full">
              ✓ {disc.resolution_state}
            </div>
          ) : (
            <div className="text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 px-2 py-0.5 rounded-full">
              Unresolved
            </div>
          )}
        </div>

        <div className="font-semibold text-xs text-gray-900">{disc.title}</div>
        <div className="text-xs text-gray-600 leading-relaxed">{disc.body || disc.description}</div>

        {/* Source comparisons if present */}
        {disc.source_val_a && disc.source_val_b && (
          <div className="grid grid-cols-2 gap-2 text-xs bg-gray-50 rounded-lg p-2.5 border border-gray-200">
            <div>
              <div className="text-[10px] text-gray-500 font-semibold uppercase">
                {disc.source_doc_a} · {disc.source_field_a}
              </div>
              <div className="font-mono font-bold text-gray-900 mt-0.5">{disc.source_val_a}</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-500 font-semibold uppercase">
                {disc.source_doc_b} · {disc.source_field_b}
              </div>
              <div className="font-mono font-bold text-rose-700 mt-0.5">{disc.source_val_b}</div>
            </div>
          </div>
        )}

        {/* Financial Impact Note */}
        {(disc.financial_impact_note || disc.impact) && (
          <div className="text-[11px] text-rose-800 bg-rose-50 border border-rose-200 rounded p-2">
            <span className="font-semibold">Financial / Risk Impact:</span> {disc.financial_impact_note || disc.impact}
          </div>
        )}

        {/* Location tabs to highlight */}
        {disc.locs && disc.locs.length > 0 && (
          <div className="flex items-center gap-1.5 pt-1">
            <span className="text-[10px] text-gray-400">View in document:</span>
            {disc.locs.map(([key, label], idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveTab(key);
                  setHighlight(disc.id, disc.cells || [], disc.sev || "crit", key);
                }}
                className="text-[10px] bg-white border border-gray-300 hover:bg-gray-100 px-2 py-0.5 rounded text-gray-700 font-mono transition-colors"
              >
                🔍 {label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Summary Banner */}
      <div
        className={`rounded-xl p-4 border-2 ${
          unresolvedCount > 0
            ? "bg-rose-50 border-rose-500"
            : "bg-emerald-50 border-emerald-500"
        }`}
      >
        <div
          className={`text-sm font-bold ${
            unresolvedCount > 0 ? "text-rose-900" : "text-emerald-900"
          }`}
        >
          {unresolvedCount > 0
            ? `🚫 ${unresolvedCount} item(s) require your revision`
            : "✓ All checks passed — revision is clean and verified"}
        </div>
        <div className="text-xs text-gray-600 mt-1">
          {audit.summary.deterministic_conflicts ?? 0} deterministic conflict(s) ·{" "}
          {audit.summary.commercial_variances ?? 0} commercial variance(s) ·{" "}
          {audit.summary.compliance_advisories ?? 0} advisory(ies) · Revision #v{audit.revision_number}
        </div>
      </div>

      {/* Deterministic Conflicts */}
      {deterministicItems.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-bold text-rose-700 flex items-center gap-1.5">
            <span>🚫</span>
            <span>MUST FIX IN TALLY BEFORE SUBMISSION ({deterministicItems.length})</span>
          </div>
          <div className="text-[11px] text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
            These are hard mathematical, carton, or weight discrepancies between your Tally invoice
            and Packing List. Re-export your documents and upload them above.
          </div>
          {deterministicItems.map(renderItem)}
        </div>
      )}

      {/* Commercial Variances */}
      {commercialItems.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-bold text-amber-700 flex items-center gap-1.5">
            <span>📋</span>
            <span>COMMERCIAL VARIANCES VS BUYER PO ({commercialItems.length})</span>
          </div>
          {commercialItems.map(renderItem)}
        </div>
      )}

      {/* Compliance Advisories */}
      {advisoryItems.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-bold text-sky-700 flex items-center gap-1.5">
            <span>ℹ️</span>
            <span>COMPLIANCE ADVISORIES ({advisoryItems.length})</span>
          </div>
          {advisoryItems.map(renderItem)}
        </div>
      )}

      {/* Submit Button */}
      <button
        type="button"
        onClick={onSubmitToBuyer}
        disabled={unresolvedCount > 0}
        className={`w-full py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-sm ${
          unresolvedCount > 0
            ? "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed"
            : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md cursor-pointer"
        }`}
      >
        <span>📦</span>
        <span>Submit Verified Revision #v{audit.revision_number} to US Buyer</span>
      </button>
      {unresolvedCount > 0 && (
        <div className="text-[11px] text-rose-700 text-center">
          Fix unresolved conflicts and upload revised documents to unlock packet submission.
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Main Supplier Page
// ────────────────────────────────────────────────────────────────────────────
export default function SupplierUploadPage({
  params,
}: {
  params?: Promise<{ token: string }> | { token: string };
}) {
  const routeParams = useParams();

  const getInitialToken = () => {
    const raw = routeParams?.token;
    if (typeof raw === "string" && raw && raw !== "undefined") return raw;
    if (Array.isArray(raw) && raw[0] && raw[0] !== "undefined") return raw[0];
    if (
      params &&
      "token" in params &&
      typeof (params as any).token === "string" &&
      (params as any).token !== "undefined"
    ) {
      return (params as any).token;
    }
    return "";
  };

  const [token, setToken] = useState<string>(getInitialToken);
  const [audit, setAudit] = useState<AuditResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Sync token from routeParams or async params promise
  useEffect(() => {
    const raw = routeParams?.token;
    const fromRoute = typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : "";
    if (fromRoute && fromRoute !== "undefined") {
      setToken(fromRoute);
      return;
    }

    if (params) {
      if (typeof (params as any).then === "function") {
        (params as Promise<{ token: string }>).then((res) => {
          if (res?.token && res.token !== "undefined") {
            setToken(res.token);
          }
        });
      } else if ((params as any).token && (params as any).token !== "undefined") {
        setToken((params as any).token);
      }
    }
  }, [routeParams, params]);

  const fetchSession = useCallback(async () => {
    if (!token || token === "undefined") return;

    try {
      const res = await fetch(`${API_URL}/api/links/${token}`);
      if (!res.ok) {
        if (res.status === 404) {
          setError(
            "This magic link is invalid or has expired. Please contact your US buyer for a new link."
          );
        } else {
          setError("Failed to load audit session. Please try again.");
        }
        return;
      }
      const data: AuditResponse = await res.json();
      setAudit(data);
    } catch {
      setError("Unable to connect to PortGate. Please check your network connection.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token && token !== "undefined") {
      fetchSession();
    }
  }, [fetchSession, token]);

  // If token is missing after 1.5 seconds, show error
  useEffect(() => {
    if (!token) {
      const timer = setTimeout(() => {
        if (!token) {
          setError("No upload token found in the magic link URL.");
          setLoading(false);
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [token]);

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading || (!token && !error)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-950 flex items-center justify-center">
        <div className="text-white text-center space-y-3">
          <div className="text-4xl animate-spin">⟳</div>
          <div className="text-lg font-semibold">Loading Supplier Portal...</div>
          <div className="text-sm text-indigo-300 font-mono">
            {token || "Validating security token..."}
          </div>
        </div>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (error || !audit) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-rose-950 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full space-y-4 text-center shadow-2xl">
          <div className="text-4xl">🔒</div>
          <div className="text-xl font-bold text-gray-900">Invalid Magic Link</div>
          <div className="text-sm text-gray-600">{error || "Session not found."}</div>
          <div className="font-mono text-xs text-gray-400 bg-gray-50 rounded p-2">{token}</div>
        </div>
      </div>
    );
  }

  // ── Submitted confirmation ────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-emerald-950 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full space-y-5 text-center shadow-2xl">
          <div className="w-16 h-16 bg-emerald-600 rounded-full flex items-center justify-center text-white text-3xl font-bold mx-auto shadow-lg">
            ✓
          </div>
          <div className="text-xl font-bold text-gray-900">Revision Submitted!</div>
          <div className="text-sm text-gray-600 leading-relaxed">
            Your verified shipment packet (Revision #v{audit.revision_number}) has been submitted to
            your US Buyer for final customs filing and broker handoff. No further action is required.
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 text-xs text-emerald-800 font-mono">
            Session Token: {token}
          </div>
          <button
            type="button"
            onClick={() => setSubmitted(false)}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
          >
            ← Back to Revision Portal
          </button>
        </div>
      </div>
    );
  }

  const buyerPO = audit.packet?.buyer_po;
  const exporterName =
    audit.metadata?.exporter_name ||
    audit.packet?.commercial_invoice?.exporter_name ||
    "Supplier";

  return (
    <HighlightProvider>
      <div className="min-h-screen bg-gray-50 font-sans">
        {/* ── Header ── */}
        <header className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-lg sticky top-0 z-30">
          <div className="max-w-6xl mx-auto px-6 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-white tracking-tight">PortGate</span>
                <span className="text-[10px] font-bold bg-indigo-700 text-indigo-100 px-1.5 py-0.5 rounded font-mono">
                  v2.5
                </span>
              </div>
              <div className="h-5 w-px bg-indigo-700" />
              <div className="text-[11px] bg-indigo-700/50 border border-indigo-500 px-2.5 py-1 rounded-full font-semibold tracking-wide">
                🔐 Zero-Login Supplier Portal · Revision Flow
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-xs text-indigo-200 font-mono font-bold truncate max-w-[140px]">
                  {token}
                </div>
                <div className="text-[10px] text-indigo-300">{exporterName}</div>
              </div>
              <div className="font-mono text-xs font-bold bg-indigo-800 text-indigo-100 border border-indigo-600 px-2.5 py-1 rounded-lg">
                Rev #v{audit.revision_number}
              </div>
            </div>
          </div>
        </header>

        {/* ── Main Content ── */}
        <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
          {/* Welcome Banner */}
          <div className="bg-indigo-600 text-white rounded-xl px-5 py-4 flex items-start justify-between gap-4 shadow-sm">
            <div className="space-y-1">
              <div className="font-bold text-base">Welcome, {exporterName}</div>
              <div className="text-indigo-200 text-xs leading-relaxed max-w-2xl">
                Your US Buyer has flagged compliance discrepancies against Purchase Order #
                {audit.metadata?.po_number || audit.packet?.buyer_po?.po_number || "—"}. Please inspect the issues below, re-export your corrected
                Tally Commercial Invoice and Packing List, and submit for instant verification.
              </div>
            </div>
            <div className="bg-indigo-500 rounded-lg px-3 py-2 text-center shrink-0">
              <div className="text-[10px] text-indigo-200 font-semibold uppercase tracking-wider">
                Shipment Ref
              </div>
              <div className="font-mono text-xs font-bold">#{audit.shipment_ref}</div>
            </div>
          </div>

          {/* Locked Buyer PO Reference Card */}
          {buyerPO && (
            <BuyerPOReferenceCard
              po={buyerPO}
              revisionNumber={audit.revision_number}
            />
          )}

          {/* 2-File Revision Dropzone */}
          <RevisionDropzone
            token={token}
            onAuditComplete={(updated) => setAudit(updated)}
            isLoading={isUploading}
            setIsLoading={setIsUploading}
          />

          {/* Discrepancies & Document Inspector Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Left Column: Flagged Discrepancies */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-bold text-gray-900">
                  Pre-Shipment Compliance Checks
                </div>
                <div className="text-xs text-gray-500 font-mono">
                  {audit.items.length} total finding(s)
                </div>
              </div>

              <DiscrepancyList
                audit={audit}
                onSubmitToBuyer={() => setSubmitted(true)}
              />
            </div>

            {/* Right Column: Document Inspector */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex flex-col h-[700px]">
              <div className="bg-gray-100 border-b border-gray-200 px-4 py-2.5 flex items-center justify-between">
                <div className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <span>📄</span>
                  <span>Document Inspector & Field Highlighting</span>
                </div>
                <div className="text-[10px] text-gray-500">
                  Click any check on the left to highlight here
                </div>
              </div>

              <div className="flex-1 overflow-hidden">
                <DocumentViewer data={audit} isFixed={false} />
              </div>
            </div>
          </div>
        </main>

        {/* ── Footer ── */}
        <footer className="border-t border-gray-200 bg-white mt-12 py-4 px-6">
          <div className="max-w-6xl mx-auto flex items-center justify-between text-xs text-gray-400">
            <span>PortGate Pre-Shipment Compliance Engine · India→US Corridor</span>
            <span className="font-mono">Token: {token} · Revision v{audit.revision_number}</span>
          </div>
        </footer>
      </div>
    </HighlightProvider>
  );
}
