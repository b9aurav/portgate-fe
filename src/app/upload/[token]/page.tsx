"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useParams } from "next/navigation";
import { HighlightProvider, useHighlight } from "@/context/HighlightContext";
import { DocumentTabs } from "@/components/inspector/DocumentTabs";
import { DocumentCanvas } from "@/components/inspector/DocumentCanvas";
import { AuditSummaryCard } from "@/components/workbench/AuditSummaryCard";
import { DiscrepancyQueue } from "@/components/workbench/DiscrepancyQueue";
import { SupplierRevisionDropzone } from "@/components/supplier/SupplierRevisionDropzone";
import { DEFAULT_AUDIT_PACKET } from "@/lib/defaultPacket";
import { getSession } from "@/lib/api";
import {
  ArrowRight,
  ShieldCheck,
  AlertOctagon,
  AlertTriangle,
  Lock,
} from "lucide-react";
import type { AuditResponse } from "@/lib/types";

function SupplierPortalContent() {
  const params = useParams();
  const token = typeof params.token === "string" ? params.token : "";
  const { activeTab, setActiveTab } = useHighlight();

  const [data, setData] = useState<AuditResponse>(DEFAULT_AUDIT_PACKET);
  const [loading, setLoading] = useState(true);
  const [isReauditing, setIsReauditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const viewMode = "SUPPLIER_PORTAL" as const;

  // ── Fetch session by token on load ───────────────────────────────────────
  const fetchSession = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const sessionData = await getSession(token);
      setData(sessionData);
    } catch (err: any) {
      console.warn("Could not fetch session from backend, using default reference:", err);
      setError("Active session not found or expired. Showing reference packet.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const handleAuditComplete = (updatedAudit: AuditResponse) => {
    setData(updatedAudit);
  };

  const m = data.metadata || ({} as any);
  const status = data.summary?.status || "ACTION_REQUIRED";
  const rev = data.revision_number || 1;

  const isBlocked = status === "ACTION_REQUIRED" || status === "BLOCKED";
  const isExceptions = status === "CLEARED_WITH_EXCEPTIONS";

  return (
    <div className="flex flex-col h-screen bg-slate-100 overflow-hidden font-sans">
      {/* ── Supplier Header ── */}
      <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between z-20 relative select-none">
        {/* Left: Brand & Shipment Context */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <img
              src="/portgate-lockup.png"
              alt="PortGate"
              className="h-7 w-auto object-contain"
            />
          </div>

          <div className="h-5 w-px bg-slate-200 mx-1" />

          {/* Shipment Reference */}
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-slate-900 text-sm">
              #{data.shipment_ref || "SHP-2026-8841"}
            </span>

            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-mono font-medium">
              <span>{m?.port_of_loading || "INMUN1"}</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" strokeWidth={2} />
              <span>{m?.port_of_discharge || "USLAX"}</span>
            </div>

            <span className="text-[11px] font-mono font-semibold text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
              Rev v{rev}
            </span>
          </div>

          {/* Status Badge */}
          <div
            className={`px-2.5 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 border transition-all ${
              isBlocked
                ? "bg-rose-50 text-rose-700 border-rose-200"
                : isExceptions
                ? "bg-amber-50 text-amber-700 border-amber-200"
                : "bg-emerald-50 text-emerald-700 border-emerald-200"
            }`}
          >
            {isBlocked ? (
              <AlertOctagon className="w-3.5 h-3.5 text-rose-600 shrink-0" strokeWidth={2} />
            ) : isExceptions ? (
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" strokeWidth={2} />
            ) : (
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" strokeWidth={2} />
            )}
            <span>{status.replace(/_/g, " ")}</span>
          </div>
        </div>

        {/* Right: Supplier Portal Indicator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs">
            <Lock className="w-3.5 h-3.5 text-indigo-600 shrink-0" strokeWidth={2} />
            <span className="font-semibold">{m?.exporter_name || "Supplier Revision Portal"}</span>
          </div>
        </div>
      </header>

      {/* ── Main Workspace ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left/Center Pane: Document Inspector */}
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 border-r border-slate-200">
          <DocumentTabs
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            data={data}
          />
          <DocumentCanvas
            activeTab={activeTab}
            data={data}
          />
        </div>

        {/* Right Pane: Supplier 2-File Dropzone & Discrepancy Queue */}
        <div className="w-[440px] bg-white flex flex-col overflow-hidden shadow-xs border-l border-slate-200">
          {/* 2-File Dropzone Card */}
          <div className="p-4 border-b border-slate-200">
            <SupplierRevisionDropzone
              token={token}
              onAuditComplete={handleAuditComplete}
              isLoading={isReauditing}
              setIsLoading={setIsReauditing}
            />
          </div>

          {/* Discrepancy Queue */}
          <DiscrepancyQueue
            data={data}
            viewMode={viewMode}
          />
        </div>
      </div>
    </div>
  );
}

export default function SupplierPortalPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-screen flex items-center justify-center font-sans text-slate-500 text-xs">
          Loading Supplier Revision Portal...
        </div>
      }
    >
      <HighlightProvider>
        <SupplierPortalContent />
      </HighlightProvider>
    </Suspense>
  );
}
