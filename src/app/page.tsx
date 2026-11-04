"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  UploadCloud,
  Package,
  AlertOctagon,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Search,
  ArrowRight,
  Link2,
  Check,
  RefreshCw,
  Filter,
  Trash2,
  RotateCcw,
  LogIn,
  LogOut,
  UserCheck,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { UploadPacketModal } from "@/components/layout/UploadPacketModal";
import { deleteShipment, getSession, getShipments, resetWorkspace } from "@/lib/api";
import type { AuditResponse, ShipmentListItem } from "@/lib/types";

type StatusFilter = "ALL" | "ACTION_REQUIRED" | "AWAITING_SUPPLIER" | "CLEARED";

export default function ShipmentQueueDashboard() {
  const router = useRouter();
  const { user, signOut } = useAuth();

  // ── State ─────────────────────────────────────────────────────────────────
  const [shipments, setShipments] = useState<ShipmentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  const isFetchingRef = useRef(false);

  // ── Fetch Shipments ───────────────────────────────────────────────────────
  const fetchShipments = useCallback(async (isBackground = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      if (!isBackground) setIsRefreshing(true);
      const list = await getShipments();
      if (Array.isArray(list)) {
        setShipments(list);
      }
    } catch (err) {
      console.warn("Failed to fetch shipments:", err);
      // Fallback seed if backend is still spinning up
      setShipments((prev) => {
        if (prev.length > 0) return prev;
        return [
          {
            session_token: "shreeji-po-9921",
            shipment_id: "SHP-2026-8841",
            corridor: "INMUN1 → USLAX",
            po_number: "PO-PCR-45012",
            invoice_number: "SHR/EXP/26-27/0412",
            exporter_name: "Shreeji Textiles & Apparel Pvt. Ltd.",
            buyer_name: "Pacific Coast Retail Group LLC",
            total_invoice_usd: 33120.0,
            revision_number: 1,
            status: "ACTION_REQUIRED",
            unresolved_count: 3,
            deterministic_conflict_count: 2,
            commercial_variance_count: 1,
            compliance_advisory_count: 0,
            updated_at: new Date().toISOString(),
          },
        ];
      });
    } finally {
      setLoading(false);
      setIsRefreshing(false);
      isFetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    fetchShipments();

    // 5-second polling to capture real-time supplier uploads or buyer resolutions
    const timer = setInterval(() => {
      fetchShipments(true);
    }, 5000);

    return () => clearInterval(timer);
  }, [fetchShipments]);

  // ── Live KPI Computations ─────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const totalCount = shipments.length;
    const totalUsd = shipments.reduce((sum, s) => sum + (s.total_invoice_usd || 0), 0);

    const actionRequiredCount = shipments.filter(
      (s) => s.status === "ACTION_REQUIRED" || s.status === "BUYER_REVIEW"
    ).length;

    const awaitingSupplierCount = shipments.filter(
      (s) => s.status === "AWAITING_SUPPLIER_REVISION"
    ).length;

    const clearedCount = shipments.filter(
      (s) =>
        s.unresolved_count === 0 ||
        s.status === "CLEARED_WITH_EXCEPTIONS" ||
        s.status === "VERIFIED_CLEAN"
    ).length;

    return {
      totalCount,
      totalUsd,
      actionRequiredCount,
      awaitingSupplierCount,
      clearedCount,
    };
  }, [shipments]);

  // ── Filtered Shipments ────────────────────────────────────────────────────
  const filteredShipments = useMemo(() => {
    return shipments.filter((item) => {
      // Status Filter
      if (
        statusFilter === "ACTION_REQUIRED" &&
        item.status !== "ACTION_REQUIRED" &&
        item.status !== "BUYER_REVIEW"
      ) {
        return false;
      }
      if (
        statusFilter === "AWAITING_SUPPLIER" &&
        item.status !== "AWAITING_SUPPLIER_REVISION"
      ) {
        return false;
      }
      if (
        statusFilter === "CLEARED" &&
        item.unresolved_count > 0 &&
        item.status !== "CLEARED_WITH_EXCEPTIONS" &&
        item.status !== "VERIFIED_CLEAN"
      ) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches =
          (item.shipment_id || "").toLowerCase().includes(q) ||
          (item.po_number || "").toLowerCase().includes(q) ||
          (item.invoice_number || "").toLowerCase().includes(q) ||
          (item.exporter_name || "").toLowerCase().includes(q) ||
          (item.corridor || "").toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [shipments, statusFilter, searchQuery]);

  // ── Copy Supplier Revision Link ───────────────────────────────────────────
  const handleCopyLink = async (e: React.MouseEvent, token: string) => {
    e.stopPropagation();
    const origin =
      typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    const url = `${origin}/upload/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2000);
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  };

  // ── Delete Test Shipment Run ─────────────────────────────────────────────
  const handleDeleteShipment = async (e: React.MouseEvent, token: string) => {
    e.stopPropagation();
    // Optimistic removal
    setShipments((prev) => prev.filter((s) => s.session_token !== token));
    try {
      await deleteShipment(token);
    } catch (err) {
      console.error("Failed to delete shipment:", err);
      fetchShipments();
    }
  };

  // ── Reset Sandbox Workspace ─────────────────────────────────────────────
  const handleResetSandbox = async () => {
    if (isResetting) return;
    try {
      setIsResetting(true);
      await resetWorkspace();
      await fetchShipments();
    } catch (err) {
      console.error("Failed to reset sandbox workspace:", err);
    } finally {
      setIsResetting(false);
    }
  };

  // ── Upload Modal Success Handler ──────────────────────────────────────────
  const handleUploadSuccess = (newAudit: AuditResponse) => {
    setUploadModalOpen(false);
    if (newAudit.session_token) {
      router.push(`/shipments/${newAudit.session_token}`);
    } else {
      fetchShipments();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      {/* ── Dashboard Header Bar ── */}
      <header className="h-16 bg-white border-b border-slate-200 px-6 sm:px-8 flex items-center justify-between sticky top-0 z-20 select-none shadow-xs">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 hover:opacity-95 transition-opacity">
            <img
              src="/portgate-lockup.png"
              alt="PortGate"
              className="h-7 w-auto object-contain cursor-pointer"
            />
          </Link>
          <div className="h-5 w-px bg-slate-200 hidden sm:block" />
          <span className="hidden sm:inline-flex items-center text-xs font-semibold text-slate-600 bg-slate-100 border border-slate-200/80 px-2.5 py-1 rounded-md">
            Import Compliance & 3-Way Match Queue
          </span>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3">
          {user ? (
            <>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-md">
                <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span className="max-w-[140px] truncate sm:max-w-none">{user.email}</span>
              </span>
              <button
                type="button"
                onClick={() => signOut()}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer select-none"
                title="Sign out of PortGate"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </>
          ) : (
            <>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                <span className="hidden md:inline">Private Sandbox</span>
              </span>

              <button
                type="button"
                onClick={handleResetSandbox}
                disabled={isResetting}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer select-none"
                title="Reset sandbox to initial clean demo state"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? "animate-spin text-indigo-600" : ""}`} />
                <span className="hidden sm:inline">Reset Sandbox</span>
              </button>

              <Link
                href="/login"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 hover:text-slate-900 transition cursor-pointer select-none shadow-2xs"
                title="Sign in or save sandbox workspace"
              >
                <LogIn className="w-3.5 h-3.5 text-indigo-600" />
                <span className="hidden sm:inline">Sign In / Save Workspace</span>
              </Link>
            </>
          )}

          <button
            type="button"
            onClick={() => fetchShipments()}
            disabled={isRefreshing}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Refresh active container queue"
          >
            <RefreshCw
              className={`w-4 h-4 ${isRefreshing ? "animate-spin text-indigo-600" : ""}`}
            />
          </button>

          <button
            type="button"
            onClick={() => setUploadModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs shadow-sm transition-all cursor-pointer active:scale-[0.98]"
          >
            <UploadCloud className="w-4 h-4 shrink-0" />
            <span>+ Audit New Shipment Packet (3 PDFs)</span>
          </button>
        </div>
      </header>

      {/* ── Main Container ── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-7 flex flex-col">
        {/* ── Top 4-Card KPI Strip ── */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Card 1: Total Active Shipments */}
          <div
            onClick={() => setStatusFilter("ALL")}
            className={`p-4 rounded-xl border bg-white shadow-xs transition-all cursor-pointer select-none ${statusFilter === "ALL"
                ? "border-indigo-400 ring-2 ring-indigo-500/20 shadow-sm"
                : "border-slate-200 hover:border-slate-300"
              }`}
          >
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Total Active
              </span>
              <div className="p-1.5 rounded-lg bg-slate-100 text-slate-600">
                <Package className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-slate-900">
                {kpis.totalCount}
              </span>
              <span className="text-xs text-slate-500 font-medium">containers</span>
            </div>
            <div className="mt-1 text-xs text-slate-500 font-mono">
              ${kpis.totalUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} under audit
            </div>
          </div>

          {/* Card 2: Action Required (Buyer) */}
          <div
            onClick={() => setStatusFilter("ACTION_REQUIRED")}
            className={`p-4 rounded-xl border bg-white shadow-xs transition-all cursor-pointer select-none ${kpis.actionRequiredCount > 0
                ? statusFilter === "ACTION_REQUIRED"
                  ? "border-rose-400 ring-2 ring-rose-500/20 bg-rose-50/20 shadow-sm"
                  : "border-rose-200 hover:border-rose-300 bg-rose-50/10"
                : statusFilter === "ACTION_REQUIRED"
                  ? "border-indigo-400 ring-2 ring-indigo-500/20 shadow-sm"
                  : "border-slate-200 hover:border-slate-300"
              }`}
          >
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-rose-700">
                Action Required
              </span>
              <div className="p-1.5 rounded-lg bg-rose-100 text-rose-600">
                <AlertOctagon className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-rose-700">
                {kpis.actionRequiredCount}
              </span>
              <span className="text-xs text-rose-600/80 font-medium">
                {kpis.actionRequiredCount === 1 ? "needs buyer review" : "need buyer review"}
              </span>
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Unresolved math or commercial variances
            </div>
          </div>

          {/* Card 3: Awaiting Supplier Revision */}
          <div
            onClick={() => setStatusFilter("AWAITING_SUPPLIER")}
            className={`p-4 rounded-xl border bg-white shadow-xs transition-all cursor-pointer select-none ${kpis.awaitingSupplierCount > 0
                ? statusFilter === "AWAITING_SUPPLIER"
                  ? "border-amber-400 ring-2 ring-amber-500/20 bg-amber-50/20 shadow-sm"
                  : "border-amber-200 hover:border-amber-300 bg-amber-50/10"
                : statusFilter === "AWAITING_SUPPLIER"
                  ? "border-indigo-400 ring-2 ring-indigo-500/20 shadow-sm"
                  : "border-slate-200 hover:border-slate-300"
              }`}
          >
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">
                Awaiting Supplier
              </span>
              <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-amber-700">
                {kpis.awaitingSupplierCount}
              </span>
              <span className="text-xs text-amber-600/80 font-medium">pending v2 revision</span>
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Hard conflicts flagged for correction
            </div>
          </div>

          {/* Card 4: Cleared for Customs */}
          <div
            onClick={() => setStatusFilter("CLEARED")}
            className={`p-4 rounded-xl border bg-white shadow-xs transition-all cursor-pointer select-none ${kpis.clearedCount > 0
                ? statusFilter === "CLEARED"
                  ? "border-emerald-400 ring-2 ring-emerald-500/20 bg-emerald-50/20 shadow-sm"
                  : "border-emerald-200 hover:border-emerald-300 bg-emerald-50/10"
                : statusFilter === "CLEARED"
                  ? "border-indigo-400 ring-2 ring-indigo-500/20 shadow-sm"
                  : "border-slate-200 hover:border-slate-300"
              }`}
          >
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                Cleared for Customs
              </span>
              <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-emerald-700">
                {kpis.clearedCount}
              </span>
              <span className="text-xs text-emerald-600/80 font-medium">0 blockers remaining</span>
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Docs Reconciled · Ready for Broker Handoff
            </div>
          </div>
        </section>

        {/* ── High-Density Shipments Table Section ── */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col flex-1 overflow-hidden">
          {/* Controls Toolbar: Search & Filter Tabs */}
          <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by PO #, Invoice #, Shipment ID, or Supplier..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              <button
                type="button"
                onClick={() => setStatusFilter("ALL")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer shrink-0 ${statusFilter === "ALL"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
              >
                All ({kpis.totalCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("ACTION_REQUIRED")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer shrink-0 ${statusFilter === "ACTION_REQUIRED"
                    ? "bg-rose-600 text-white shadow-xs"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
              >
                Action Required ({kpis.actionRequiredCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("AWAITING_SUPPLIER")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer shrink-0 ${statusFilter === "AWAITING_SUPPLIER"
                    ? "bg-amber-600 text-white shadow-xs"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
              >
                Awaiting Supplier ({kpis.awaitingSupplierCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("CLEARED")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer shrink-0 ${statusFilter === "CLEARED"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
              >
                Cleared ({kpis.clearedCount})
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500 uppercase tracking-wider select-none whitespace-nowrap">
                  <th className="py-3 pl-4 pr-3">Shipment & Order Ref</th>
                  <th className="py-3 px-3">Supplier / Exporter</th>
                  <th className="py-3 px-2 text-center w-20">Revision</th>
                  <th className="py-3 px-3">Conflict Breakdown</th>
                  <th className="py-3 px-3">Queue Status</th>
                  <th className="py-3 pl-2 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                        <span className="font-mono text-xs">Loading shipment queue...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredShipments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      <div className="max-w-sm mx-auto flex flex-col items-center">
                        <Filter className="w-8 h-8 text-slate-300 mb-2" />
                        <div className="font-medium text-slate-700 text-sm">No shipments found</div>
                        <p className="text-slate-400 text-xs mt-1">
                          No shipments match the current search query or status filter.
                        </p>
                        {(searchQuery || statusFilter !== "ALL") && (
                          <button
                            type="button"
                            onClick={() => {
                              setSearchQuery("");
                              setStatusFilter("ALL");
                            }}
                            className="mt-3 text-xs font-medium text-indigo-600 hover:text-indigo-800"
                          >
                            Reset all filters
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredShipments.map((row) => {
                    const isBuyerReview =
                      row.status === "BUYER_REVIEW" ||
                      (row.status === "ACTION_REQUIRED" &&
                        row.deterministic_conflict_count === 0 &&
                        (row.commercial_variance_count > 0 || row.compliance_advisory_count > 0));
                    const isAction = row.status === "ACTION_REQUIRED" && !isBuyerReview;
                    const isAwaiting = row.status === "AWAITING_SUPPLIER_REVISION";
                    const isClearedExceptions = row.status === "CLEARED_WITH_EXCEPTIONS";
                    const isClean = row.status === "VERIFIED_CLEAN";

                    const statusBadgeLabel = isAction
                      ? "ACTION REQUIRED"
                      : isBuyerReview
                        ? "BUYER REVIEW"
                        : isAwaiting
                          ? "AWAITING SUPPLIER V2"
                          : isClearedExceptions
                            ? "CLEARED WITH EXCEPTIONS"
                            : "VERIFIED CLEAN";

                    const statusBadgeClass = isAction
                      ? "bg-rose-50 text-rose-700 border-rose-200"
                      : isBuyerReview
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : isAwaiting
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : isClearedExceptions
                            ? "bg-teal-50 text-teal-700 border-teal-200"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200";

                    const isCopied = copiedToken === row.session_token;

                    return (
                      <tr
                        key={row.session_token}
                        onClick={() => router.push(`/shipments/${row.session_token}`)}
                        className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                      >
                        {/* 1. Combined: Shipment & Route + PO & Invoice Ref */}
                        <td className="py-3 pl-4 pr-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                              #{row.shipment_id || "SHP-2026-8841"}
                            </span>
                            <span className="font-mono text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/80 whitespace-nowrap inline-flex items-center">
                              {row.corridor || "INMUN1 → USLAX"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500 whitespace-nowrap">
                            <span className="font-semibold text-slate-800">{row.po_number}</span>
                            <span className="text-slate-300">·</span>
                            <span className="font-mono text-[11px] text-slate-500">
                              {row.invoice_number || "Pending Invoice"}
                            </span>
                          </div>
                        </td>

                        {/* 2. Supplier / Exporter */}
                        <td className="py-3 px-3">
                          <div className="font-medium text-slate-900 truncate max-w-[170px]" title={row.exporter_name}>
                            {row.exporter_name}
                          </div>
                          <div className="font-mono font-semibold text-slate-700 text-xs mt-0.5 whitespace-nowrap">
                            ${row.total_invoice_usd?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </td>

                        {/* 3. Revision */}
                        <td className="py-3 px-2 text-center whitespace-nowrap w-20">
                          <span
                            className={`font-mono text-[10px] px-2 py-0.5 rounded border font-semibold whitespace-nowrap inline-block ${(row.revision_number || 1) > 1
                                ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                : "bg-slate-50 text-slate-600 border-slate-200"
                              }`}
                          >
                            Rev v{row.revision_number || 1}
                          </span>
                        </td>

                        {/* 4. Conflict Breakdown */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 whitespace-nowrap">
                            {row.deterministic_conflict_count > 0 && (
                              <span className="inline-flex items-center gap-1 text-[10.5px] font-medium bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full whitespace-nowrap shrink-0">
                                {row.deterministic_conflict_count} Conflict{row.deterministic_conflict_count > 1 ? "s" : ""}
                              </span>
                            )}
                            {row.commercial_variance_count > 0 && (
                              <span className="inline-flex items-center gap-1 text-[10.5px] font-medium bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full whitespace-nowrap shrink-0">
                                {row.commercial_variance_count} Variance{row.commercial_variance_count > 1 ? "s" : ""}
                              </span>
                            )}
                            {row.compliance_advisory_count > 0 && (
                              <span className="inline-flex items-center gap-1 text-[10.5px] font-medium bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full whitespace-nowrap shrink-0">
                                {row.compliance_advisory_count} Advisor{row.compliance_advisory_count > 1 ? "ies" : "y"}
                              </span>
                            )}
                            {row.deterministic_conflict_count === 0 &&
                              row.commercial_variance_count === 0 &&
                              row.compliance_advisory_count === 0 && (
                                <span className="inline-flex items-center gap-1 text-[10.5px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full whitespace-nowrap shrink-0">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  All Checks Passed
                                </span>
                              )}
                          </div>
                        </td>

                        {/* 5. Queue Status */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-normal whitespace-nowrap ${statusBadgeClass}`}
                          >
                            {statusBadgeLabel}
                          </span>
                        </td>

                        {/* 6. Quick Actions */}
                        <td className="py-3 pl-2 pr-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1 justify-end whitespace-nowrap">
                            {/* Copy Supplier Magic Link (only when unresolved_count > 0) */}
                            {row.unresolved_count > 0 && (
                              <button
                                type="button"
                                onClick={(e) => handleCopyLink(e, row.session_token)}
                                className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${isCopied
                                    ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                                    : "text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 border-slate-200"
                                  }`}
                                title={isCopied ? "Copied!" : "Copy Supplier Magic Link"}
                              >
                                {isCopied ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Link2 className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}

                            {/* Delete Test Run */}
                            <button
                              type="button"
                              onClick={(e) => handleDeleteShipment(e, row.session_token)}
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-colors cursor-pointer"
                              title="Delete test shipment run"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Open Workbench CTA */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/shipments/${row.session_token}`);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50/70 border border-slate-200 hover:border-indigo-200 transition-colors cursor-pointer"
                              title="Open Buyer Exception Workbench"
                            >
                              <span>Workbench</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* ── Upload New Packet Modal ── */}
      <UploadPacketModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onSuccess={handleUploadSuccess}
        tolerancePct={5.0}
      />
    </div>
  );
}
