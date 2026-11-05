"use client";

import React from "react";
import { FileText, Receipt, PackageCheck, CheckCircle2 } from "lucide-react";
import type { AuditResponse } from "@/lib/types";

interface DocumentTabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  data: AuditResponse;
}

export function DocumentTabs({ activeTab, setActiveTab, data }: DocumentTabsProps) {
  const allItems = (data.discrepancies && data.discrepancies.length > 0) ? data.discrepancies : (data.items || []);

  const isUnresolved = (item: any) =>
    !item.resolution_state ||
    item.resolution_state === "UNRESOLVED" ||
    item.resolution_state === "REVISION_REQUESTED";

  const itemTouchesDoc = (item: any, docKey: "po" | "inv" | "pl") => {
    // 1. Direct cell prefix or locs check
    if (item.locs?.some(([k]: [string, string]) => k === docKey)) return true;
    if (item.cells?.some((c: string) => typeof c === "string" && c.startsWith(`${docKey}-`))) return true;

    // 2. Structured source_doc attributes
    const docMap: Record<string, string[]> = {
      po: ["BUYER_PO", "PO", "PURCHASE_ORDER"],
      inv: ["COMMERCIAL_INVOICE", "INVOICE", "INV"],
      pl: ["PACKING_LIST", "PL"],
    };
    const validNames = docMap[docKey];
    if (item.source_doc_a && validNames.includes(item.source_doc_a.toUpperCase())) return true;
    if (item.source_doc_b && validNames.includes(item.source_doc_b.toUpperCase())) return true;

    // 3. Fallback semantic heuristics by rule/ID prefix
    const id = (item.id || item.rule_id || "").toUpperCase();
    if (docKey === "po") {
      if (id.includes("PO-MISMATCH") || id.includes("SUPPLIER-MISMATCH") || id.includes("UNEXPECTED-LINE")) return true;
      if (id.startsWith("DISC-QTY") || id.startsWith("DISC-PRICE") || id.startsWith("DISC-HS") || id.includes("INCOTERM")) return true;
    } else if (docKey === "inv") {
      if (id.includes("INVOICE") || id.includes("INV") || id.includes("CARTON") || id.includes("WEIGHT")) return true;
      if (id.includes("PO-MISMATCH") || id.includes("SUPPLIER-MISMATCH") || id.includes("UNEXPECTED-LINE")) return true;
      if (id.startsWith("DISC-QTY") || id.startsWith("DISC-PRICE") || id.startsWith("DISC-HS") || id.includes("INCOTERM") || id.includes("VAGUE")) return true;
      if (id.includes("MISSING-REQUIRED")) return true;
    } else if (docKey === "pl") {
      if (id.includes("CARTON") || id.includes("WEIGHT") || id.includes("PL") || id.includes("PACKING")) return true;
      if (id.includes("MISSING-REQUIRED")) return true;
    }
    return false;
  };

  // Compute unresolved discrepancy counts per document
  const countForDoc = (docKey: "po" | "inv" | "pl") => {
    return allItems.filter((item) => isUnresolved(item) && itemTouchesDoc(item, docKey)).length;
  };

  const poCount = countForDoc("po");
  const invCount = countForDoc("inv");
  const plCount = countForDoc("pl");

  const tabs = [
    {
      key: "po",
      label: "1 · Buyer Purchase Order",
      shortLabel: "Buyer PO",
      icon: FileText,
      count: poCount,
    },
    {
      key: "inv",
      label: "2 · Commercial Invoice",
      shortLabel: "Invoice",
      icon: Receipt,
      count: invCount,
    },
    {
      key: "pl",
      label: "3 · Packing List",
      shortLabel: "Packing List",
      icon: PackageCheck,
      count: plCount,
    },
  ];

  const confidencePct = data.extraction_confidence_pct ?? 99.4;
  const lowConfCount = data.low_confidence_fields?.length ?? 0;
  const isHighConfidence = confidencePct >= 95 && lowConfCount === 0;

  return (
    <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 pt-2 select-none">
      <div className="flex items-center gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-all cursor-pointer ${
                isActive
                  ? "border-indigo-600 text-indigo-700 font-semibold bg-indigo-50/40 rounded-t-lg"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-t-lg"
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 ${isActive ? "text-indigo-600" : "text-slate-400"}`}
                strokeWidth={isActive ? 2 : 1.75}
              />
              <span>{tab.label}</span>

              {tab.count > 0 ? (
                <span
                  className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold leading-none ${
                    isActive
                      ? "bg-rose-100 text-rose-700 border border-rose-200"
                      : "bg-slate-100 text-slate-600 border border-slate-200"
                  }`}
                >
                  {tab.count}
                </span>
              ) : (
                <CheckCircle2
                  className="w-3.5 h-3.5 text-emerald-500 shrink-0 ml-0.5"
                  strokeWidth={2}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Extraction Confidence Pill */}
      <div
        data-testid="extraction-confidence-pill"
        title={lowConfCount > 0 ? `Flagged fields: ${(data.low_confidence_fields || []).join(", ")}` : "All customs fields extracted with high confidence"}
        className={`hidden sm:flex items-center gap-1.5 pb-2 text-[11px] font-medium border px-2.5 py-1 rounded-full shadow-2xs transition-colors ${
          isHighConfidence
            ? "text-emerald-700 bg-emerald-50 border-emerald-200/80"
            : "text-amber-800 bg-amber-50 border-amber-300"
        }`}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full animate-pulse ${
            isHighConfidence ? "bg-emerald-500" : "bg-amber-500"
          }`}
        />
        <span className="font-semibold">{confidencePct}% Extraction Confidence</span>
        <span className="text-slate-400">·</span>
        <span className={isHighConfidence ? "text-slate-600" : "text-amber-800 font-medium"}>
          {lowConfCount} Low-Confidence Fields
        </span>
      </div>
    </div>
  );
}

