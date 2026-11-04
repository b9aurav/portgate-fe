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
  const items = data.items || [];

  const isUnresolved = (item: any) =>
    !item.resolution_state ||
    item.resolution_state === "UNRESOLVED" ||
    item.resolution_state === "REVISION_REQUESTED";

  // Compute unresolved discrepancy counts per document
  const countForDoc = (docKey: string, prefix: string) => {
    return items.filter((item) => {
      if (!isUnresolved(item)) return false;
      const hasLoc = item.locs?.some(([k]) => k === docKey);
      const hasCell = item.cells?.some((c: string) => c.startsWith(prefix));
      return hasLoc || hasCell;
    }).length;
  };

  const poCount = countForDoc("po", "po-");
  const invCount = countForDoc("inv", "inv-");
  const plCount = countForDoc("pl", "pl-");

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

  return (
    <div className="flex items-center gap-1 border-b border-slate-200 bg-white px-6 pt-2 select-none">
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
  );
}

