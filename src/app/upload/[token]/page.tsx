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
  Clock,
  Lock,
  Loader2,
} from "lucide-react";
import type { AuditResponse } from "@/lib/types";

function SupplierPortalContent() {
  const params = useParams();
  const token = typeof params.token === "string" ? params.token : "";
  const { activeTab, setActiveTab } = useHighlight();

  const [data, setData] = useState<AuditResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingElapsed, setLoadingElapsed] = useState(0);
  const [isReauditing, setIsReauditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const viewMode = "SUPPLIER_PORTAL" as const;

  useEffect(() => {
    let t: NodeJS.Timeout | null = null;
    if (loading && !data) {
      t = setInterval(() => setLoadingElapsed((e) => e + 1), 1000);
    } else {
      setLoadingElapsed(0);
    }
    return () => {
      if (t) clearInterval(t);
    };
  }, [loading, data]);

  // ── Fetch session by token on load ───────────────────────────────────────
  const fetchSession = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const sessionData = await getSession(token);
      setData(sessionData);
    } catch {
      setError("Audit session not found or expired.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  if (loading && !data) {
    return (
        <div className="relative flex flex-col h-screen bg-slate-100 overflow-hidden font-sans">
          <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between z-20 relative select-none animate-pulse">
            <div className="flex items-center gap-4">
              <div className="h-7 w-28 bg-slate-200 rounded" />
              <div className="h-5 w-px bg-slate-200 mx-1" />
              <div className="h-6 w-32 bg-slate-200 rounded" />
            </div>
            <div className="h-8 w-44 bg-slate-200 rounded-lg" />
          </header>
            <div className="flex flex-1 overflow-hidden opacity-40">
              <div className="flex-1 flex flex-col bg-slate-50 border-r border-slate-200 p-6 space-y-4 animate-pulse">
                <div className="h-10 w-96 bg-slate-200 rounded" />
                <div className="h-64 bg-slate-200 rounded" />
                <div className="h-48 bg-slate-200 rounded" />
              </div>
              <div className="w-[420px] bg-white p-6 space-y-4 border-l border-slate-200 animate-pulse">
                <div className="h-44 bg-slate-200 rounded-xl" />
                <div className="h-10 bg-slate-200 rounded" />
                <div className="h-28 bg-slate-200 rounded" />
                <div className="h-28 bg-slate-200 rounded" />
              </div>
            </div>

            {/* Active Centered Loading Overlay */}
            <div className="absolute inset-0 flex items-center justify-center p-4 bg-slate-900/10 backdrop-blur-[2px] z-30">
              <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 max-w-sm w-full mx-4 text-center space-y-3 animate-in fade-in zoom-in-95 duration-200">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 mx-auto flex items-center justify-center text-indigo-600">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Loading Supplier Revision Portal
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 font-mono">
                    {token ? `Session: ${token}` : "Retrieving discrepancy details..."}
                  </p>
                </div>

                <div className="pt-1">
                  <span className="inline-block text-[11px] font-mono font-medium text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-full">
                    {loadingElapsed}s elapsed
                  </span>
                </div>

                {loadingElapsed >= 4 && (
                  <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-left leading-relaxed">
                    ⚡ <strong>Free Tier Spin-Up:</strong> Render web services spin down after inactivity. Initial spin-up takes ~30–45s.
                  </p>
                )}
              </div>
            </div>
          </div>
          );
  }

          if (!loading && error && (!data || !data.session_token || data.session_token !== token)) {
    return (
          <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center select-none font-sans">
            <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-8 flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-4">
                <AlertOctagon className="w-6 h-6" strokeWidth={1.75} />
              </div>
              <h2 className="text-base font-bold text-slate-900 mb-1.5">
                Audit Session Not Found or Expired
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed mb-6">
                This shipment packet link (<span className="font-mono text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">{token}</span>) is no longer active. It may have been cleared, deleted, or reset.
              </p>
              <a
                href="/"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs shadow-sm transition-all cursor-pointer"
              >
                <span>Return to Shipments Queue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
          );
  }

          if (!data) return null;

          const isRevoked = Boolean(data.link_revoked);
          const isExpired = Boolean(
          data.link_expires_at &&
          new Date(data.link_expires_at).getTime() < Date.now()
          );

          if (!loading && (isRevoked || isExpired)) {
    return (
          <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center select-none font-sans">
            <div className="max-w-md w-full bg-white rounded-2xl border border-rose-200 shadow-sm p-8 flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mb-4">
                <Lock className="w-6 h-6" strokeWidth={1.75} />
              </div>
              <h2 className="text-base font-bold text-slate-900 mb-1.5">
                Link Revoked by Buyer
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed mb-6">
                This supplier revision link has been revoked or expired. Please contact the buyer to request a new link.
              </p>
              <a
                href="/"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs shadow-sm transition-all cursor-pointer"
              >
                <span>Return to Shipments Queue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
          );
  }

  const handleAuditComplete = (updatedAudit: AuditResponse) => {
            setData(updatedAudit);
  };

          const m = data.metadata || ({ } as any);
          const status = data.summary?.status || "ACTION_REQUIRED";
          const rev = data.revision_number || 1;

          const unresolvedCount =
          data.summary?.unresolved_count ??
          data.items?.filter(
      (it) =>
          !it.resolution_state ||
          it.resolution_state === "UNRESOLVED" ||
          it.resolution_state === "REVISION_REQUESTED"
          ).length ??
          0;

          const isAwaiting = status === "AWAITING_SUPPLIER_REVISION" || Boolean(data.reopened_for_revision);
  const isBlocked = (status === "ACTION_REQUIRED" || status === "BLOCKED" || unresolvedCount > 0) && !isAwaiting;
          const isCleared = !isBlocked && !isAwaiting;

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
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 border transition-all ${isBlocked
                      ? "bg-rose-50 text-rose-700 border-rose-200"
                      : isAwaiting
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200"
                    }`}
                >
                  {isBlocked ? (
                    <AlertOctagon className="w-3.5 h-3.5 text-rose-600 shrink-0" strokeWidth={2} />
                  ) : isAwaiting ? (
                    <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" strokeWidth={2} />
                  ) : (
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" strokeWidth={2} />
                  )}
                  <span>{isAwaiting ? "AWAITING SUPPLIER REVISION" : status.replace(/_/g, " ")}</span>
                </div>
              </div>

              {/* Right: Supplier Portal Indicator */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs">
                  <Lock className="w-3.5 h-3.5 text-indigo-600 shrink-0" strokeWidth={2} />
                  <span className="font-semibold">
                    {data.packet?.buyer_po?.supplier_name ||
                      data.packet?.buyer_po?.vendor_name ||
                      m?.po_supplier_name ||
                      m?.exporter_name ||
                      "Supplier Revision Portal"}
                  </span>
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
                {/* 2-File Dropzone Card / Verified Lock Card */}
                <div className="p-3 border-b border-slate-200">
                  <SupplierRevisionDropzone
                    token={token}
                    onAuditComplete={handleAuditComplete}
                    isLoading={isReauditing}
                    setIsLoading={setIsReauditing}
                    unresolvedCount={unresolvedCount}
                    revisionNumber={rev}
                    isReopened={Boolean(data.reopened_for_revision)}
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
