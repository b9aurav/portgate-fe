"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { HighlightProvider } from "@/context/HighlightContext";
import { DocumentViewer } from "@/components/DocumentViewer";
import { AuditSidebar } from "@/components/AuditSidebar";
import { UploadModal } from "@/components/UploadModal";
import { ExportModal } from "@/components/ExportModal";
import { DEFAULT_AUDIT_PACKET } from "@/lib/defaultPacket";
import type {
  AuditDecisionLogEntry,
  AuditResponse,
  HealthResponse,
  ResolutionState,
} from "@/types/audit";

type Phase = "idle" | "run" | "done";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const POLL_INTERVAL_MS = 3000;

// ────────────────────────────────────────────────────────────────────────────
// Magic Link Popover component
// ────────────────────────────────────────────────────────────────────────────
function MagicLinkPopover({
  token,
  revisionNumber,
  onClose,
}: {
  token: string;
  revisionNumber: number;
  onClose: () => void;
}) {
  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const url = `${origin}/upload/${token}`;
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error("Failed to copy link:", e);
    }
  };

  return (
    <div className="absolute top-14 right-0 z-50 w-96 bg-white border border-gray-200 rounded-xl shadow-2xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="PortGate" className="w-5 h-5 rounded object-contain" />
          <span className="font-bold text-sm text-gray-900">Supplier Revision Magic Link</span>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-lg leading-none p-1"
        >
          ×
        </button>
      </div>

      {/* Description */}
      <div className="text-xs text-gray-600 leading-relaxed">
        Share this zero-login revision link with your Indian supplier. They can inspect flagged
        discrepancies, match against your locked Buyer PO, and upload revised documents.
      </div>

      {/* Metadata Badges */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2">
          <div className="text-[10px] text-indigo-500 font-semibold uppercase tracking-wider mb-0.5">
            Dynamic Token
          </div>
          <div className="font-mono text-xs font-bold text-indigo-900 truncate">{token}</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
          <div className="text-[10px] text-blue-500 font-semibold uppercase tracking-wider mb-0.5">
            Active Revision
          </div>
          <div className="font-mono text-xs font-bold text-blue-900">v{revisionNumber}</div>
        </div>
      </div>

      {/* URL display */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
        <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-1">
          Supplier Revision URL
        </div>
        <div className="font-mono text-xs text-gray-700 break-all select-all">{url}</div>
      </div>

      {/* Copy button */}
      <button
        type="button"
        onClick={handleCopy}
        className={`w-full py-2.5 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 ${copied
          ? "bg-emerald-600 text-white"
          : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
          }`}
      >
        {copied ? (
          <>
            <span>✓</span>
            <span>Copied to Clipboard!</span>
          </>
        ) : (
          <>
            <span>📋</span>
            <span>Copy Magic Link</span>
          </>
        )}
      </button>

      {/* Hint */}
      <div className="text-[11px] text-gray-500 text-center italic">
        Open in an Incognito / Private window to simulate the Indian supplier experience
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Main Page: US Buyer Exception Workbench
// ────────────────────────────────────────────────────────────────────────────
export default function HomePage() {
  // ── Core audit state ──────────────────────────────────────────────────────
  const [data, setData] = useState<AuditResponse>(DEFAULT_AUDIT_PACKET);
  const [phase, setPhase] = useState<Phase>("done");
  const [tolerancePct, setTolerancePct] = useState(5.0);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [isFixed, setIsFixed] = useState(false);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [auditCount, setAuditCount] = useState(0);
  const [decisionTrail, setDecisionTrail] = useState<AuditDecisionLogEntry[]>([]);
  const [showMagicPopover, setShowMagicPopover] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const viewMode = "BUYER_WORKBENCH" as const;

  // ── Health check on mount ─────────────────────────────────────────────────
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch(`${API_URL}/api/health`);
        if (res.ok) setHealth(await res.json());
      } catch {
        // Backend offline — silently ignore
      }
    };
    checkHealth();
  }, []);

  // ── Session tracking ref to prevent stale polling overwrites ─────────────
  const activeTokenRef = useRef<string>(data.session_token || "");

  useEffect(() => {
    activeTokenRef.current = data.session_token || "";
  }, [data.session_token]);

  // ── Dynamic Session Polling & Refresh ────────────────────────────────────
  const syncSession = useCallback(
    async (token: string) => {
      if (!token || token !== activeTokenRef.current) return;
      try {
        setIsSyncing(true);
        const res = await fetch(`${API_URL}/api/links/${token}`);
        if (!res.ok) return;

        // Discard if token changed while request was in flight
        if (token !== activeTokenRef.current) return;

        const updated: AuditResponse = await res.json();
        if (updated.session_token !== activeTokenRef.current) return;

        setData((prev) => ({
          ...prev,
          ...updated,
          items: updated.items || updated.discrepancies || prev.items || [],
          discrepancies: updated.discrepancies || updated.items || prev.discrepancies || [],
        }));
        setLastSynced(new Date().toLocaleTimeString());
      } catch (err) {
        console.warn("Failed to sync session:", err);
      } finally {
        setIsSyncing(false);
      }
    },
    []
  );

  useEffect(() => {
    const token = data.session_token;
    if (!token) return;

    // Window focus refresh
    const onFocus = () => {
      syncSession(token);
    };
    window.addEventListener("focus", onFocus);

    // 3-second background polling
    const timer = setInterval(() => {
      syncSession(token);
    }, POLL_INTERVAL_MS);

    return () => {
      window.removeEventListener("focus", onFocus);
      clearInterval(timer);
    };
  }, [data.session_token, syncSession]);

  // ── Run Audit Handler (POST /api/audit) ──────────────────────────────────
  const handleRunAudit = async (mock: boolean) => {
    setPhase("run");
    setIsFixed(false);
    setDecisionTrail([]);

    try {
      const formData = new FormData();
      const dummyPdf = new File(
        ["%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF"],
        "dummy.pdf",
        { type: "application/pdf" }
      );
      formData.append("po_pdf", dummyPdf);
      formData.append("inv_pdf", dummyPdf);
      formData.append("pl_pdf", dummyPdf);
      formData.append("tolerance_pct", tolerancePct.toString());
      formData.append("mock", mock.toString());

      const res = await fetch(`${API_URL}/api/audit`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error((await res.json()).detail || "Audit failed");

      const auditData: AuditResponse = await res.json();
      activeTokenRef.current = auditData.session_token;
      setData(auditData);
      setLastSynced(new Date().toLocaleTimeString());
      setAuditCount((prev) => prev + 1);
      setPhase("done");
    } catch (err) {
      console.error("Audit failed:", err);
      alert(`Audit failed: ${err instanceof Error ? err.message : "Unknown error"}`);
      setPhase("done");
    }
  };

  const handleUploadSuccess = (auditData: AuditResponse) => {
    activeTokenRef.current = auditData.session_token;
    const safeData: AuditResponse = {
      ...auditData,
      items: auditData.items || auditData.discrepancies || [],
      discrepancies: auditData.discrepancies || auditData.items || [],
      passed: auditData.passed || [],
      po_lines: auditData.po_lines || [],
      inv_lines: auditData.inv_lines || [],
      metadata: auditData.metadata || ({} as any),
      weights: auditData.weights || { inv: [], pl: [] },
      cartons: auditData.cartons || { inv: [], pl: [] },
      summary: auditData.summary || {
        status: "VERIFIED_CLEAN",
        critical_count: 0,
        warning_count: 0,
        passed_count: 0,
      },
    };
    setData(safeData);
    setPhase("done");
    setIsFixed(false);
    setDecisionTrail([]);
    setLastSynced(new Date().toLocaleTimeString());
    setAuditCount((prev) => prev + 1);
  };

  // ── Discrepancy Triage (PATCH /api/links/{token}/discrepancies/{id}) ─────
  const handleResolveItem = async (
    itemId: string,
    action: "REQUEST_REVISION" | "ACCEPT_VARIANCE" | "ESCALATE_BROKER",
    reasonChip: string,
    note?: string
  ) => {
    const timestamp = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    const targetItem = data.items.find((it) => it.id === itemId);
    if (!targetItem) return;

    const previousState: ResolutionState = targetItem.resolution_state || "UNRESOLVED";
    const newState: ResolutionState =
      action === "REQUEST_REVISION"
        ? "REVISION_REQUESTED"
        : action === "ACCEPT_VARIANCE"
          ? "ACCEPTED_EXCEPTION"
          : "ESCALATED_TO_BROKER";

    const logEntry: AuditDecisionLogEntry = {
      id: `DEC-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      discrepancy_id: itemId,
      title: targetItem.title,
      previous_state: previousState,
      new_state: newState,
      action,
      reason_chip: reasonChip,
      note,
      actor_role: viewMode,
      actor_name: "US Buyer Import Specialist",
      timestamp,
    };
    setDecisionTrail((prev) => [logEntry, ...prev]);

    // Persist to backend session if active
    if (data.session_token) {
      try {
        const res = await fetch(
          `${API_URL}/api/links/${data.session_token}/discrepancies/${itemId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              resolution_state: newState,
              resolution_reason_chip: reasonChip,
              resolution_note: note,
              actor_role: viewMode,
            }),
          }
        );
        if (res.ok) {
          const updated: AuditResponse = await res.json();
          setData(updated);
          setLastSynced(new Date().toLocaleTimeString());
          return;
        }
      } catch (err) {
        console.warn("Failed to persist discrepancy resolution:", err);
      }
    }

    // Fallback optimistic local update
    const updatedItems = data.items.map((it) =>
      it.id === itemId
        ? {
          ...it,
          resolution_state: newState,
          resolution_reason_chip: reasonChip,
          resolution_note: note,
          resolved_by: "US Buyer Import Specialist",
          resolved_at: timestamp,
        }
        : it
    );

    const remainingUnresolved = updatedItems.filter(
      (it) =>
        it.sev === "crit" &&
        (!it.resolution_state ||
          it.resolution_state === "UNRESOLVED" ||
          it.resolution_state === "REVISION_REQUESTED")
    ).length;

    setData({
      ...data,
      items: updatedItems,
      summary: {
        ...data.summary,
        status: remainingUnresolved === 0 ? "CLEARED_WITH_EXCEPTIONS" : "ACTION_REQUIRED",
      },
    });
  };

  const handleSubmitSupplierRevision = (itemId?: string) => {
    const timestamp = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    const logEntry: AuditDecisionLogEntry = {
      id: `DEC-${Date.now()}-rev`,
      discrepancy_id: itemId || "REVISION",
      title: "Supplier Submitted Corrected Tally Prime Invoice & PL",
      previous_state: "REVISION_REQUESTED",
      new_state: "ACCEPTED_EXCEPTION",
      action: "ACCEPT_VARIANCE",
      reason_chip: "Regenerated Tally Invoice & Scale Re-Weigh Completed",
      note: "Supplier resolved weight inversion & carton drift; HSN code synchronized to PO.",
      actor_role: "SUPPLIER_PORTAL",
      actor_name: data.metadata.exporter_name || "Supplier",
      timestamp,
    };
    setDecisionTrail((prev) => [logEntry, ...prev]);
  };

  const m = data.metadata || ({} as any);
  const isStatusBlocked =
    (data.summary?.status === "ACTION_REQUIRED" || data.summary?.status === "BLOCKED");

  return (
    <HighlightProvider>
      <div className="flex flex-col h-screen bg-gray-100 overflow-hidden font-sans">
        {/* ── Top Navigation Bar ── */}
        <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-xs z-10 relative">
          {/* Left: Logo + Shipment Info */}
          <div className="flex items-center gap-5">
              <div className="flex items-center gap-2.5">
                <img
                  src="/logo.png"
                  alt="PortGate Logo"
                  className="w-7 h-7 rounded-lg shadow-xs object-contain"
                />
                <span className="text-xl font-black text-slate-900 tracking-tight">PortGate</span>
                <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-mono">
                  v2.5
                </span>
                <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono border border-slate-200">
                  US Buyer Exception Workbench
                </span>
              </div>

              <div className="h-4 w-px bg-gray-300" />

              {/* Shipment Reference */}
              <div className="text-xs text-gray-600 flex items-center gap-1.5">
                <span className="font-semibold text-gray-900 font-mono">#{data.shipment_ref}</span>
                <span>·</span>
                <span>
                  {m?.port_of_loading || "INMUN1"} → {m?.port_of_discharge || "USLAX"}
                </span>
                {auditCount > 0 && (
                  <span className="text-[10px] text-gray-400 font-mono">(audit #{auditCount})</span>
                )}
              </div>

              {/* Overall Status Badge */}
              <div
                className={`px-2.5 py-1 rounded-full text-xs font-bold border ${isStatusBlocked
                  ? "bg-rose-50 text-rose-800 border-rose-300"
                  : data.summary.status === "CLEARED_WITH_EXCEPTIONS"
                    ? "bg-amber-50 text-amber-800 border-amber-300"
                    : "bg-emerald-50 text-emerald-800 border-emerald-300"
                  }`}
              >
                {data.summary.status}
              </div>

              {health && (
                <div
                  className={`hidden md:flex px-2 py-0.5 rounded text-[11px] font-medium border ${health.status === "ok"
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : "bg-gray-100 text-gray-600 border-gray-200"
                    }`}
                  title={`Backend: ${health.gemini_model}, Key: ${health.api_key_configured ? "✓" : "✗"}`}
                >
                  Engine: {health.status.toUpperCase()}
                </div>
              )}
            </div>

            {/* Center: Session Token & Revision Badge */}
            <div className="flex items-center gap-3">
              {data.session_token ? (
                <>
                  <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-lg">
                    <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider">
                      Token
                    </span>
                    <span className="font-mono text-xs font-bold text-indigo-900 max-w-[120px] truncate">
                      {data.session_token}
                    </span>
                  </div>

                  <div className="px-2.5 py-1 rounded-full text-[11px] font-bold border bg-blue-100 text-blue-800 border-blue-300 font-mono">
                    Revision #v{data.revision_number}
                  </div>

                  {lastSynced && (
                    <button
                      type="button"
                      onClick={() => syncSession(data.session_token)}
                      title="Click to sync latest status from supplier"
                      className="text-[10px] text-gray-500 hover:text-gray-800 font-mono flex items-center gap-1 transition-colors"
                    >
                      <span className={isSyncing ? "animate-spin" : ""}>🔄</span>
                      <span>synced {lastSynced}</span>
                    </button>
                  )}
                </>
              ) : (
                <div className="text-xs text-gray-400 italic">No active session</div>
              )}
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 relative">
              {/* Copy Supplier Revision Link */}
              <button
                type="button"
                disabled={!data.session_token}
                onClick={() => setShowMagicPopover((v) => !v)}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-1.5 px-3 rounded-lg transition-colors text-xs flex items-center gap-1.5 shadow-sm"
              >
                <span>🔗</span>
                <span>Copy Supplier Revision Link</span>
              </button>

              {showMagicPopover && data.session_token && (
                <MagicLinkPopover
                  token={data.session_token}
                  revisionNumber={data.revision_number}
                  onClose={() => setShowMagicPopover(false)}
                />
              )}

              <button
                type="button"
                onClick={() => setUploadModalOpen(true)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-1.5 px-3 rounded-lg transition-colors text-xs border border-gray-300 flex items-center gap-1"
              >
                <span>+</span>
                <span>Upload 3-Document Packet</span>
              </button>

              <button
                type="button"
                onClick={() => handleRunAudit(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-1.5 px-3.5 rounded-lg transition-colors text-xs flex items-center gap-1.5 shadow-sm"
              >
                <span>⚡</span>
                <span>Run Live 3-Way Audit</span>
              </button>
            </div>
        </nav>

        {/* Click outside to close popover */}
        {showMagicPopover && (
          <div className="fixed inset-0" onClick={() => setShowMagicPopover(false)} />
        )}

        {/* ── Buyer Workbench Context Banner ── */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white px-6 py-1.5 text-xs flex items-center justify-between border-b border-slate-950 shadow-inner">
          <div className="flex items-center gap-2">
            <span className="bg-blue-700 text-blue-100 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
              Buyer Workbench
            </span>
            <span>
              <b>{m?.importer_name || "Pacific Coast Retail Group LLC"}</b> — Import Compliance, PO Matching & Evidence-Backed Resolution
            </span>
          </div>
          <div className="flex items-center gap-3 text-blue-200 text-[11px] font-mono">
            <span>Mode: US Import PO Matching & Broker Entry Clearance</span>
            {data.session_token && (
              <span className="bg-blue-800 px-2 py-0.5 rounded text-blue-100">
                Session: {data.session_token} (rev v{data.revision_number})
              </span>
            )}
          </div>
        </div>

        {/* ── Main Workspace ── */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Pane: Document Viewer */}
          <div className="flex-1 overflow-hidden">
            <DocumentViewer data={data} isFixed={isFixed} decisionTrail={decisionTrail} />
          </div>

          {/* Right Pane: Audit Sidebar */}
          <div className="w-96 border-l border-gray-200 overflow-hidden bg-white flex flex-col">
            <AuditSidebar
              data={data}
              phase={phase}
              tolerancePct={tolerancePct}
              setTolerancePct={setTolerancePct}
              onRunAudit={handleRunAudit}
              onUpload={() => setUploadModalOpen(true)}
              onExport={() => setExportModalOpen(true)}
              isFixed={isFixed}
              setIsFixed={setIsFixed}
              setData={setData}
              viewMode={viewMode}
              decisionTrail={decisionTrail}
              onResolveItem={handleResolveItem}
              onSubmitSupplierRevision={handleSubmitSupplierRevision}
            />
          </div>
        </div>

        {/* ── Modals ── */}
        <UploadModal
          isOpen={uploadModalOpen}
          onClose={() => setUploadModalOpen(false)}
          onSuccess={handleUploadSuccess}
          tolerancePct={tolerancePct}
        />
        <ExportModal
          isOpen={exportModalOpen}
          onClose={() => setExportModalOpen(false)}
          data={data}
          decisionTrail={decisionTrail}
        />
      </div>
    </HighlightProvider>
  );
}
