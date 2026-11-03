"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { HighlightProvider, useHighlight } from "@/context/HighlightContext";
import { TopNavbar } from "@/components/layout/TopNavbar";
import { UploadPacketModal } from "@/components/layout/UploadPacketModal";
import { DocumentTabs } from "@/components/inspector/DocumentTabs";
import { DocumentCanvas } from "@/components/inspector/DocumentCanvas";
import { AuditSummaryCard } from "@/components/workbench/AuditSummaryCard";
import { DiscrepancyQueue } from "@/components/workbench/DiscrepancyQueue";
import { ExportModal } from "@/components/ExportModal";
import { DEFAULT_AUDIT_PACKET } from "@/lib/defaultPacket";
import { getSession, patchDiscrepancy } from "@/lib/api";
import type {
  AuditDecisionLogEntry,
  AuditResponse,
  ResolutionState,
} from "@/lib/types";

const POLL_INTERVAL_MS = 3000;

function BuyerWorkbenchContent() {
  const { activeTab, setActiveTab } = useHighlight();

  // ── Core State ────────────────────────────────────────────────────────────
  const [data, setData] = useState<AuditResponse>(DEFAULT_AUDIT_PACKET);
  const [tolerancePct, setTolerancePct] = useState(5.0);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [decisionTrail, setDecisionTrail] = useState<AuditDecisionLogEntry[]>([]);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const viewMode = "BUYER_WORKBENCH" as const;
  const activeTokenRef = useRef<string>(data.session_token || "");

  useEffect(() => {
    activeTokenRef.current = data.session_token || "";
  }, [data.session_token]);

  // ── Session Sync & Background Polling ─────────────────────────────────────
  const syncSession = useCallback(async (token: string) => {
    if (!token || token !== activeTokenRef.current) return;
    try {
      setIsSyncing(true);
      const updated = await getSession(token);
      if (token !== activeTokenRef.current) return;

      setData((prev) => ({
        ...prev,
        ...updated,
        items: updated.items || updated.discrepancies || prev.items || [],
        discrepancies: updated.discrepancies || updated.items || prev.discrepancies || [],
      }));
      setLastSynced(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    } catch (err) {
      console.warn("Failed to sync session:", err);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    const token = data.session_token;
    if (!token) return;

    // Window focus refresh
    const onFocus = () => syncSession(token);
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

  // ── Initial sync timestamp ────────────────────────────────────────────────
  useEffect(() => {
    setLastSynced(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
  }, []);

  // ── Upload Success Callback ───────────────────────────────────────────────
  const handleUploadSuccess = (auditData: AuditResponse) => {
    activeTokenRef.current = auditData.session_token;
    setData({
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
    });
    setDecisionTrail([]);
    setLastSynced(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
  };

  // ── Discrepancy Resolution (Sign-Off) ─────────────────────────────────────
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
    const targetItem = data.items?.find((it) => it.id === itemId);
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

    // Persist to backend session
    if (data.session_token) {
      try {
        const updated = await patchDiscrepancy(data.session_token, itemId, {
          resolution_state: newState,
          resolution_reason_chip: reasonChip,
          resolution_note: note,
          actor_role: viewMode,
        });
        setData(updated);
        setLastSynced(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
        return;
      } catch (err) {
        console.warn("Backend resolution failed; applying optimistic fallback:", err);
      }
    }

    // Optimistic fallback
    const updatedItems = (data.items || []).map((it) =>
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

  return (
    <div className="flex flex-col h-screen bg-slate-100 overflow-hidden font-sans">
      {/* ── Top Navbar ── */}
      <TopNavbar
        data={data}
        isSyncing={isSyncing}
        lastSynced={lastSynced}
        onSync={() => syncSession(data.session_token)}
        onOpenUploadModal={() => setUploadModalOpen(true)}
      />

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
            decisionTrail={decisionTrail}
          />
        </div>

        {/* Right Pane: Triage Workbench */}
        <div className="w-[420px] bg-white flex flex-col overflow-hidden shadow-xs border-l border-slate-200">
          <AuditSummaryCard
            data={data}
            viewMode={viewMode}
            onExport={() => setExportModalOpen(true)}
          />
          <DiscrepancyQueue
            data={data}
            viewMode={viewMode}
            onResolveItem={handleResolveItem}
          />
        </div>
      </div>

      {/* ── Modals ── */}
      <UploadPacketModal
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
  );
}

export default function BuyerWorkbenchPage() {
  return (
    <HighlightProvider>
      <BuyerWorkbenchContent />
    </HighlightProvider>
  );
}

