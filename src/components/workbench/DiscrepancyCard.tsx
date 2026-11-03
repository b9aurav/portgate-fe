"use client";

import React, { useState } from "react";
import {
  Send,
  CornerUpLeft,
  CheckCircle2,
  Scale,
  Lock,
  ArrowUpRight,
  AlertOctagon,
  AlertTriangle,
} from "lucide-react";
import type {
  DiscrepancyItem,
  ResolutionState,
  WorkspaceRole,
} from "@/lib/types";

interface DiscrepancyCardProps {
  item: DiscrepancyItem;
  viewMode: WorkspaceRole;
  isActive: boolean;
  onSelect: () => void;
  onJumpToDoc: (tabKey: string) => void;
  onResolve: (
    action: "REQUEST_REVISION" | "ACCEPT_VARIANCE" | "ESCALATE_BROKER",
    reasonChip: string,
    note?: string
  ) => void;
  onSubmitSupplierRevision?: (itemId: string) => void;
}

const PRESET_REASON_CHIPS: Record<
  "REQUEST_REVISION" | "ACCEPT_VARIANCE" | "ESCALATE_BROKER",
  string[]
> = {
  REQUEST_REVISION: [
    "Tally Prime Typo — Requesting Invoice Correction",
    "Packing List Discrepancy — Requesting Updated PL",
    "Physical Scale Re-Weigh Required",
    "Missing LUT ARN Declaration on Invoice Header",
  ],
  ACCEPT_VARIANCE: [
    "Approved PO Amendment #2",
    "Authorized Split Shipment Overage (+2.5%)",
    "Agreed Seasonal Surcharge Pre-Approved",
    "Exchange Rate Tolerance Accepted (<1%)",
  ],
  ESCALATE_BROKER: [
    "Escalate to Licensed US Customs Broker",
    "Request Binding Ruling (19 CFR §177)",
    "HS Chapter 61 vs 62 Subheading Review Required",
    "Duty Rate Impact & Tariff Assessment Required",
  ],
};

