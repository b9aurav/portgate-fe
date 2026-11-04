"use client";

import React, { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import { HighlightProvider, useHighlight } from "@/context/HighlightContext";
import { TopNavbar } from "@/components/layout/TopNavbar";
import { UploadPacketModal } from "@/components/layout/UploadPacketModal";
import { DocumentTabs } from "@/components/inspector/DocumentTabs";
import { DocumentCanvas } from "@/components/inspector/DocumentCanvas";
import { AuditSummaryCard } from "@/components/workbench/AuditSummaryCard";
import { DiscrepancyQueue } from "@/components/workbench/DiscrepancyQueue";
import { ExportModal } from "@/components/ExportModal";
import { DEFAULT_AUDIT_PACKET } from "@/lib/defaultPacket";
import { getSession, getShipment, getShipments, patchDiscrepancy } from "@/lib/api";
import type {
  AuditDecisionLogEntry,
  AuditResponse,
  ResolutionState,
  ShipmentListItem,
} from "@/lib/types";

const POLL_INTERVAL_MS = 3000;

function BuyerWorkbenchContent() {
  const params = useParams();
  const router = useRouter();
  const token = typeof params.token === "string" ? params.token : "";
  const { activeTab, setActiveTab } = useHighlight();

  // ── Core State ────────────────────────────────────────────────────────────
  const [data, setData] = useState<AuditResponse>(() => ({
    ...DEFAULT_AUDIT_PACKET,
    session_token: token || DEFAULT_AUDIT_PACKET.session_token || "shreeji-po-9921",
  }));
  const [shipments, setShipments] = useState<ShipmentListItem[]>([]);
  const [tolerancePct, setTolerancePct] = useState(5.0);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [decisionTrail, setDecisionTrail] = useState<AuditDecisionLogEntry[]>([]);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const viewMode = "BUYER_WORKBENCH" as const;
  const activeTokenRef = useRef<string>(token);

  useEffect(() => {
    activeTokenRef.current = token;
  }, [token]);

  // ── Session Sync & Shipments List Fetching ─────────────────────────────────
  const fetchShipmentsList = useCallback(async () => {
    try {
      const list = await getShipments();
      if (Array.isArray(list) && list.length > 0) {
        setShipments(list);
      }
    } catch (err) {
      console.warn("Failed to fetch shipments list:", err);
    }
  }, []);

  const syncSession = useCallback(
    async (targetToken: string) => {
      if (!targetToken) return;
      try {
        setIsSyncing(true);
        const [updated, list] = await Promise.allSettled([
          getShipment(targetToken),
          getShipments(),
        ]);

        if (targetToken !== activeTokenRef.current) return;

        if (updated.status === "fulfilled") {
          const res = updated.value;
          setData((prev) => ({
            ...prev,
            ...res,
            items: res.items || res.discrepancies || prev.items || [],
            discrepancies: res.discrepancies || res.items || prev.discrepancies || [],
          }));
          setLastSynced(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));

          // Rehydrate permanent decision trail from backend or synthesize from resolved items
          if (res.decision_trail && Array.isArray(res.decision_trail) && res.decision_trail.length > 0) {
            const seen = new Set<string>();
            const deduplicated = res.decision_trail.filter((entry: AuditDecisionLogEntry) => {
              if (
                entry.discrepancy_id &&
                (entry.action === "CLEARED_BY_REVISION" || entry.action === "CLEARED_IN_REVISION")
              ) {
                const key = `${entry.discrepancy_id}:${entry.action}`;
                if (seen.has(key)) return false;
                seen.add(key);
              }
              return true;
            });
            setDecisionTrail(deduplicated);
          } else {
            const resolvedItems = (res.discrepancies || res.items || []).filter(
              (it: any) =>
                it.resolution_state &&
                it.resolution_state !== "UNRESOLVED" &&
                it.resolution_state !== "REVISION_REQUESTED"
            );
            if (resolvedItems.length > 0) {
              const derived: AuditDecisionLogEntry[] = resolvedItems.map((it: any) => ({
                id: `DEC-${it.id}`,
                discrepancy_id: it.id,
                title: it.title,
                previous_state: "UNRESOLVED",
                new_state: it.resolution_state,
                action:
                  it.resolution_state === "ACCEPTED_EXCEPTION"
                    ? "ACCEPT_VARIANCE"
                    : it.resolution_state === "ESCALATED_TO_BROKER"
                    ? "ESCALATE_BROKER"
                    : it.resolution_state === "CLEARED_BY_REVISION" || it.resolution_state === "CLEARED_IN_REVISION"
                    ? "CLEARED_BY_REVISION"
                    : "REQUEST_REVISION",
                reason_chip: it.resolution_reason_chip || "Authorized Sign-Off",
                note: it.resolution_note,
                actor_role: (it.resolved_by?.includes("Supplier") ? "SUPPLIER_PORTAL" : "BUYER_WORKBENCH") as any,
                actor_name: it.resolved_by || "US Buyer Import Specialist",
                timestamp: it.resolved_at || "Verified",
              }));
              setDecisionTrail(derived);
            }
          }
        }

        if (list.status === "fulfilled" && Array.isArray(list.value)) {
          setShipments(list.value);
        }
      } catch (err) {
        console.warn("Failed to sync session:", err);
      } finally {
        setIsSyncing(false);
      }
    },
    []
  );

  // ── Initial Fetch on Mount or Token Change ────────────────────────────────
  useEffect(() => {
    if (token) {
      syncSession(token);
    } else {
      fetchShipmentsList();
    }
  }, [token, syncSession, fetchShipmentsList]);

  // ── Background Polling & Window Focus ─────────────────────────────────────
  useEffect(() => {
    if (!token) return;

    const onFocus = () => syncSession(token);
    window.addEventListener("focus", onFocus);

    const timer = setInterval(() => {
      syncSession(token);
    }, POLL_INTERVAL_MS);

    return () => {
      window.removeEventListener("focus", onFocus);
      clearInterval(timer);
    };
  }, [token, syncSession]);

  // ── Initial sync timestamp ────────────────────────────────────────────────
  useEffect(() => {
    setLastSynced(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
  }, []);

  // ── Upload Success Callback ───────────────────────────────────────────────
  const handleUploadSuccess = (auditData: AuditResponse) => {
    if (auditData.session_token && auditData.session_token !== token) {
      router.push(`/shipments/${auditData.session_token}`);
      return;
    }

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
    fetchShipmentsList();
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
    const effectiveToken = data.session_token || token;
    if (effectiveToken) {
      try {
        const updated = await patchDiscrepancy(effectiveToken, itemId, {
          resolution_state: newState,
          resolution_reason_chip: reasonChip,
          resolution_note: note,
          actor_role: viewMode,
        });
        setData(updated);
        if (updated.decision_trail && Array.isArray(updated.decision_trail) && updated.decision_trail.length > 0) {
          setDecisionTrail(updated.decision_trail);
        }
        setLastSynced(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
        fetchShipmentsList();
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
      {/* ── Top Navbar with Breadcrumb Switcher ── */}
      <TopNavbar
        data={data}
        isSyncing={isSyncing}
        lastSynced={lastSynced}
        onSync={() => syncSession(token || data.session_token)}
        onOpenUploadModal={() => setUploadModalOpen(true)}
        shipments={shipments}
        currentSessionToken={token || data.session_token}
      />

      {/* ── Main Workspace: 100% Full-Width Split Pane ── */}
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
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-slate-50">
          <div className="text-xs font-mono text-slate-500 animate-pulse">
            Loading PortGate Workbench...
          </div>
        </div>
      }
    >
      <HighlightProvider>
        <BuyerWorkbenchContent />
      </HighlightProvider>
    </Suspense>
  );
}

