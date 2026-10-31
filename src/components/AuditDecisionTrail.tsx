"use client";

import React, { useState } from "react";
import type { AuditDecisionLogEntry } from "@/types/audit";

interface AuditDecisionTrailProps {
  decisions: AuditDecisionLogEntry[];
}

export function AuditDecisionTrail({ decisions }: AuditDecisionTrailProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!decisions || decisions.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs space-y-1">
        <div className="font-bold text-gray-700 flex items-center justify-between">
          <span>📜 Audit Decision Trail</span>
          <span className="text-[10px] text-gray-400 font-normal">0 logged events</span>
        </div>
        <p className="text-[11px] text-gray-500 italic">
          No sign-offs yet. Actions taken via the Evidence-Backed Resolution Bar will be recorded here with cryptographic traceability.
        </p>
      </div>
    );
  }

  const actionMeta: Record<
    AuditDecisionLogEntry["action"],
    { badge: string; label: string; icon: string }
  > = {
    REQUEST_REVISION: {
      badge: "bg-purple-100 text-purple-800 border-purple-300",
      label: "Revision Requested",
      icon: "📝",
    },
    ACCEPT_VARIANCE: {
      badge: "bg-emerald-100 text-emerald-800 border-emerald-300",
      label: "Variance Accepted",
      icon: "✓",
    },
    ESCALATE_BROKER: {
      badge: "bg-sky-100 text-sky-800 border-sky-300",
      label: "Escalated to Broker",
      icon: "⚖️",
    },
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden text-xs">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full bg-gray-50 hover:bg-gray-100 px-3 py-2 text-left font-bold text-gray-800 flex items-center justify-between border-b border-gray-200 transition-colors"
      >
        <div className="flex items-center gap-1.5">
          <span>📜</span>
          <span>Audit Decision Trail</span>
          <span className="bg-blue-100 text-blue-800 text-[10px] px-1.5 py-0.5 rounded-full font-mono">
            {decisions.length}
          </span>
        </div>
        <span className="text-gray-400 text-xs">{isExpanded ? "▲" : "▼"}</span>
      </button>

      {isExpanded && (
        <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto p-2 space-y-2">
          {decisions.map((entry) => {
            const meta = actionMeta[entry.action];
            return (
              <div
                key={entry.id}
                className="bg-gray-50/70 hover:bg-gray-50 rounded p-2 text-xs space-y-1 border border-gray-100 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border flex items-center gap-1 ${meta.badge}`}
                  >
                    <span>{meta.icon}</span>
                    <span>{meta.label}</span>
                  </span>
                  <span className="text-[10px] text-gray-400 font-mono">
                    {entry.timestamp}
                  </span>
                </div>

                <div className="font-semibold text-gray-900 flex items-center gap-1">
                  <span className="bg-gray-200 text-gray-700 px-1 py-0.2 rounded font-mono text-[10px]">
                    {entry.discrepancy_id}
                  </span>
                  <span className="truncate">{entry.title}</span>
                </div>

                <div className="text-[11px] text-gray-700 bg-white border border-gray-200 rounded px-2 py-0.5">
                  📌 <span className="font-medium">{entry.reason_chip}</span>
                </div>

                {entry.note && (
                  <div className="text-[10px] text-gray-600 italic">
                    Note: &ldquo;{entry.note}&rdquo;
                  </div>
                )}

                <div className="text-[10px] text-gray-500 flex items-center justify-between pt-0.5">
                  <span>Signed by: <b className="text-gray-700">{entry.actor_name}</b></span>
                  <span className="text-[9px] uppercase tracking-wider text-gray-400 font-mono">
                    {entry.actor_role === "BUYER_WORKBENCH" ? "US Buyer" : "Supplier"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

