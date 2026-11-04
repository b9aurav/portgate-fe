"use client";

import React, { useState } from "react";
import {
  History,
  CheckCircle2,
  Scale,
  CornerUpLeft,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import type { AuditDecisionLogEntry } from "@/lib/types";

interface AuditDecisionTrailProps {
  decisions: AuditDecisionLogEntry[];
}

export function AuditDecisionTrail({ decisions }: AuditDecisionTrailProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!decisions || decisions.length === 0) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1 select-none">
        <div className="font-semibold text-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-slate-500 shrink-0" strokeWidth={1.75} />
            <span>Audit Decision Trail</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">0 events</span>
        </div>
        <p className="text-[11px] text-slate-500">
          No sign-offs yet. Actions taken via resolution bars are recorded here.
        </p>
      </div>
    );
  }

  const actionMeta: Record<string, { badge: string; label: string; icon: any }> = {
    REQUEST_REVISION: {
      badge: "bg-purple-100 text-purple-800 border-purple-200",
      label: "Revision Requested",
      icon: CornerUpLeft,
    },
    ACCEPT_VARIANCE: {
      badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
      label: "Variance Accepted",
      icon: CheckCircle2,
    },
    ESCALATE_BROKER: {
      badge: "bg-sky-100 text-sky-800 border-sky-200",
      label: "Escalated to Broker",
      icon: Scale,
    },
    CLEARED_BY_REVISION: {
      badge: "bg-teal-100 text-teal-800 border-teal-200",
      label: "Cleared in Revision",
      icon: CheckCircle2,
    },
    CLEARED_IN_REVISION: {
      badge: "bg-teal-100 text-teal-800 border-teal-200",
      label: "Cleared in Revision",
      icon: CheckCircle2,
    },
    REOPEN_FOR_REVISION: {
      badge: "bg-amber-100 text-amber-800 border-amber-200",
      label: "Reopened for Revision",
      icon: CornerUpLeft,
    },
    REOPEN_SHIPMENT: {
      badge: "bg-amber-100 text-amber-800 border-amber-200",
      label: "Reopened for Revision",
      icon: CornerUpLeft,
    },
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden text-xs select-none">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full bg-slate-50 hover:bg-slate-100 px-3 py-2 text-left font-semibold text-slate-800 flex items-center justify-between border-b border-slate-200 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <History className="w-3.5 h-3.5 text-slate-500 shrink-0" strokeWidth={1.75} />
          <span>Audit Decision Trail</span>
          <span className="bg-slate-200 text-slate-700 text-[10px] px-1.5 py-0.5 rounded-full font-mono">
            {decisions.length}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        )}
      </button>

      {isExpanded && (
        <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto p-2 space-y-2">
          {decisions.map((entry) => {
            const meta = actionMeta[entry.action] || {
              badge: "bg-slate-100 text-slate-800 border-slate-200",
              label: entry.action?.replace(/_/g, " ") || "Audit Action",
              icon: History,
            };
            const Icon = meta.icon;
            return (
              <div
                key={entry.id}
                className="bg-slate-50/70 hover:bg-slate-50 rounded-lg p-2.5 text-xs space-y-1.5 border border-slate-100 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border inline-flex items-center gap-1 ${meta.badge}`}
                  >
                    <Icon className="w-3 h-3 shrink-0" strokeWidth={2} />
                    <span>{meta.label}</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {entry.timestamp}
                  </span>
                </div>

                <div className="font-semibold text-slate-900 flex items-center gap-1">
                  <span className="bg-slate-200 text-slate-700 px-1 py-0.5 rounded font-mono text-[10px]">
                    {entry.discrepancy_id}
                  </span>
                  <span className="truncate">{entry.title}</span>
                </div>

                <div className="text-[11px] text-slate-700 bg-white border border-slate-200 rounded px-2 py-0.5 font-medium">
                  {entry.reason_chip}
                </div>

                {entry.note && (
                  <div className="text-[11px] text-slate-500 italic">
                    Note: &ldquo;{entry.note}&rdquo;
                  </div>
                )}

                <div className="text-[10px] text-slate-400 flex items-center justify-between pt-0.5">
                  <span>Sign-off: {entry.actor_name}</span>
                  <span className="font-mono text-[9px] uppercase">{entry.actor_role}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
