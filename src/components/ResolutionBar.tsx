"use client";

import React, { useState } from "react";
import type {
  DiscrepancyItem,
  FindingCategory,
  ResolutionState,
  WorkspaceRole,
} from "@/types/audit";

interface ResolutionBarProps {
  item: DiscrepancyItem;
  viewMode: WorkspaceRole;
  onResolve: (
    action: "REQUEST_REVISION" | "ACCEPT_VARIANCE" | "ESCALATE_BROKER",
    reasonChip: string,
    note?: string
  ) => void;
  onSubmitSupplierRevision?: (itemId: string) => void;
}

export const RESOLUTION_REASON_CHIPS: Record<
  "REQUEST_REVISION" | "ACCEPT_VARIANCE" | "ESCALATE_BROKER",
  string[]
> = {
  REQUEST_REVISION: [
    "Tally Typo — Requesting Invoice Correction",
    "Packing List Mistally — Requesting Updated PL",
    "Physical Scale Re-Weigh Pending",
    "Missing LUT ARN Reference on Header",
  ],
  ACCEPT_VARIANCE: [
    "Approved via Buyer PO Amendment #2",
    "Authorized Split-Shipment Overage (+2.5%)",
    "Agreed Seasonal Surcharge Pre-Approved via Email",
    "Exchange Rate Buffer Accepted (<1%)",
    "Binding CBP Classification Ruling on File",
  ],
  ESCALATE_BROKER: [
    "Escalate to Licensed US Customs Broker",
    "Request Binding Ruling (19 CFR §177)",
    "WCO Chapter 61 vs 62 Subheading Review Required",
    "Duty Rate Impact & Liquidated Damages Assessment",
  ],
};

