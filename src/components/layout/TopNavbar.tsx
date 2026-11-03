"use client";

import React, { useState } from "react";
import {
  ArrowRight,
  Link2,
  Check,
  RefreshCw,
  UploadCloud,
  AlertOctagon,
  ShieldCheck,
  AlertTriangle,
  X,
} from "lucide-react";
import type { AuditResponse } from "@/lib/types";

interface TopNavbarProps {
  data: AuditResponse;
  isSyncing: boolean;
  lastSynced: string | null;
  onSync: () => void;
  onOpenUploadModal: () => void;
}

export function TopNavbar({
  data,
  isSyncing,
  lastSynced,
  onSync,
  onOpenUploadModal,
}: TopNavbarProps) {
  const [copied, setCopied] = useState(false);
  const [showPopover, setShowPopover] = useState(false);

  const m = data.metadata || ({} as any);
  const status = data.summary?.status || "ACTION_REQUIRED";
  const token = data.session_token;
  const rev = data.revision_number || 1;

  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const revisionUrl = token ? `${origin}/upload/${token}` : "";

  const handleCopy = async () => {
    if (!revisionUrl) return;
    try {
      await navigator.clipboard.writeText(revisionUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  };

  const isBlocked = status === "ACTION_REQUIRED" || status === "BLOCKED";
  const isExceptions = status === "CLEARED_WITH_EXCEPTIONS";

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between z-20 relative select-none">
      {/* ── Left Zone: Brand & Shipment Context ── */}
      <div className="flex items-center gap-4">
        {/* Brand Logo & Wordmark */}
        <div className="flex items-center gap-2.5">
          <img
            src="/portgate-lockup.png"
            alt="PortGate"
            className="h-7 w-auto object-contain"
          />
        </div>

        {/* Divider */}
        <div className="h-5 w-px bg-slate-200 mx-1" />

        {/* Shipment Breadcrumb */}
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

        {/* Semantic Status Badge */}
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

      {/* ── Right Zone: 3 Clean Controls ONLY ── */}
      <div className="flex items-center gap-3">
        {/* 1. Sync Status Button */}
        {token && (
          <button
            type="button"
            onClick={onSync}
            disabled={isSyncing}
            title="Click to sync session status from supplier"
            className="text-xs text-slate-600 hover:text-slate-900 font-medium px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors inline-flex items-center gap-1.5 border border-transparent hover:border-slate-200"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-slate-500 shrink-0 ${isSyncing ? "animate-spin text-indigo-600" : ""}`}
              strokeWidth={1.75}
            />
            <span className="font-mono text-[11px]">
              {lastSynced ? `Synced ${lastSynced}` : "Sync"}
            </span>
          </button>
        )}

        {/* 2. Primary Supplier Action: Copy Revision Link */}
        <div className="relative">
          <button
            type="button"
            disabled={!token}
            onClick={() => setShowPopover((prev) => !prev)}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium text-xs px-3.5 py-2 rounded-lg shadow-sm inline-flex items-center gap-2 transition-all cursor-pointer"
          >
            <Link2 className="w-4 h-4 shrink-0" strokeWidth={2} />
            <span>Copy Supplier Revision Link</span>
          </button>

          {/* Popover */}
          {showPopover && token && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setShowPopover(false)}
              />
              <div className="absolute right-0 top-12 z-40 w-96 bg-white border border-slate-200 rounded-xl shadow-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img src="/logo.png" alt="PortGate" className="w-5 h-5 rounded object-contain" />
                    <span className="font-semibold text-sm text-slate-900">
                      Supplier Revision Magic Link
                    </span>
                  </div>
                  <button
                    onClick={() => setShowPopover(false)}
                    className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <X className="w-4 h-4 shrink-0" strokeWidth={2} />
                  </button>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Share this zero-login link with your supplier. They can inspect
                  discrepancies against your locked Buyer PO and upload revised documents.
                </p>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                    <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-0.5">
                      Session Token
                    </div>
                    <div className="font-mono text-xs font-bold text-slate-800 truncate">
                      {token}
                    </div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                    <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-0.5">
                      Active Revision
                    </div>
                    <div className="font-mono text-xs font-bold text-slate-800">
                      v{rev}
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                  <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-1">
                    Direct Supplier URL
                  </div>
                  <div className="font-mono text-[11px] text-slate-700 break-all select-all">
                    {revisionUrl}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCopy}
                  className={`w-full py-2.5 rounded-lg font-medium text-xs transition-all inline-flex items-center justify-center gap-2 shadow-sm ${
                    copied
                      ? "bg-emerald-600 text-white"
                      : "bg-indigo-600 hover:bg-indigo-700 text-white"
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-100 shrink-0" strokeWidth={2} />
                      <span>Copied to Clipboard</span>
                    </>
                  ) : (
                    <>
                      <Link2 className="w-4 h-4 shrink-0" strokeWidth={2} />
                      <span>Copy Revision Link</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>

        {/* 3. Secondary Upload Action: New Shipment Audit */}
        <button
          type="button"
          onClick={onOpenUploadModal}
          className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-medium text-xs px-3.5 py-2 rounded-lg inline-flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
        >
          <UploadCloud className="w-4 h-4 text-slate-500 shrink-0" strokeWidth={1.75} />
          <span>New Shipment Audit</span>
        </button>
      </div>
    </header>
  );
}
