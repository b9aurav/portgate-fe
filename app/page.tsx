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
  MagicLinkSession,
  ResolutionState,
  SubmissionStatus,
} from "@/types/audit";

type Phase = "idle" | "run" | "done";

const ACTIVE_TOKEN = "shreeji-po-9921";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const POLL_INTERVAL_MS = 3000;

// ────────────────────────────────────────────────────────────────────────────
// Submission status badge styles
// ────────────────────────────────────────────────────────────────────────────
const STATUS_BADGE: Record<SubmissionStatus, { cls: string; label: string }> = {
  AWAITING_SUPPLIER_UPLOAD: {
    cls: "bg-gray-100 text-gray-600 border-gray-300",
    label: "⏳ Awaiting Supplier Upload",
  },
  DISCREPANCIES_FLAGGED: {
    cls: "bg-rose-100 text-rose-800 border-rose-300",
    label: "🚫 Discrepancies Flagged",
  },
  SUBMITTED_FOR_BUYER_REVIEW: {
    cls: "bg-amber-100 text-amber-800 border-amber-300",
    label: "📬 Submitted for Review",
  },
  CLEARED: {
    cls: "bg-emerald-100 text-emerald-800 border-emerald-300",
    label: "✓ Cleared",
  },
};

// ────────────────────────────────────────────────────────────────────────────
// Magic Link Popover component
// ────────────────────────────────────────────────────────────────────────────
function MagicLinkPopover({ token, onClose }: { token: string; onClose: () => void }) {
  const url = `http://localhost:3000/upload/${token}`;
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="absolute top-14 right-0 z-50 w-96 bg-white border border-gray-200 rounded-xl shadow-2xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="font-bold text-sm text-gray-900">🔗 Supplier Magic Upload Link</div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-lg leading-none"
        >
          ×
        </button>
      </div>

      {/* Description */}
      <div className="text-xs text-gray-600 leading-relaxed">
        Share this zero-login link with your Indian supplier. They can upload their Tally
        Invoice and Packing List without creating an account.
      </div>

      {/* Token badge */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2">
        <div className="text-[10px] text-indigo-500 font-semibold uppercase tracking-wider mb-1">
          Session Token
        </div>
        <div className="font-mono text-sm font-bold text-indigo-900">{token}</div>
      </div>

      {/* URL display */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
        <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-1">
          Supplier Upload URL
        </div>
        <div className="font-mono text-xs text-gray-700 break-all">{url}</div>
      </div>

      {/* Copy button */}
      <button
        onClick={handleCopy}
        className={`w-full py-2.5 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
          copied
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
            <span>Copy for Incognito Window</span>
          </>
        )}
      </button>

      {/* Hint */}
      <div className="text-[11px] text-gray-500 text-center italic">
        Open in an Incognito/Private window to simulate the supplier&apos;s experience
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Main Page
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

  // Buyer Workbench is the only role on this page
  const viewMode = "BUYER_WORKBENCH" as const;

  // ── Magic-link session state ──────────────────────────────────────────────
  const [session, setSession] = useState<MagicLinkSession | null>(null);
  const [showMagicPopover, setShowMagicPopover] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Health check ─────────────────────────────────────────────────────────
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

  // ── Magic-link polling ────────────────────────────────────────────────────
  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/links/${ACTIVE_TOKEN}`);
      if (!res.ok) return;
      const s: MagicLinkSession = await res.json();
      setSession(s);
      setLastSynced(new Date().toLocaleTimeString());
    } catch {
      // Network error — keep stale state
    }
  }, []);

  useEffect(() => {
    fetchSession();
    pollRef.current = setInterval(fetchSession, POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchSession]);

  // ── Audit handlers ────────────────────────────────────────────────────────
  const handleRunAudit = async (mock: boolean) => {
    setPhase("run");
    setIsFixed(false);
    setDecisionTrail([]);
    await new Promise((resolve) => setTimeout(resolve, 2000));

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
      setData(auditData);
      setPhase("done");
    } catch (err) {
      console.error("Audit failed:", err);
      alert(`Audit failed: ${err instanceof Error ? err.message : "Unknown error"}`);
      setPhase("done");
    }
  };

  const handleUploadSuccess = (auditData: AuditResponse) => {
    setData(auditData);
    setPhase("done");
    setIsFixed(false);
    setDecisionTrail([]);
    setAuditCount((prev) => prev + 1);
  };

  // ── Resolve discrepancy (persists to backend session) ────────────────────
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

    // Persist to backend session if we have one
    if (session) {
      try {
        await fetch(`${API_URL}/api/links/${ACTIVE_TOKEN}/discrepancies/${itemId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            resolution_state: newState,
            resolution_reason_chip: reasonChip,
            resolution_note: note,
            actor_role: viewMode,
          }),
        });
        // Refresh session to pick up updated status
        await fetchSession();
      } catch (err) {
        console.warn("Failed to persist discrepancy resolution:", err);
      }
    }

    // Optimistic local update
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
      actor_name: "Shreeji Textiles (Surat, IN)",
      timestamp,
    };
    setDecisionTrail((prev) => [logEntry, ...prev]);
  };

  const m = data.metadata;
  const isStatusBlocked =
    data.summary.status === "ACTION_REQUIRED" || data.summary.status === "BLOCKED";

  const submissionStatus = session?.submission_status ?? "AWAITING_SUPPLIER_UPLOAD";
  const statusBadge = STATUS_BADGE[submissionStatus];

  return (
    <HighlightProvider>
      <div className="flex flex-col h-screen bg-gray-100 overflow-hidden font-sans">
        {/* ── Top Navigation Bar ── */}
        <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-xs z-10 relative">
          {/* Left: Logo + Shipment Info */}
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2">
              <span className="text-xl font-black text-blue-600 tracking-tight">PortGate</span>
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
                {m.port_of_loading} → {m.port_of_discharge}
              </span>
              {auditCount > 0 && (
                <span className="text-[10px] text-gray-400 font-mono">(audit #{auditCount})</span>
              )}
            </div>

            {/* Overall Status Badge */}
            <div
              className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                isStatusBlocked
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
                className={`hidden md:flex px-2 py-0.5 rounded text-[11px] font-medium border ${
                  health.status === "ok"
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : "bg-gray-100 text-gray-600 border-gray-200"
                }`}
                title={`Backend: ${health.gemini_model}, Key: ${health.api_key_configured ? "✓" : "✗"}`}
              >
                Engine: {health.status.toUpperCase()}
              </div>
            )}
          </div>

          {/* Center: Supplier Session Status */}
          <div className="flex items-center gap-3">
            {/* Active Token */}
            <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-lg">
              <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider">Token</span>
              <span className="font-mono text-xs font-bold text-indigo-900">{ACTIVE_TOKEN}</span>
            </div>

            {/* Submission Status */}
            <div
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${statusBadge.cls}`}
            >
              {statusBadge.label}
            </div>

            {/* Sync indicator */}
            {lastSynced && (
              <div className="text-[10px] text-gray-400 font-mono">
                synced {lastSynced}
              </div>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 relative">
            {/* Generate / Copy Supplier Magic Link */}
            <button
              type="button"
              onClick={() => setShowMagicPopover((v) => !v)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-1.5 px-3 rounded-lg transition-colors text-xs flex items-center gap-1.5 shadow-sm"
            >
              <span>🔗</span>
              <span>Supplier Magic Link</span>
            </button>

            {showMagicPopover && (
              <MagicLinkPopover
                token={ACTIVE_TOKEN}
                onClose={() => setShowMagicPopover(false)}
              />
            )}

            <button
              type="button"
              onClick={() => setUploadModalOpen(true)}
              className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-1.5 px-3 rounded-lg transition-colors text-xs border border-gray-300 flex items-center gap-1"
            >
              <span>+</span>
              <span>Custom Packet</span>
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
          <div
            className="fixed inset-0"
            onClick={() => setShowMagicPopover(false)}
          />
        )}

        {/* ── Buyer Workbench Context Banner ── */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white px-6 py-1.5 text-xs flex items-center justify-between border-b border-slate-950 shadow-inner">
          <div className="flex items-center gap-2">
            <span className="bg-blue-700 text-blue-100 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
              Buyer Workbench
            </span>
            <span>
              <b>Pacific Coast Retail Group LLC (Los Angeles, CA, USA)</b> — Import Compliance, PO
              Matching & Evidence-Backed Resolution
            </span>
          </div>
          <div className="flex items-center gap-3 text-blue-200 text-[11px] font-mono">
            <span>Mode: US Import PO Matching & Broker Entry Clearance</span>
            {session?.latest_audit && (
              <span className="bg-blue-800 px-2 py-0.5 rounded text-blue-100">
                Supplier audit: {session.latest_audit.summary.total_findings} finding(s)
              </span>
            )}
          </div>
        </div>

        {/* ── Main Workspace ── */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Pane: Document Viewer */}
          <div className="flex-1 overflow-hidden">
            <DocumentViewer
              data={data}
              isFixed={isFixed}
              decisionTrail={decisionTrail}
            />
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
