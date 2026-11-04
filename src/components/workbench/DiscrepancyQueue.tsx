"use client";

import React, { useState, useEffect } from "react";
import { CheckCircle2, Filter } from "lucide-react";
import { DiscrepancyCard } from "./DiscrepancyCard";
import { useHighlight } from "@/context/HighlightContext";
import type {
  AuditResponse,
  DiscrepancyItem,
  WorkspaceRole,
} from "@/lib/types";

interface DiscrepancyQueueProps {
  data: AuditResponse;
  viewMode: WorkspaceRole;
  onResolveItem?: (
    itemId: string,
    action: "REQUEST_REVISION" | "ACCEPT_VARIANCE" | "ESCALATE_BROKER",
    reasonChip: string,
    note?: string
  ) => void;
  onSubmitSupplierRevision?: (itemId: string) => void;
}

export function DiscrepancyQueue({
  data,
  viewMode,
  onResolveItem,
  onSubmitSupplierRevision,
}: DiscrepancyQueueProps) {
  const { setHighlight, setActiveTab, activeId } = useHighlight();

  const items = data.items || [];

  const isUnresolved = (it: DiscrepancyItem) =>
    !it.resolution_state ||
    it.resolution_state === "UNRESOLVED" ||
    it.resolution_state === "REVISION_REQUESTED";

  const isResolved = (it: DiscrepancyItem) =>
    Boolean(
      it.resolution_state &&
      it.resolution_state !== "UNRESOLVED" &&
      it.resolution_state !== "REVISION_REQUESTED"
    );

  const unresolvedItems = items.filter(isUnresolved);
  const criticalItems = unresolvedItems.filter(
    (it) => it.sev === "crit" || it.severity === "CRITICAL"
  );
  const warningItems = unresolvedItems.filter(
    (it) => it.sev === "warn" || it.severity === "WARNING"
  );
  const resolvedItems = items.filter(isResolved);

  const [filter, setFilter] = useState<"ALL" | "CRITICAL" | "WARNING" | "RESOLVED">(() => {
    const hasUnresolved = (data.items || []).some(
      (it) => !it.resolution_state || it.resolution_state === "UNRESOLVED" || it.resolution_state === "REVISION_REQUESTED"
    );
    return hasUnresolved ? "ALL" : "RESOLVED";
  });

  // When all discrepancies are resolved, auto-switch to RESOLVED tab so exceptions & sign-offs are immediately visible
  useEffect(() => {
    if (unresolvedItems.length === 0 && resolvedItems.length > 0 && filter === "ALL") {
      setFilter("RESOLVED");
    }
  }, [unresolvedItems.length, resolvedItems.length, filter]);

  const filteredItems = items.filter((item) => {
    if (filter === "CRITICAL") return isUnresolved(item) && (item.sev === "crit" || item.severity === "CRITICAL");
    if (filter === "WARNING") return isUnresolved(item) && (item.sev === "warn" || item.severity === "WARNING");
    if (filter === "RESOLVED") return isResolved(item);
    return isUnresolved(item);
  });

  const handleCardClick = (item: DiscrepancyItem) => {
    const defaultTab = item.locs?.[0]?.[0] || "inv";
    const cells = item.cells || item.highlight_cells || [];
    const sev = item.sev || (item.severity === "CRITICAL" ? "crit" : "warn");
    setHighlight(item.id, cells, sev, defaultTab);
    setActiveTab(defaultTab);
  };

  const handleJumpToDoc = (item: DiscrepancyItem, tabKey: string) => {
    const cells = item.cells || item.highlight_cells || [];
    const sev = item.sev || (item.severity === "CRITICAL" ? "crit" : "warn");
    setHighlight(item.id, cells, sev, tabKey);
    setActiveTab(tabKey);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/50">
      {/* Filter Tabs Bar */}
      <div className="p-3 border-b border-slate-200 bg-white flex items-center justify-between text-xs select-none">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setFilter("ALL")}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${filter === "ALL"
              ? "bg-slate-900 text-white font-semibold"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
          >
            All ({unresolvedItems.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("CRITICAL")}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${filter === "CRITICAL"
              ? "bg-rose-600 text-white font-semibold"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
          >
            Critical ({criticalItems.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("WARNING")}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${filter === "WARNING"
              ? "bg-amber-600 text-white font-semibold"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
          >
            Warning ({warningItems.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("RESOLVED")}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${filter === "RESOLVED"
              ? "bg-emerald-700 text-white font-semibold"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
          >
            Resolved ({resolvedItems.length})
          </button>
        </div>
      </div>

      {/* Discrepancy Cards List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Diff Banner: What Changed in Rev vX */}
        {data.revision_number > 1 && (data.auto_resolved_in_latest_rev?.length ?? 0) > 0 && (
          <div className="px-3.5 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-2 shadow-2xs">
            <div className="flex items-center gap-1.5 whitespace-nowrap min-w-0">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" strokeWidth={2} />
              <span className="text-xs font-semibold text-emerald-900 whitespace-nowrap">
                Rev v{data.revision_number}: {data.auto_resolved_in_latest_rev?.length} conflict{data.auto_resolved_in_latest_rev!.length > 1 ? "s" : ""} cleared by supplier
              </span>
            </div>
            {filter !== "RESOLVED" && (
              <button
                type="button"
                onClick={() => setFilter("RESOLVED")}
                className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 hover:underline shrink-0 whitespace-nowrap cursor-pointer"
              >
                View in Resolved &rarr;
              </button>
            )}
          </div>
        )}
        {filteredItems.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-center p-6 bg-white rounded-xl border border-dashed border-slate-300">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2 shrink-0" strokeWidth={1.75} />
            <h4 className="text-xs font-semibold text-slate-800">
              No Discrepancies In Queue
            </h4>
            <p className="text-[11px] text-slate-500 max-w-xs mt-1">
              {filter === "RESOLVED"
                ? "No signed-off resolutions recorded yet."
                : resolvedItems.length > 0
                  ? `All ${resolvedItems.length} discrepancies have been resolved or cleared.`
                  : "All checks in this category have passed verification."}
            </p>
            {resolvedItems.length > 0 && filter === "ALL" && (
              <button
                type="button"
                onClick={() => setFilter("RESOLVED")}
                className="mt-3 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors cursor-pointer"
              >
                View Resolved Items ({resolvedItems.length}) &rarr;
              </button>
            )}
          </div>
        ) : (
          filteredItems.map((item) => (
            <DiscrepancyCard
              key={item.id}
              item={item}
              viewMode={viewMode}
              isActive={activeId === item.id}
              onSelect={() => handleCardClick(item)}
              onJumpToDoc={(tabKey) => handleJumpToDoc(item, tabKey)}
              onResolve={(action, chip, note) => {
                onResolveItem?.(item.id, action, chip, note);
              }}
              onSubmitSupplierRevision={onSubmitSupplierRevision}
            />
          ))
        )}
      </div>
    </div>
  );
}

