"use client";

import React, { useState } from "react";
import type {
  AuditDecisionLogEntry,
  AuditResponse,
  WorkspaceRole,
} from "@/types/audit";
import { useHighlight } from "@/context/HighlightContext";
import { ResolutionBar } from "@/components/ResolutionBar";
import { AuditDecisionTrail } from "@/components/AuditDecisionTrail";

type Phase = "idle" | "run" | "done";

interface AuditSidebarProps {
  data: AuditResponse | null;
  phase: Phase;
  tolerancePct: number;
  setTolerancePct: (pct: number) => void;
  onRunAudit: (mock: boolean) => Promise<void>;
  onUpload: () => void;
  onExport: () => void;
  isFixed: boolean;
  setIsFixed: (fixed: boolean) => void;
  setData: (data: AuditResponse) => void;
  viewMode?: WorkspaceRole;
  decisionTrail?: AuditDecisionLogEntry[];
  onResolveItem?: (
    itemId: string,
    action: "REQUEST_REVISION" | "ACCEPT_VARIANCE" | "ESCALATE_BROKER",
    reasonChip: string,
    note?: string
  ) => void;
  onSubmitSupplierRevision?: (itemId: string) => void;
}

export function AuditSidebar({
  data,
  phase,
  tolerancePct,
  setTolerancePct,
  onRunAudit,
  onUpload,
  onExport,
  isFixed,
  setIsFixed,
  setData,
  viewMode = "BUYER_WORKBENCH",
  decisionTrail = [],
  onResolveItem,
  onSubmitSupplierRevision,
}: AuditSidebarProps) {
  const { setHighlight, setActiveTab } = useHighlight();

  if (phase === "idle") {
    return (
      <div className="h-full overflow-y-auto bg-white p-6 space-y-6">
        {/* Value Proposition */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 space-y-2">
          <div className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <img src="/logo.png" alt="PortGate" className="w-6 h-6 rounded-md shadow-xs object-contain" />
            <span>PortGate Compliance Engine</span>
          </div>
          <div className="text-sm text-gray-700 leading-relaxed">
            Pre-Shipment 3-Way Customs Compliance Engine for the India→US trade corridor. Upload your
            PO, Invoice, and Packing List to run deterministic Rule-1 through Rule-5 audits in
            seconds.
          </div>
          <ul className="text-xs text-gray-600 space-y-1 pl-4">
            <li>✓ 6-digit HS/HTS international root parity</li>
            <li>✓ Unit price & extended line math verification</li>
            <li>✓ Split-shipment PO balance & tolerance</li>
            <li>✓ Net vs gross weight plausibility & carton parity</li>
            <li>✓ Indian export header checks (GSTIN, IEC, LUT ARN)</li>
          </ul>
        </div>

        {/* Tolerance Selector */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Split-Shipment Tolerance (%)
          </label>
          <input
            type="number"
            min="0"
            max="25"
            step="0.1"
            value={tolerancePct}
            onChange={(e) => setTolerancePct(parseFloat(e.target.value) || 5.0)}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="text-xs text-gray-500">
            Quantities within this band emit WARN; above it emit CRIT.
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => onRunAudit(true)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            ⚡ Run Live 3-Way Compliance Audit
          </button>
          <button
            type="button"
            onClick={onUpload}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium py-2 px-4 rounded-lg transition-colors"
          >
            📄 Upload Custom PDF Packet
          </button>
        </div>
      </div>
    );
  }

  if (phase === "run") {
    return (
      <div className="h-full overflow-y-auto bg-gray-900 text-green-400 p-6 font-mono text-sm space-y-2">
        <TerminalLine text="[PortGate] Initializing compliance engine..." delay={0} />
        <TerminalLine text="[PortGate] Uploading 3 PDF documents to Gemini..." delay={500} />
        <TerminalLine text="[PortGate] Extracting structured shipment packet..." delay={1000} />
        <TerminalLine text="[PortGate] Running deterministic Rule-1 through Rule-5..." delay={1500} />
        <TerminalLine text="[PortGate] Awaiting backend response..." delay={2000} />
      </div>
    );
  }

  if (phase === "done" && data) {
    const unresolvedCritical = data.items.filter(
      (it) =>
        it.sev === "crit" &&
        (!it.resolution_state ||
          it.resolution_state === "UNRESOLVED" ||
          it.resolution_state === "REVISION_REQUESTED")
    ).length;

    const isActionRequired =
      unresolvedCritical > 0 ||
      data.summary.status === "ACTION_REQUIRED" ||
      data.summary.status === "BLOCKED";

    const canExport =
      isFixed ||
      (!isActionRequired &&
        (data.summary.status === "CLEARED_WITH_EXCEPTIONS" ||
          data.summary.status === "VERIFIED_CLEAN" ||
          data.summary.status === "CLEAR"));

    const hasRevisionRequested = data.items.some(
      (it) => it.resolution_state === "REVISION_REQUESTED"
    );

    return (
      <div className="h-full overflow-y-auto bg-white p-5 space-y-5">
        {/* Status Summary Banner */}
        <div
          className={`rounded-lg p-4 transition-all ${isActionRequired
              ? "bg-rose-50 border-2 border-rose-600 shadow-sm"
              : data.summary.status === "CLEARED_WITH_EXCEPTIONS"
                ? "bg-amber-50 border-2 border-amber-500 shadow-sm"
                : "bg-emerald-50 border-2 border-emerald-600 shadow-sm"
            }`}
        >
          <div className="flex items-center justify-between">
            <div
              className={`text-lg font-bold ${isActionRequired
                  ? "text-rose-900"
                  : data.summary.status === "CLEARED_WITH_EXCEPTIONS"
                    ? "text-amber-900"
                    : "text-emerald-900"
                }`}
            >
              {isActionRequired
                ? "🚫 ACTION REQUIRED"
                : data.summary.status === "CLEARED_WITH_EXCEPTIONS"
                  ? "⚠️ CLEARED WITH EXCEPTIONS"
                  : "✓ VERIFIED CLEAN"}
            </div>
            <div className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/80 border border-gray-300 text-gray-700">
              {viewMode === "SUPPLIER_PORTAL" ? "Supplier View" : "Buyer View"}
            </div>
          </div>
          <div className="text-xs text-gray-700 mt-1">
            {data.summary.critical_count} critical · {data.summary.warning_count} warning ·{" "}
            {data.summary.passed_count} passed
            {unresolvedCritical === 0 && data.items.length > 0 && (
              <span className="ml-1 text-emerald-700 font-semibold">
                (All discrepancies addressed & logged)
              </span>
            )}
          </div>
        </div>

        {/* Contextual Action Bar */}
        <div className="space-y-2">
          {/* Supplier View: Prompt to submit revision if requested */}
          {viewMode === "SUPPLIER_PORTAL" && hasRevisionRequested && (
            <button
              type="button"
              onClick={() => onSubmitSupplierRevision?.("ALL")}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm text-xs"
            >
              <span>📤</span>
              <span>Submit Corrected Tally Invoice & PL Revision</span>
            </button>
          )}

          {/* Export Action */}
          <button
            type="button"
            onClick={onExport}
            disabled={!canExport}
            className={`w-full font-semibold py-2.5 px-4 rounded-lg transition-all flex items-center justify-center gap-2 text-xs shadow-sm ${canExport
                ? "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                : "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed"
              }`}
          >
            <span>📦</span>
            <span>Export Broker Handoff & ISF Worksheet</span>
          </button>
          {!canExport && (
            <div className="text-[11px] text-gray-500 text-center italic">
              Resolve or sign off on all critical discrepancies to enable broker export.
            </div>
          )}
        </div>

        {/* Discrepancies with Evidence-Backed Resolution Bars */}
        {(data.items || []).length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-gray-700">
              <span>Discrepancies ({(data.items || []).length})</span>
              <span className="text-[11px] font-normal text-gray-500">
                Click line to highlight in docs
              </span>
            </div>

            {(data.items || []).map((item) => {
              const category = item.category || "DETERMINISTIC_CONFLICT";
              const categoryBadge = {
                DETERMINISTIC_CONFLICT: "bg-rose-100 text-rose-800 border-rose-300",
                COMMERCIAL_VARIANCE: "bg-amber-100 text-amber-800 border-amber-300",
                COMPLIANCE_ADVISORY: "bg-sky-100 text-sky-800 border-sky-300",
              }[category] || "bg-gray-100 text-gray-800 border-gray-300";

              const locs: [string, string][] =
                Array.isArray(item.locs) && item.locs.length > 0
                  ? (item.locs as [string, string][])
                  : [["inv", "Invoice"]];
              const cells: string[] = Array.isArray(item.cells)
                ? item.cells
                : Array.isArray(item.highlight_cells)
                  ? item.highlight_cells
                  : [];
              const sev = item.sev || (item.severity === "CRITICAL" ? "crit" : "warn");
              const body = item.body || item.description || "";
              const defaultTab = locs[0]?.[0] || "inv";

              return (
                <div
                  key={item.id}
                  className={`border rounded-lg p-3.5 transition-all shadow-sm ${item.resolution_state === "ACCEPTED_EXCEPTION"
                      ? "border-emerald-300 bg-emerald-50/40"
                      : item.resolution_state === "ESCALATED_TO_BROKER"
                        ? "border-sky-300 bg-sky-50/40"
                        : item.resolution_state === "REVISION_REQUESTED"
                          ? "border-purple-300 bg-purple-50/40"
                          : sev === "crit"
                            ? "border-l-4 border-l-rose-600 border-gray-200 bg-white"
                            : "border-l-4 border-l-amber-500 border-gray-200 bg-white"
                    }`}
                  onClick={() => {
                    setHighlight(item.id, cells, sev, defaultTab);
                    setActiveTab(defaultTab);
                  }}
                >
                  <div className="space-y-1.5">
                    {/* Header Row: ID, Severity, Category */}
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${sev === "crit"
                              ? "bg-rose-600 text-white"
                              : "bg-amber-500 text-white"
                            }`}
                        >
                          {item.id}
                        </span>
                        <span
                          className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${categoryBadge}`}
                        >
                          {category.replace(/_/g, " ")}
                        </span>
                      </div>
                    </div>

                    {/* Title */}
                    <div className="text-xs font-semibold text-gray-900 leading-snug">
                      {item.title}
                    </div>

                    {/* Body */}
                    <div className="text-[11px] text-gray-600 line-clamp-2 leading-relaxed">
                      {body}
                    </div>

                    {/* Document Location Tabs */}
                    <div className="flex flex-wrap gap-1 pt-1">
                      {locs.map(([key, label], idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveTab(key);
                            setHighlight(item.id, cells, sev, key);
                          }}
                          className="text-[10px] bg-white border border-gray-300 hover:bg-gray-50 px-1.5 py-0.5 rounded text-gray-700 transition-colors"
                        >
                          🔍 {label}
                        </button>
                      ))}
                    </div>

                    {/* The Evidence-Backed Resolution Bar */}
                    <div onClick={(e) => e.stopPropagation()}>
                      <ResolutionBar
                        item={item}
                        viewMode={viewMode}
                        onResolve={(action, chip, note) => {
                          onResolveItem?.(item.id, action, chip, note);
                        }}
                        onSubmitSupplierRevision={onSubmitSupplierRevision}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Audit Decision Trail Component */}
        <AuditDecisionTrail decisions={decisionTrail} />

        {/* Passed Checks */}
        {data.passed.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-bold text-gray-700 flex items-center justify-between">
              <span>Passed Checks ({data.passed.length})</span>
              <span className="text-[10px] text-emerald-600 font-normal">All Rules Validated</span>
            </div>
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-3 space-y-1.5 max-h-48 overflow-y-auto">
              {data.passed.map((check, idx) => (
                <div key={idx} className="text-[11px] text-emerald-900 flex items-start gap-1.5">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>{check}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}

// Terminal animation component
function TerminalLine({ text, delay }: { text: string; delay: number }) {
  const [show, setShow] = useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  if (!show) return null;
  return <div className="animate-pulse">{text}</div>;
}
