"use client";

import React from "react";
import {
  AlertOctagon,
  ShieldCheck,
  AlertTriangle,
  FileSpreadsheet,
  Clock,
} from "lucide-react";
import type { AuditResponse, WorkspaceRole } from "@/lib/types";

interface AuditSummaryCardProps {
  data: AuditResponse;
  viewMode: WorkspaceRole;
  onExport: () => void;
  onSubmitSupplierRevision?: (itemId: string) => void;
}

export function AuditSummaryCard({
  data,
  viewMode,
  onExport,
  onSubmitSupplierRevision,
}: AuditSummaryCardProps) {
  const summary = data.summary;
  const status = summary?.status || "ACTION_REQUIRED";
  const items = data.items || [];

  const unresolvedCritical = items.filter(
    (it) =>
      (it.sev === "crit" || it.severity === "CRITICAL") &&
      (!it.resolution_state ||
        it.resolution_state === "UNRESOLVED" ||
        it.resolution_state === "REVISION_REQUESTED")
  ).length;

  const unresolvedWarning = items.filter(
    (it) =>
      (it.sev === "warn" || it.severity === "WARNING") &&
      (!it.resolution_state ||
        it.resolution_state === "UNRESOLVED" ||
        it.resolution_state === "REVISION_REQUESTED")
  ).length;

  const hasRevisionRequested = items.some(
    (it) => it.resolution_state === "REVISION_REQUESTED"
  );

  const canExport = unresolvedCritical === 0;

  const isAwaiting = status === "AWAITING_SUPPLIER_REVISION" || Boolean(data.reopened_for_revision);
  const isBlocked =
    !isAwaiting &&
    (status === "ACTION_REQUIRED" ||
      status === "BLOCKED" ||
      unresolvedCritical > 0 ||
      unresolvedWarning > 0);

  return (
    <div className="p-4 border-b border-slate-200 bg-white space-y-3.5 select-none">
      {/* Top Status Banner */}
      <div
        className={`p-3.5 rounded-xl border transition-all ${
          isBlocked
            ? "bg-rose-50/70 border-rose-200 text-rose-900"
            : isAwaiting
            ? "bg-amber-50/70 border-amber-200 text-amber-900"
            : "bg-emerald-50/70 border-emerald-200 text-emerald-900"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xs">
            {isBlocked ? (
              <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0" strokeWidth={2} />
            ) : isAwaiting ? (
              <Clock className="w-4 h-4 text-amber-600 shrink-0" strokeWidth={2} />
            ) : (
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" strokeWidth={2} />
            )}
            <span>{isAwaiting ? "AWAITING SUPPLIER REVISION" : status.replace(/_/g, " ")}</span>
          </div>

          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/80 border border-slate-200 text-slate-600 font-semibold">
            {viewMode === "SUPPLIER_PORTAL" ? "Supplier View" : "Buyer View"}
          </span>
        </div>

        {/* Metrics Bar */}
        <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] font-mono">
          <span className="font-semibold text-rose-700">
            {unresolvedCritical} critical
          </span>
          <span className="text-slate-300">·</span>
          <span className="font-semibold text-amber-700">
            {unresolvedWarning} warning
          </span>
          <span className="text-slate-300">·</span>
          <span className="font-semibold text-emerald-700">
            {summary.passed_count || data.passed?.length || 0} passed
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2">
        {/* Supplier View Submit Corrected Doc CTA */}
        {viewMode === "SUPPLIER_PORTAL" && hasRevisionRequested && (
          <button
            type="button"
            onClick={() => onSubmitSupplierRevision?.("ALL")}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-3.5 rounded-lg transition-colors text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer"
          >
            <span>Submit Corrected Revision</span>
          </button>
        )}

        {/* Export Broker Worksheet CTA */}
        <button
          type="button"
          onClick={onExport}
          disabled={!canExport}
          className={`w-full font-medium py-2.5 px-3.5 rounded-lg transition-all text-xs flex items-center justify-center gap-2 shadow-xs ${
            canExport
              ? "bg-slate-900 hover:bg-slate-800 text-white cursor-pointer"
              : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 shrink-0" strokeWidth={1.75} />
          <span>Export Broker Worksheet & ISF Schedule</span>
        </button>

        {!canExport && (
          <p className="text-[11px] text-slate-500 text-center leading-normal">
            Resolve or sign off on all critical discrepancies to enable broker export.
          </p>
        )}
      </div>
    </div>
  );
}