export function ResolutionBar({
  item,
  viewMode,
  onResolve,
  onSubmitSupplierRevision,
}: ResolutionBarProps) {
  const [activeAction, setActiveAction] = useState<
    "REQUEST_REVISION" | "ACCEPT_VARIANCE" | "ESCALATE_BROKER" | null
  >(null);
  const [selectedChip, setSelectedChip] = useState<string>("");
  const [note, setNote] = useState<string>("");

  const state = item.resolution_state || "UNRESOLVED";

  // If already resolved, display the evidence badge and details
  if (state !== "UNRESOLVED") {
    const badgeConfig: Record<
      Exclude<ResolutionState, "UNRESOLVED">,
      { label: string; bg: string; text: string; icon: string }
    > = {
      REVISION_REQUESTED: {
        label: "Revision Requested",
        bg: "bg-purple-100 border-purple-300",
        text: "text-purple-800",
        icon: "📝",
      },
      ACCEPTED_EXCEPTION: {
        label: "Variance Accepted",
        bg: "bg-emerald-100 border-emerald-300",
        text: "text-emerald-800",
        icon: "✓",
      },
      ESCALATED_TO_BROKER: {
        label: "Escalated to Broker",
        bg: "bg-sky-100 border-sky-300",
        text: "text-sky-800",
        icon: "⚖️",
      },
    };

    const config = badgeConfig[state as keyof typeof badgeConfig];

    return (
      <div className="mt-2.5 pt-2 border-t border-gray-200">
        <div
          className={`flex flex-col gap-1.5 p-2.5 rounded-lg border text-xs ${config.bg}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-bold">
              <span>{config.icon}</span>
              <span className={config.text}>{config.label}</span>
            </div>
            {item.resolved_by && (
              <span className="text-[10px] text-gray-500 font-sans">
                by {item.resolved_by}
              </span>
            )}
          </div>

          {item.resolution_reason_chip && (
            <div className="bg-white/80 border border-gray-200 rounded px-2 py-1 text-[11px] font-medium text-gray-800">
              📌 {item.resolution_reason_chip}
            </div>
          )}

          {item.resolution_note && (
            <div className="text-[10px] text-gray-600 italic">
              &ldquo;{item.resolution_note}&rdquo;
            </div>
          )}

          {/* If revision requested and in Supplier View, allow supplier to submit corrected document */}
          {state === "REVISION_REQUESTED" && viewMode === "SUPPLIER_PORTAL" && (
            <button
              type="button"
              onClick={() => onSubmitSupplierRevision?.(item.id)}
              className="mt-1 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-1.5 px-3 rounded text-xs transition-colors shadow-sm flex items-center justify-center gap-1.5"
            >
              <span>📤</span>
              <span>Submit Corrected Tally Prime / PL Document</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // If in Supplier View mode and item is unresolved
  if (viewMode === "SUPPLIER_PORTAL") {
    return (
      <div className="mt-2.5 pt-2 border-t border-gray-200">
        <div className="bg-amber-50 border border-amber-200 rounded p-2 text-xs text-amber-800">
          <div className="font-semibold flex items-center gap-1 mb-1">
            <span>⚠️</span>
            <span>Pending US Buyer Review</span>
          </div>
          <div className="text-[11px] text-amber-700">
            Document revision requested if discrepancy cannot be accepted under import tolerance.
          </div>
        </div>
      </div>
    );
  }

  // US Buyer Review Mode — The Evidence-Backed Resolution Bar
  return (
    <div className="mt-2.5 pt-2 border-t border-gray-200">
      <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
        Evidence-Backed Resolution Bar:
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-3 gap-1.5">
        <button
          type="button"
          onClick={() => {
            const next = activeAction === "REQUEST_REVISION" ? null : "REQUEST_REVISION";
            setActiveAction(next);
            setSelectedChip(next ? RESOLUTION_REASON_CHIPS.REQUEST_REVISION[0] : "");
          }}
          className={`py-1.5 px-2 rounded text-[11px] font-semibold border transition-all text-center ${
            activeAction === "REQUEST_REVISION"
              ? "bg-purple-600 text-white border-purple-700 shadow-sm"
              : "bg-purple-50 hover:bg-purple-100 text-purple-800 border-purple-200"
          }`}
          title="Send discrepancy back to Indian supplier for invoice/PL regeneration"
        >
          📝 Request Revision
        </button>

        <button
          type="button"
          onClick={() => {
            const next = activeAction === "ACCEPT_VARIANCE" ? null : "ACCEPT_VARIANCE";
            setActiveAction(next);
            setSelectedChip(next ? RESOLUTION_REASON_CHIPS.ACCEPT_VARIANCE[0] : "");
          }}
          className={`py-1.5 px-2 rounded text-[11px] font-semibold border transition-all text-center ${
            activeAction === "ACCEPT_VARIANCE"
              ? "bg-emerald-600 text-white border-emerald-700 shadow-sm"
              : "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200"
          }`}
          title="Authorized buyer acceptance with reference reason chip"
        >
          ✓ Accept Variance
        </button>

        <button
          type="button"
          onClick={() => {
            const next = activeAction === "ESCALATE_BROKER" ? null : "ESCALATE_BROKER";
            setActiveAction(next);
            setSelectedChip(next ? RESOLUTION_REASON_CHIPS.ESCALATE_BROKER[0] : "");
          }}
          className={`py-1.5 px-2 rounded text-[11px] font-semibold border transition-all text-center ${
            activeAction === "ESCALATE_BROKER"
              ? "bg-sky-600 text-white border-sky-700 shadow-sm"
              : "bg-sky-50 hover:bg-sky-100 text-sky-800 border-sky-200"
          }`}
          title="Escalate classification or duty rate doubt to licensed customs broker"
        >
          ⚖️ Escalate to Broker
        </button>
      </div>

      {/* Expanded Reason Chip Selector & Confirmation Panel */}
      {activeAction && (
        <div className="mt-2 bg-gray-50 border border-gray-300 rounded-lg p-2.5 space-y-2 animate-fadeIn text-xs">
          <div>
            <div className="text-[11px] font-semibold text-gray-700 mb-1">
              Select Justification / Reason Chip:
            </div>
            <div className="space-y-1">
              {RESOLUTION_REASON_CHIPS[activeAction].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setSelectedChip(chip)}
                  className={`w-full text-left px-2 py-1.5 rounded text-[11px] transition-all flex items-center gap-1.5 border ${
                    selectedChip === chip
                      ? "bg-blue-50 border-blue-400 text-blue-900 font-semibold"
                      : "bg-white border-gray-200 text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <span className={selectedChip === chip ? "text-blue-600" : "text-gray-400"}>
                    {selectedChip === chip ? "●" : "○"}
                  </span>
                  <span>{chip}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <input
              type="text"
              placeholder="Optional audit reference or email note (e.g., PO Amendment #2)..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-2 py-1 bg-white border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <button
              type="button"
              onClick={() => {
                setActiveAction(null);
                setNote("");
              }}
              className="px-2.5 py-1 text-gray-600 hover:text-gray-800 text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onResolve(activeAction, selectedChip, note);
                setActiveAction(null);
                setNote("");
              }}
              disabled={!selectedChip}
              className={`px-3 py-1 rounded text-xs font-semibold text-white shadow-sm transition-colors ${
                activeAction === "REQUEST_REVISION"
                  ? "bg-purple-600 hover:bg-purple-700"
                  : activeAction === "ACCEPT_VARIANCE"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-sky-600 hover:bg-sky-700"
              }`}
            >
              Sign & Log Decision
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

