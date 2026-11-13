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
import { AlertOctagon, Loader2, Sparkles, ShieldCheck } from "lucide-react";
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
  const [data, setData] = useState<AuditResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingElapsed, setLoadingElapsed] = useState(0);
  const [shipments, setShipments] = useState<ShipmentListItem[]>([]);
  const [tolerancePct, setTolerancePct] = useState(5.0);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [decisionTrail, setDecisionTrail] = useState<AuditDecisionLogEntry[]>([]);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  useEffect(() => {
    let t: NodeJS.Timeout | null = null;
    if (isLoading && !data) {
      t = setInterval(() => {
        setLoadingElapsed((prev) => prev + 1);
      }, 1000);
    } else {
      setLoadingElapsed(0);
    }
    return () => {
      if (t) clearInterval(t);
    };
  }, [isLoading, data]);

  const viewMode = "BUYER_WORKBENCH" as const;
  const activeTokenRef = useRef<string>(token);
  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingStoppedRef = useRef(false);

  const stopPolling = useCallback(() => {
    isPollingStoppedRef.current = true;
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
  }, []);

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
      if (!targetToken) {
        setIsLoading(false);
        return;
      }
      try {
        setIsSyncing(true);
        const [updated, list] = await Promise.allSettled([
          getShipment(targetToken),
          getShipments(),
        ]);

        if (targetToken !== activeTokenRef.current) return;

        if (updated.status === "rejected") {
          const reason: any = updated.reason;
          const statusCode =
            reason?.status ??
            (typeof reason?.message === "string" && reason.message.includes("404")
              ? 404
              : typeof reason?.message === "string" && reason.message.includes("403")
                ? 403
                : null);

          if (statusCode === 404 || statusCode === 403) {
            console.warn(`Shipment session '${targetToken}' returned ${statusCode}. Stopping background polling.`);
            stopPolling();

            // Try to find if this shipment was rotated to a new session_token
            if (list.status === "fulfilled" && Array.isArray(list.value)) {
              setShipments(list.value);
              const poNum = data?.packet?.buyer_po?.po_number;
              const matching = list.value.find(
                (s) => s.session_token !== targetToken && poNum && s.po_number === poNum
              );
              if (matching) {
                setBannerMessage(`Session was rotated. Redirecting to active session '${matching.session_token}'...`);
                setTimeout(() => {
                  router.replace(`/shipments/${matching.session_token}`);
                }, 1200);
                return;
              }
            }

            setBannerMessage(`Shipment session '${targetToken}' is no longer active (rotated, expired, or deleted). Redirecting to queue...`);
            setTimeout(() => {
              router.push("/");
            }, 2500);
            return;
          }
        }

        if (updated.status === "fulfilled") {
          const res = updated.value;
          setData((prev) => ({
            ...(prev || ({} as AuditResponse)),
            ...res,
            items: res.items || res.discrepancies || prev?.items || [],
            discrepancies: res.discrepancies || res.items || prev?.discrepancies || [],
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
        setIsLoading(false);
      }
    },
    [data?.packet?.buyer_po?.po_number, router, stopPolling]
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
    isPollingStoppedRef.current = false;

    const onFocus = () => {
      if (!isPollingStoppedRef.current) {
        syncSession(token);
      }
    };
    window.addEventListener("focus", onFocus);

    pollingTimerRef.current = setInterval(() => {
      if (!isPollingStoppedRef.current) {
        syncSession(token);
      }
    }, POLL_INTERVAL_MS);

    return () => {
      window.removeEventListener("focus", onFocus);
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
        pollingTimerRef.current = null;
      }
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
    if (!data) return;
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

  if (isLoading && !data) {
    return (
        <div className="relative flex flex-col h-screen bg-slate-100 overflow-hidden font-sans">
          {/* Skeleton Top Navbar */}
          <div className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between animate-pulse">
            <div className="flex items-center gap-4">
              <div className="h-7 w-28 bg-slate-200 rounded" />
              <div className="h-5 w-px bg-slate-200 mx-1" />
              <div className="h-6 w-36 bg-slate-200 rounded" />
              <div className="h-5 w-24 bg-slate-100 rounded" />
            </div>
            <div className="flex items-center gap-3">
              <div className="h-8 w-32 bg-slate-200 rounded" />
              <div className="h-8 w-24 bg-slate-200 rounded" />
            </div>
          </div>

          {/* Skeleton Split Pane */}
            <div className="flex flex-1 overflow-hidden opacity-40">
              <div className="flex-1 flex flex-col bg-slate-50 border-r border-slate-200 p-6 space-y-4 animate-pulse">
                <div className="h-10 w-96 bg-slate-200 rounded" />
                <div className="h-64 bg-slate-200 rounded-lg" />
                <div className="h-48 bg-slate-200 rounded-lg" />
              </div>
              <div className="w-[420px] bg-white p-6 space-y-4 border-l border-slate-200 animate-pulse">
                <div className="h-36 bg-slate-200 rounded-xl" />
                <div className="h-10 bg-slate-200 rounded" />
                <div className="h-28 bg-slate-200 rounded-lg" />
                <div className="h-28 bg-slate-200 rounded-lg" />
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
                    Loading Compliance Workbench
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 font-mono">
                    {token ? `Session: ${token}` : "Retrieving shipment data..."}
                  </p>
                </div>

                <div className="pt-1">
                  <span className="inline-block text-[11px] font-mono font-medium text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-full">
                    {loadingElapsed}s elapsed
                  </span>
                </div>

                {loadingElapsed >= 4 && (
                  <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-left leading-relaxed">
                    ⚡ <strong>Free Tier Spin-Up:</strong> Render web services spin down after inactivity. Waking up the container takes ~30–45s on first request.
                  </p>
                )}
              </div>
            </div>
          </div>
          );
  }

          if (!data && bannerMessage) {
    return (
          <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center select-none font-sans">
            <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-8 flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-4">
                <AlertOctagon className="w-6 h-6" strokeWidth={1.75} />
              </div>
              <h2 className="text-base font-bold text-slate-900 mb-1.5">
                Session Rotated or Inactive
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed mb-6">
                {bannerMessage}
              </p>
            </div>
          </div>
          );
  }

          if (!data) {
    return null;
  }

          return (
          <div className="flex flex-col h-screen bg-slate-100 overflow-hidden font-sans">
            {bannerMessage && (
              <div
                data-testid="session-status-banner"
                className="bg-amber-500 text-white text-xs font-semibold px-4 py-2 flex items-center justify-between shadow-md z-50 animate-fadeIn"
              >
                <div className="flex items-center gap-2">
                  <AlertOctagon className="w-4 h-4 shrink-0" />
                  <span>{bannerMessage}</span>
                </div>
              </div>
            )}
            {/* ── Top Navbar with Breadcrumb Switcher ── */}
            <TopNavbar
              data={data}
              isSyncing={isSyncing}
              lastSynced={lastSynced}
              onSync={() => syncSession(token || data.session_token)}
              onOpenUploadModal={() => setUploadModalOpen(true)}
              shipments={shipments}
              currentSessionToken={token || data.session_token}
              onSessionUpdate={(updated) => setData(updated)}
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