export function DiscrepancyCard({
  item,
  viewMode,
  isActive,
  onSelect,
  onJumpToDoc,
  onResolve,
  onSubmitSupplierRevision,
}: DiscrepancyCardProps) {
  const [activeAction, setActiveAction] = useState<
    "REQUEST_REVISION" | "ACCEPT_VARIANCE" | "ESCALATE_BROKER" | null
  >(null);
  const [selectedChip, setSelectedChip] = useState<string>("");
  const [note, setNote] = useState<string>("");

  const sev = item.sev || (item.severity === "CRITICAL" ? "crit" : "warn");
  const category = item.category || "DETERMINISTIC_CONFLICT";
  const state: ResolutionState = item.resolution_state || "UNRESOLVED";
  const body = item.body || item.description || "";
  const locs = item.locs || [["inv", "Invoice"]];

  const handleApplyResolution = (action: "REQUEST_REVISION" | "ACCEPT_VARIANCE" | "ESCALATE_BROKER") => {
    const chip = selectedChip || PRESET_REASON_CHIPS[action][0];
    onResolve(action, chip, note.trim() || undefined);
    setActiveAction(null);
    setSelectedChip("");
    setNote("");
  };

  return (
    <div
      onClick={onSelect}
      className={`p-4 rounded-xl border transition-all cursor-pointer ${
        isActive
          ? "ring-2 ring-indigo-500 shadow-md bg-white border-indigo-300"
          : "bg-white hover:border-slate-300 border-slate-200 shadow-xs"
      } ${
        state === "ACCEPTED_EXCEPTION" || state === "CLEARED_BY_REVISION"
          ? "border-l-4 border-l-emerald-600 bg-emerald-50/20"
          : state === "ESCALATED_TO_BROKER"
          ? "border-l-4 border-l-sky-600 bg-sky-50/20"
          : state === "REVISION_REQUESTED"
          ? "border-l-4 border-l-purple-600 bg-purple-50/20"
          : sev === "crit"
          ? "border-l-4 border-l-rose-600"
          : "border-l-4 border-l-amber-500"
      }`}
    >
      <div className="space-y-2.5">
        {/* Header: ID, Severity, Category */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span
              className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded leading-none ${
                sev === "crit"
                  ? "bg-rose-100 text-rose-800 border border-rose-200"
                  : "bg-amber-100 text-amber-800 border border-amber-200"
              }`}
            >
              {item.id}
            </span>
            <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded leading-none">
              {category.replace(/_/g, " ")}
            </span>
          </div>

          <div className="flex items-center gap-1 text-[11px] font-semibold">
            {state === "CLEARED_BY_REVISION" ? (
              <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1 text-[10px] font-bold">
                <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" strokeWidth={2.5} />
                <span>CLEARED IN REVISION</span>
              </span>
            ) : sev === "crit" ? (
              <span className="text-rose-700 flex items-center gap-1">
                <AlertOctagon className="w-3.5 h-3.5 text-rose-600 shrink-0" strokeWidth={2} />
                <span>CRITICAL</span>
              </span>
            ) : (
              <span className="text-amber-700 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" strokeWidth={2} />
                <span>WARNING</span>
              </span>
            )}
          </div>
        </div>

        {/* Title */}
        <h4 className="text-xs font-semibold text-slate-900 leading-snug">
          {item.title}
        </h4>

        {/* Full Un-truncated Body (CRITICAL RULE) */}
        <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
          {body}
        </p>

        {/* Document Location Navigation Pills */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {locs.map(([docKey, docLabel], idx) => (
            <button
              key={idx}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onJumpToDoc(docKey);
              }}
              className="text-[11px] text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded px-2 py-0.5 inline-flex items-center gap-1 transition-colors cursor-pointer"
            >
              <ArrowUpRight className="w-3 h-3 text-slate-400 shrink-0" strokeWidth={2} />
              <span>{docLabel}</span>
            </button>
          ))}
        </div>

        {/* ── Evidence-Backed Resolution Section ── */}
        <div onClick={(e) => e.stopPropagation()} className="pt-2 border-t border-slate-100">
          {/* Resolved State Pill */}
          {state !== "UNRESOLVED" ? (
            <div
              className={`p-2.5 rounded-lg border text-xs space-y-1.5 ${
                state === "ACCEPTED_EXCEPTION" || state === "CLEARED_BY_REVISION"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                  : state === "ESCALATED_TO_BROKER"
                  ? "bg-sky-50 border-sky-200 text-sky-900"
                  : "bg-purple-50 border-purple-200 text-purple-900"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold inline-flex items-center gap-1.5">
                  {state === "ACCEPTED_EXCEPTION" || state === "CLEARED_BY_REVISION" ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" strokeWidth={2} />
                  ) : state === "ESCALATED_TO_BROKER" ? (
                    <Scale className="w-3.5 h-3.5 text-sky-600 shrink-0" strokeWidth={2} />
                  ) : (
                    <Send className="w-3.5 h-3.5 text-purple-600 shrink-0" strokeWidth={2} />
                  )}
                  <span>
                    {state === "CLEARED_BY_REVISION"
                      ? "Cleared by Supplier Upload"
                      : state === "ACCEPTED_EXCEPTION"
                      ? "Commercial Variance Accepted"
                      : state === "ESCALATED_TO_BROKER"
                      ? "Escalated to Customs Broker"
                      : "Supplier Revision Required"}
                  </span>
                </span>
                {item.resolved_by && (
                  <span className="text-[10px] text-slate-500">by {item.resolved_by}</span>
                )}
              </div>

              {item.resolution_reason_chip && (
                <div className="bg-white/90 border border-slate-200 rounded px-2 py-0.5 text-[11px] font-medium text-slate-800">
                  {item.resolution_reason_chip}
                </div>
              )}

              {item.resolution_note && (
                <div className="text-[11px] text-slate-600 italic">
                  &ldquo;{item.resolution_note}&rdquo;
                </div>
              )}

              {/* Supplier Portal Quick Submit Button */}
              {viewMode === "SUPPLIER_PORTAL" && state === "REVISION_REQUESTED" && (
                <button
                  type="button"
                  onClick={() => onSubmitSupplierRevision?.(item.id)}
                  className="mt-1 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-1.5 px-3 rounded text-xs transition-colors shadow-xs"
                >
                  Submit Revised Document
                </button>
              )}
            </div>
          ) : viewMode === "SUPPLIER_PORTAL" ? (
            /* Supplier Mode Pending Notice */
            <div className="p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
              <span className="font-semibold">Pending US Buyer Triage</span>
              <p className="text-[11px] text-amber-700 mt-0.5">
                Revise documents if discrepancy cannot be accepted under import tolerance.
              </p>
            </div>
          ) : (
            /* US Buyer Workbench Category-Specific Action Buttons */
            <div className="space-y-2">
              {activeAction === null ? (
                /* Primary Buttons Based On Category */
                <div className="flex items-center gap-1.5">
                  {category === "DETERMINISTIC_CONFLICT" && (
                    /* Deterministic Conflict: ONLY Require Revision. NO Accept Variance allowed! */
                    <button
                      type="button"
                      onClick={() => setActiveAction("REQUEST_REVISION")}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-1.5 px-2.5 rounded-lg text-xs inline-flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
                      <span>Require Supplier Revision</span>
                    </button>
                  )}

                  {category === "COMMERCIAL_VARIANCE" && (
                    /* Commercial Variance: Accept Variance OR Request Revision */
                    <>
                      <button
                        type="button"
                        onClick={() => setActiveAction("ACCEPT_VARIANCE")}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-1.5 px-2.5 rounded-lg text-xs inline-flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
                        <span>Accept Variance</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveAction("REQUEST_REVISION")}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-1.5 px-2.5 rounded-lg text-xs inline-flex items-center justify-center gap-1 border border-slate-200 transition-colors cursor-pointer"
                      >
                        <CornerUpLeft className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
                        <span>Revise</span>
                      </button>
                    </>
                  )}

                  {category === "COMPLIANCE_ADVISORY" && (
                    /* Compliance Advisory: Escalate to Broker OR Request Revision */
                    <>
                      <button
                        type="button"
                        onClick={() => setActiveAction("ESCALATE_BROKER")}
                        className="flex-1 bg-sky-600 hover:bg-sky-700 text-white font-medium py-1.5 px-2.5 rounded-lg text-xs inline-flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                      >
                        <Scale className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
                        <span>Escalate to Broker</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveAction("REQUEST_REVISION")}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-1.5 px-2.5 rounded-lg text-xs inline-flex items-center justify-center gap-1 border border-slate-200 transition-colors cursor-pointer"
                      >
                        <CornerUpLeft className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
                        <span>Revise</span>
                      </button>
                    </>
                  )}
                </div>
              ) : (
                /* Interactive Reason Chip Picker & Note Form */
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2.5 animate-in fade-in duration-100">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">
                      {activeAction === "REQUEST_REVISION"
                        ? "Select Revision Reason:"
                        : activeAction === "ACCEPT_VARIANCE"
                        ? "Select Variance Approval Reason:"
                        : "Select Broker Escalation Reason:"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveAction(null)}
                      className="text-slate-400 hover:text-slate-600 text-xs font-semibold"
                    >
                      Cancel
                    </button>
                  </div>

                  {/* Reason Chips */}
                  <div className="flex flex-wrap gap-1">
                    {PRESET_REASON_CHIPS[activeAction].map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => setSelectedChip(chip)}
                        className={`text-[11px] px-2 py-1 rounded-md text-left transition-all border ${
                          selectedChip === chip
                            ? "bg-slate-900 text-white border-slate-900 font-medium"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {chip}
                      </button>
                    ))}
                  </div>

                  {/* Optional Note */}
                  <input
                    type="text"
                    placeholder="Optional authorization note..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 text-slate-800 placeholder:text-slate-400"
                  />

                  {/* Confirm Button */}
                  <button
                    type="button"
                    onClick={() => handleApplyResolution(activeAction)}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-1.5 px-3 rounded-md text-xs transition-colors shadow-xs"
                  >
                    Confirm Sign-Off
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

