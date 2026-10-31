"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import type {
  BuyerPO,
  MagicLinkAuditResponse,
  MagicLinkDiscrepancy,
  MagicLinkSession,
  ResolutionState,
  SubmissionStatus,
} from "@/types/audit";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ────────────────────────────────────────────────────────────────────────────
// Category styling
// ────────────────────────────────────────────────────────────────────────────
const CATEGORY_STYLE = {
  DETERMINISTIC_CONFLICT: {
    border: "border-l-4 border-l-rose-600 border-gray-200",
    badge: "bg-rose-100 text-rose-800 border-rose-300",
    label: "Must Fix in Tally Before Submission",
    icon: "🚫",
  },
  COMMERCIAL_VARIANCE: {
    border: "border-l-4 border-l-amber-500 border-gray-200",
    badge: "bg-amber-100 text-amber-800 border-amber-300",
    label: "Submit Variance with Evidence",
    icon: "⚠️",
  },
  COMPLIANCE_ADVISORY: {
    border: "border-l-4 border-l-sky-500 border-gray-200",
    badge: "bg-sky-100 text-sky-800 border-sky-300",
    label: "Compliance Advisory",
    icon: "ℹ️",
  },
};

// ────────────────────────────────────────────────────────────────────────────
// Locked Buyer PO Reference Card
// ────────────────────────────────────────────────────────────────────────────
function BuyerPOReferenceCard({ po }: { po: BuyerPO }) {
  return (
    <div className="bg-white border-2 border-blue-200 rounded-xl p-5 space-y-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-sm font-bold shadow">
            🇺🇸
          </div>
          <div>
            <div className="text-sm font-bold text-blue-900">Locked Buyer PO Reference</div>
            <div className="text-[11px] text-blue-600">Pre-loaded by US Buyer · Read-Only</div>
          </div>
        </div>
        <div className="font-mono text-xs font-bold text-blue-800 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg">
          {po.po_number}
        </div>
      </div>

      {/* PO Metadata */}
      <div className="grid grid-cols-3 gap-3 text-xs">
        <div className="bg-gray-50 rounded-lg p-2.5">
          <div className="text-gray-500 text-[10px] font-semibold uppercase tracking-wider mb-1">
            Buyer
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
            PO Value
          </div>
          <div className="font-semibold text-gray-900">
            ${po.total_po_value_usd.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Line Items */}
      <div>
        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">
          PO Line Items (Your Invoice Must Cover These)
        </div>
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-2.5 py-1.5 text-gray-600 font-semibold">#</th>
                <th className="px-2.5 py-1.5 text-gray-600 font-semibold">Description</th>
                <th className="px-2.5 py-1.5 text-gray-600 font-semibold">HTS</th>
                <th className="px-2.5 py-1.5 text-gray-600 font-semibold text-right">Qty</th>
                <th className="px-2.5 py-1.5 text-gray-600 font-semibold text-right">
                  Unit Price
                </th>
              </tr>
            </thead>
            <tbody>
              {po.line_items.map((line) => (
                <tr key={line.line_no} className="border-t border-gray-100">
                  <td className="px-2.5 py-1.5 text-gray-500">{line.line_no}</td>
                  <td className="px-2.5 py-1.5 text-gray-900">{line.description}</td>
                  <td className="px-2.5 py-1.5 font-mono text-gray-700">{line.hts_code}</td>
                  <td className="px-2.5 py-1.5 text-right text-gray-900">
                    {line.quantity.toLocaleString()} {line.uom}
                  </td>
                  <td className="px-2.5 py-1.5 text-right font-semibold text-gray-900">
                    ${line.unit_price_usd.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-800">
        <span className="font-semibold">What you need to upload:</span> Your Tally Commercial
        Invoice PDF + Packing List PDF. The PO above is pre-loaded — you do{" "}
        <span className="font-bold">not</span> need to upload a PO document.
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Supplier Upload Card
// ────────────────────────────────────────────────────────────────────────────
type SimVersion = "v1_broken" | "v2_revised";

interface SupplierUploadCardProps {
  token: string;
  onAuditComplete: (audit: MagicLinkAuditResponse) => void;
  isLoading: boolean;
  setIsLoading: (v: boolean) => void;
}

function SupplierUploadCard({
  token,
  onAuditComplete,
  isLoading,
  setIsLoading,
}: SupplierUploadCardProps) {
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [plFile, setPlFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleSimulate = async (version: SimVersion) => {
    setIsLoading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append("version", version);
      const res = await fetch(`${API_URL}/api/links/${token}/simulate-upload`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Simulation failed");
      }
      const audit: MagicLinkAuditResponse = await res.json();
      onAuditComplete(audit);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRealUpload = async () => {
    if (!invoiceFile || !plFile) {
      setUploadError("Please select both files before submitting.");
      return;
    }
    setIsLoading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append("invoice_file", invoiceFile);
      formData.append("packing_list_file", plFile);
      const res = await fetch(`${API_URL}/api/links/${token}/audit-files`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Upload failed");
      }
      const audit: MagicLinkAuditResponse = await res.json();
      onAuditComplete(audit);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="text-sm font-bold text-gray-900">📤 Upload Your Documents</div>
        <div className="text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded font-mono">
          2 files required
        </div>
      </div>

      {/* Quick test buttons */}
      <div className="border border-dashed border-indigo-200 bg-indigo-50/50 rounded-lg p-3 space-y-2">
        <div className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">
          Quick Test (No PDF required)
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleSimulate("v1_broken")}
            disabled={isLoading}
            className="flex-1 bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-300 font-semibold py-2 px-3 rounded-lg transition-colors text-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <span>⚠️</span>
            <span>Load Sample Tally Upload v1</span>
            <span className="text-[10px] font-normal opacity-70">(with errors)</span>
          </button>
          <button
            type="button"
            onClick={() => handleSimulate("v2_revised")}
            disabled={isLoading}
            className="flex-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300 font-semibold py-2 px-3 rounded-lg transition-colors text-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <span>✓</span>
            <span>Load Corrected Tally Upload v2</span>
            <span className="text-[10px] font-normal opacity-70">(clean)</span>
          </button>
        </div>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-2">
        <div className="flex-1 border-t border-gray-200" />
        <span className="text-[11px] text-gray-400 font-medium">or upload real PDFs</span>
        <div className="flex-1 border-t border-gray-200" />
      </div>

      {/* File inputs */}
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Commercial Invoice PDF (Tally Prime)
          </label>
          <input
            type="file"
            accept=".pdf,application/pdf"
            onChange={(e) => setInvoiceFile(e.target.files?.[0] ?? null)}
            className="w-full text-xs text-gray-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border border-gray-300 rounded-lg p-1"
          />
          {invoiceFile && (
            <div className="text-[11px] text-emerald-700 mt-1">✓ {invoiceFile.name}</div>
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
            className="w-full text-xs text-gray-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border border-gray-300 rounded-lg p-1"
          />
          {plFile && (
            <div className="text-[11px] text-emerald-700 mt-1">✓ {plFile.name}</div>
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
        onClick={handleRealUpload}
        disabled={!invoiceFile || !plFile || isLoading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors text-sm flex items-center justify-center gap-2 shadow-sm"
      >
        {isLoading ? (
          <>
            <span className="animate-spin">⟳</span>
            <span>Running Audit...</span>
          </>
        ) : (
          <>
            <span>🔍</span>
            <span>Run Pre-Shipment Audit</span>
          </>
        )}
      </button>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Supplier Discrepancy Queue
// ────────────────────────────────────────────────────────────────────────────
interface DiscrepancyQueueProps {
  audit: MagicLinkAuditResponse;
  token: string;
  onResolved: (updated: MagicLinkAuditResponse) => void;
  onSubmitTobuyer: () => void;
}

function DiscrepancyQueue({ audit, token, onResolved, onSubmitTobuyer }: DiscrepancyQueueProps) {
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [evidenceChips, setEvidenceChips] = useState<Record<string, string>>({});

  const deterministicItems = audit.discrepancies.filter(
    (d) => d.category === "DETERMINISTIC_CONFLICT"
  );
  const commercialItems = audit.discrepancies.filter(
    (d) => d.category === "COMMERCIAL_VARIANCE"
  );
  const advisoryItems = audit.discrepancies.filter(
    (d) => d.category === "COMPLIANCE_ADVISORY"
  );

  const unresolvedDeterministic = deterministicItems.filter(
    (d) => d.resolution_state === "UNRESOLVED"
  ).length;

  const handleSubmitVariance = async (discrepancyId: string) => {
    setSubmitting(discrepancyId);
    try {
      const res = await fetch(
        `${API_URL}/api/links/${token}/discrepancies/${discrepancyId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            resolution_state: "ACCEPTED_EXCEPTION",
            resolution_reason_chip: evidenceChips[discrepancyId] || "Supplier Evidence Attached",
            resolution_note: notes[discrepancyId] || "",
            actor_role: "SUPPLIER_PORTAL",
          }),
        }
      );
      if (res.ok) {
        const updated: MagicLinkAuditResponse = await res.json();
        onResolved(updated);
      }
    } finally {
      setSubmitting(null);
    }
  };

  const renderDiscrepancy = (disc: MagicLinkDiscrepancy) => {
    const cat = CATEGORY_STYLE[disc.category] || CATEGORY_STYLE.COMPLIANCE_ADVISORY;
    const isDeterministic = disc.category === "DETERMINISTIC_CONFLICT";
    const isResolved = disc.resolution_state !== "UNRESOLVED";

    return (
      <div
        key={disc.id}
        className={`rounded-lg p-4 shadow-sm bg-white ${
          isResolved ? "border border-emerald-300 bg-emerald-50/30" : cat.border
        } space-y-3`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  disc.severity === "CRITICAL"
                    ? "bg-rose-600 text-white"
                    : "bg-amber-500 text-white"
                }`}
              >
                {disc.id}
              </span>
              <span
                className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${cat.badge}`}
              >
                {cat.icon} {cat.label}
              </span>
              {isResolved && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                  ✓ Submitted
                </span>
              )}
            </div>
            <div className="text-xs font-semibold text-gray-900">{disc.title}</div>
          </div>
        </div>

        {/* Description */}
        <div className="text-[11px] text-gray-600 leading-relaxed">{disc.description}</div>

        {/* Source Values */}
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="bg-gray-50 rounded px-2.5 py-1.5 border border-gray-200">
            <div className="text-gray-400 text-[10px] font-semibold">{disc.source_doc_a}</div>
            <div className="font-mono font-bold text-gray-800">{disc.source_val_a}</div>
          </div>
          <div
            className={`rounded px-2.5 py-1.5 border ${
              isDeterministic
                ? "bg-rose-50 border-rose-200"
                : "bg-amber-50 border-amber-200"
            }`}
          >
            <div className="text-gray-400 text-[10px] font-semibold">{disc.source_doc_b}</div>
            <div className="font-mono font-bold text-gray-800">{disc.source_val_b}</div>
          </div>
        </div>

        {/* Recommended Actions */}
        {disc.recommended_actions.length > 0 && (
          <div className="space-y-1">
            {disc.recommended_actions.map((action, idx) => (
              <div
                key={idx}
                className={`text-[11px] flex items-start gap-1.5 ${
                  isDeterministic ? "text-rose-800" : "text-amber-800"
                }`}
              >
                <span className="font-bold mt-0.5">{isDeterministic ? "🔧" : "📋"}</span>
                <span>{action}</span>
              </div>
            ))}
          </div>
        )}

        {/* Financial Impact */}
        {disc.financial_impact_note && (
          <div className="text-[11px] text-indigo-800 bg-indigo-50 border border-indigo-200 rounded px-2.5 py-1.5">
            💰 {disc.financial_impact_note}
          </div>
        )}

        {/* For COMMERCIAL_VARIANCE: let supplier attach evidence and submit */}
        {!isDeterministic && !isResolved && (
          <div className="space-y-2 pt-1 border-t border-gray-100">
            <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
              Attach Evidence & Submit Variance
            </div>
            <div className="flex gap-2">
              {["Buyer PO Amendment Attached", "Approved via Email Thread", "Within Agreed Tolerance"].map(
                (chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setEvidenceChips((prev) => ({ ...prev, [disc.id]: chip }))}
                    className={`text-[10px] px-2 py-1 rounded border transition-all ${
                      evidenceChips[disc.id] === chip
                        ? "bg-indigo-600 text-white border-indigo-700"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {chip}
                  </button>
                )
              )}
            </div>
            <input
              type="text"
              placeholder="Optional: reference document, email, or note..."
              value={notes[disc.id] || ""}
              onChange={(e) => setNotes((prev) => ({ ...prev, [disc.id]: e.target.value }))}
              className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <button
              type="button"
              onClick={() => handleSubmitVariance(disc.id)}
              disabled={submitting === disc.id}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-1.5 px-3 rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              {submitting === disc.id ? (
                <span className="animate-spin">⟳</span>
              ) : (
                <span>📤</span>
              )}
              <span>Submit Variance with Evidence</span>
            </button>
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
          audit.summary.unresolved_count > 0
            ? "bg-rose-50 border-rose-500"
            : audit.summary.total_findings > 0
            ? "bg-amber-50 border-amber-400"
            : "bg-emerald-50 border-emerald-500"
        }`}
      >
        <div
          className={`text-sm font-bold ${
            audit.summary.unresolved_count > 0
              ? "text-rose-900"
              : audit.summary.total_findings > 0
              ? "text-amber-900"
              : "text-emerald-900"
          }`}
        >
          {audit.summary.unresolved_count > 0
            ? `🚫 ${audit.summary.unresolved_count} issue(s) require your attention`
            : audit.summary.total_findings > 0
            ? "⚠️ Variances noted — ready to submit with evidence"
            : "✓ All checks passed — packet is clean"}
        </div>
        <div className="text-xs text-gray-600 mt-1">
          {audit.summary.deterministic_conflicts} deterministic conflict(s) ·{" "}
          {audit.summary.commercial_variances} commercial variance(s) ·{" "}
          {audit.summary.compliance_advisories} advisory(ies)
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
            These are hard mathematical or document-sync conflicts. Your Tally invoice or Packing
            List must be corrected and re-exported before submission.
          </div>
          {deterministicItems.map(renderDiscrepancy)}
        </div>
      )}

      {/* Commercial Variances */}
      {commercialItems.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-bold text-amber-700 flex items-center gap-1.5">
            <span>📋</span>
            <span>COMMERCIAL VARIANCES — ATTACH EVIDENCE ({commercialItems.length})</span>
          </div>
          {commercialItems.map(renderDiscrepancy)}
        </div>
      )}

      {/* Compliance Advisories */}
      {advisoryItems.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-bold text-sky-700 flex items-center gap-1.5">
            <span>ℹ️</span>
            <span>COMPLIANCE ADVISORIES ({advisoryItems.length})</span>
          </div>
          {advisoryItems.map(renderDiscrepancy)}
        </div>
      )}

      {/* Submit to Buyer button */}
      <button
        type="button"
        onClick={onSubmitTobuyer}
        disabled={unresolvedDeterministic > 0}
        className={`w-full py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-sm ${
          unresolvedDeterministic > 0
            ? "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed"
            : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md"
        }`}
      >
        <span>📦</span>
        <span>Submit Verified Packet to US Buyer</span>
      </button>
      {unresolvedDeterministic > 0 && (
        <div className="text-[11px] text-rose-700 text-center">
          Fix all {unresolvedDeterministic} deterministic conflict(s) in Tally before submitting.
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

  // Safely extract token from routeParams or params Promise/object across all Next.js versions
  const getInitialToken = () => {
    const raw = routeParams?.token;
    if (typeof raw === "string" && raw && raw !== "undefined") return raw;
    if (Array.isArray(raw) && raw[0] && raw[0] !== "undefined") return raw[0];
    if (params && "token" in params && typeof (params as any).token === "string" && (params as any).token !== "undefined") {
      return (params as any).token;
    }
    return "";
  };

  const [token, setToken] = useState<string>(getInitialToken);
  const [session, setSession] = useState<MagicLinkSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [audit, setAudit] = useState<MagicLinkAuditResponse | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Sync token when routeParams or async params promise resolves
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
    if (!token || token === "undefined") {
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/links/${token}`);
      if (!res.ok) {
        if (res.status === 404) {
          setError("This magic link is invalid or has expired. Please contact your US buyer for a new link.");
        } else {
          setError("Failed to load session. Please try again.");
        }
        return;
      }
      const data: MagicLinkSession = await res.json();
      setSession(data);
      if (data.latest_audit) {
        setAudit(data.latest_audit);
      }
    } catch {
      setError("Unable to connect to PortGate. Please check your connection.");
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

  const handleAuditComplete = (auditResult: MagicLinkAuditResponse) => {
    setAudit(auditResult);
  };

  const handleDiscrepancyResolved = (updated: MagicLinkAuditResponse) => {
    setAudit(updated);
  };

  const handleSubmitToBuyer = () => {
    setSubmitted(true);
  };

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading || (!token && !error)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-950 flex items-center justify-center">
        <div className="text-white text-center space-y-3">
          <div className="text-4xl animate-spin">⟳</div>
          <div className="text-lg font-semibold">Loading Supplier Portal...</div>
          <div className="text-sm text-indigo-300 font-mono">{token || "Validating security token..."}</div>
        </div>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (error || !session) {
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
          <div className="text-xl font-bold text-gray-900">Packet Submitted!</div>
          <div className="text-sm text-gray-600 leading-relaxed">
            Your verified shipment packet has been sent to the US buyer for final review and broker
            handoff. No further action is required.
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 text-xs text-emerald-800 font-mono">
            Token: {token}
          </div>
          <div className="text-xs text-gray-500">
            The buyer will contact you if any further revisions are needed.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* ── Header ── */}
      <header className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-lg">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-white tracking-tight">PortGate</span>
              <span className="text-[10px] font-bold bg-indigo-700 text-indigo-100 px-1.5 py-0.5 rounded font-mono">
                v2.5
              </span>
            </div>
            <div className="h-5 w-px bg-indigo-700" />
            <div className="text-[11px] bg-indigo-700/50 border border-indigo-500 px-2.5 py-1 rounded-full font-semibold tracking-wide">
              🔐 Zero-Login Supplier Portal · Verified Magic Link
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-indigo-300 font-mono">{token}</div>
            <div className="text-[10px] text-indigo-400">
              {session.exporter_name}
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Welcome Banner */}
        <div className="bg-indigo-600 text-white rounded-xl px-5 py-4 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="font-bold text-base">Welcome, {session.exporter_name}</div>
            <div className="text-indigo-200 text-sm">
              Your US buyer has sent you a pre-loaded Purchase Order. Upload your Tally Commercial
              Invoice and Packing List to run the pre-shipment compliance audit.
            </div>
          </div>
          <div className="bg-indigo-500 rounded-lg px-3 py-2 text-center shrink-0">
            <div className="text-[10px] text-indigo-200 font-semibold uppercase tracking-wider">
              Shipment
            </div>
            <div className="font-mono text-xs font-bold">{session.shipment_id}</div>
          </div>
        </div>

        {/* Locked Buyer PO Reference Card */}
        <BuyerPOReferenceCard po={session.buyer_po} />

        {/* Upload Card */}
        {!audit && (
          <SupplierUploadCard
            token={token}
            onAuditComplete={handleAuditComplete}
            isLoading={isUploading}
            setIsLoading={setIsUploading}
          />
        )}

        {/* Re-upload option if audit already ran */}
        {audit && (
          <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3">
            <div className="text-xs text-gray-600">
              Audit ran on:{" "}
              <span className="font-semibold">{session.latest_audit?.packet?.commercial_invoice?.invoice_number ?? "Latest upload"}</span>
            </div>
            <button
              type="button"
              onClick={() => setAudit(null)}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              ↺ Upload Different Files
            </button>
          </div>
        )}

        {/* Discrepancy Queue (shown after audit runs) */}
        {audit && (
          <div className="space-y-3">
            <div className="text-sm font-bold text-gray-900">
              Pre-Shipment Audit Results
            </div>
            {audit.discrepancies.length === 0 ? (
              <div className="bg-emerald-50 border-2 border-emerald-500 rounded-xl p-6 text-center space-y-2">
                <div className="text-3xl">✅</div>
                <div className="font-bold text-emerald-900 text-lg">All Checks Passed!</div>
                <div className="text-sm text-emerald-700">
                  Your Tally Invoice and Packing List are fully aligned with the Buyer PO. No
                  discrepancies found.
                </div>
                <button
                  type="button"
                  onClick={handleSubmitToBuyer}
                  className="mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-xl text-sm transition-colors shadow-sm flex items-center gap-2 mx-auto"
                >
                  <span>📦</span>
                  <span>Submit Verified Packet to US Buyer</span>
                </button>
              </div>
            ) : (
              <DiscrepancyQueue
                audit={audit}
                token={token}
                onResolved={handleDiscrepancyResolved}
                onSubmitTobuyer={handleSubmitToBuyer}
              />
            )}
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-200 bg-white mt-12 py-4 px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between text-xs text-gray-400">
          <span>PortGate Pre-Shipment Compliance Engine · India→US Corridor</span>
          <span className="font-mono">Token: {token}</span>
        </div>
      </footer>
    </div>
  );
}

