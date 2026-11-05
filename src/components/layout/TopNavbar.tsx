"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Link2,
  Check,
  RefreshCw,
  UploadCloud,
  ChevronDown,
  ExternalLink,
  X,
  Copy,
  MessageSquareText,
  UserCheck,
  LogIn,
  LogOut,
  ShieldAlert,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { generateDiscrepancyBrief } from "@/lib/briefGenerator";
import { extendLinkExpiry, reopenShipment, rotateMagicLink } from "@/lib/api";
import type { AuditResponse, ShipmentListItem } from "@/lib/types";

interface TopNavbarProps {
  data: AuditResponse;
  isSyncing: boolean;
  lastSynced: string | null;
  onSync: () => void;
  onOpenUploadModal: () => void;
  shipments?: ShipmentListItem[];
  currentSessionToken?: string;
  onSessionUpdate?: (updated: AuditResponse) => void;
}

export function TopNavbar({
  data,
  isSyncing,
  lastSynced,
  onSync,
  onOpenUploadModal,
  shipments = [],
  currentSessionToken,
  onSessionUpdate,
}: TopNavbarProps) {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [copied, setCopied] = useState(false);
  const [copiedBrief, setCopiedBrief] = useState(false);
  const [showPopover, setShowPopover] = useState(false);
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [isReopening, setIsReopening] = useState(false);
  const [isExtending, setIsExtending] = useState(false);

  const m = data.metadata || ({} as any);
  const token = data.session_token || currentSessionToken || "";
  const rev = data.revision_number || 1;
  const isRevoked = Boolean(data.link_revoked);

  const handleRotate = async (revoke: boolean = false) => {
    if (!token || isRotating) return;
    setIsRotating(true);
    try {
      const updated = await rotateMagicLink(token, revoke);
      if (onSessionUpdate) {
        onSessionUpdate(updated);
      }
      if (revoke) {
        onSync();
      } else if (updated.session_token && updated.session_token !== token) {
        router.replace(`/shipments/${updated.session_token}`);
      } else {
        onSync();
      }
    } catch (err: any) {
      alert(err.message || "Failed to update supplier magic link");
    } finally {
      setIsRotating(false);
    }
  };

  const handleReopen = async () => {
    if (!token || isReopening) return;
    setIsReopening(true);
    try {
      const updated = await reopenShipment(token);
      if (onSessionUpdate) {
        onSessionUpdate(updated);
      }
      onSync();
    } catch (err: any) {
      alert(err.message || "Failed to reopen shipment");
    } finally {
      setIsReopening(false);
    }
  };

  const handleExtendExpiry = async () => {
    if (!token || isExtending) return;
    setIsExtending(true);
    try {
      const updated = await extendLinkExpiry(token, 7);
      if (onSessionUpdate) {
        onSessionUpdate(updated);
      }
      onSync();
    } catch (err: any) {
      alert(err.message || "Failed to extend link expiry");
    } finally {
      setIsExtending(false);
    }
  };

  const unresolvedCount =
    data.summary?.unresolved_count ??
    data.items?.filter(
      (it) =>
        !it.resolution_state ||
        it.resolution_state === "UNRESOLVED" ||
        it.resolution_state === "REVISION_REQUESTED"
    ).length ??
    0;

  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const revisionUrl = token ? `${origin}/upload/${token}` : "";

  const briefText = useMemo(() => {
    return generateDiscrepancyBrief(data, null, origin);
  }, [data, origin]);

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

  const handleCopyBrief = async () => {
    try {
      await navigator.clipboard.writeText(briefText);
      setCopiedBrief(true);
      setTimeout(() => setCopiedBrief(false), 2000);
    } catch (err) {
      console.error("Failed to copy brief:", err);
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between z-20 relative select-none whitespace-nowrap">
      {/* ── Left Zone: Logo + Breadcrumbs + Compact Shipment Switcher ── */}
      <div className="flex items-center gap-3 whitespace-nowrap min-w-0">
        {/* Brand Logo & Wordmark (Navigates to Dashboard) */}
        <Link
          href="/"
          className="flex items-center gap-2 hover:opacity-90 transition-opacity shrink-0"
          title="Return to PortGate Queue Dashboard"
        >
          <img
            src="/portgate-lockup.png"
            alt="PortGate"
            className="h-7 w-auto object-contain cursor-pointer"
          />
        </Link>

        {/* Divider */}
        <div className="h-4 w-px bg-slate-200 shrink-0" />

        {/* Breadcrumb Back Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors py-1 px-1.5 rounded hover:bg-slate-100 whitespace-nowrap shrink-0"
          title="Back to All Shipments Queue"
        >
          <ArrowLeft className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
          <span className="whitespace-nowrap">All Shipments</span>
        </Link>

        {/* Divider */}
        <div className="h-4 w-px bg-slate-200 shrink-0" />

        {/* Lightweight Quick-Jump Shipment Switcher Dropdown */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setShowSwitcher((p) => !p)}
            className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer text-xs whitespace-nowrap"
            title="Click to quickly jump to another active container"
          >
            <span className="font-mono font-bold text-slate-900 whitespace-nowrap">
              #{data.shipment_ref || "SHP-2026-8841"}
            </span>
            <span className="text-slate-300">·</span>
            <span className="text-slate-600 font-medium whitespace-nowrap">
              {m?.po_number || "PO-45012"}
            </span>
            <span className="text-[10px] font-mono font-semibold text-slate-600 bg-white border border-slate-200 px-1.5 py-0.2 rounded whitespace-nowrap">
              Rev v{rev}
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showSwitcher ? "rotate-180" : ""}`}
              strokeWidth={2}
            />
          </button>

          {/* Quick-Jump Popover */}
          {showSwitcher && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setShowSwitcher(false)} />
              <div className="absolute left-0 top-11 z-40 w-84 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 font-sans whitespace-normal">
                <div className="px-3.5 py-2.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Switch Active Shipment ({shipments.length || 1})
                  </span>
                  <Link
                    href="/"
                    onClick={() => setShowSwitcher(false)}
                    className="text-[11px] text-indigo-600 hover:text-indigo-700 font-medium whitespace-nowrap"
                  >
                    All Shipments →
                  </Link>
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                  {shipments.map((s) => {
                    const isCurrent = s.session_token === token;
                    const isAction = s.status === "ACTION_REQUIRED";
                    const isAwaiting = s.status === "AWAITING_SUPPLIER_REVISION";
                    return (
                      <button
                        key={s.session_token}
                        type="button"
                        onClick={() => {
                          setShowSwitcher(false);
                          if (s.session_token !== token) {
                            router.push(`/shipments/${s.session_token}`);
                          }
                        }}
                        className={`w-full text-left px-3.5 py-2.5 hover:bg-slate-50 transition-colors flex items-center justify-between gap-2.5 cursor-pointer ${
                          isCurrent ? "bg-indigo-50/50" : ""
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                isAction ? "bg-rose-500" : isAwaiting ? "bg-amber-500" : "bg-emerald-500"
                              }`}
                            />
                            <span className="font-mono text-xs font-bold text-slate-900 truncate">
                              #{s.shipment_id}
                            </span>
                            <span className="text-[10px] text-slate-400">·</span>
                            <span className="text-xs text-slate-600 truncate">{s.po_number}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 truncate mt-0.5">
                            {s.exporter_name}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span
                            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                              isAction
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : isAwaiting
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200"
                            }`}
                          >
                            {s.unresolved_count > 0 ? `${s.unresolved_count} issues` : "Clear"}
                          </span>
                          <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                            v{s.revision_number}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Route Corridor Pill */}
        <div className="hidden xl:inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-mono font-medium whitespace-nowrap shrink-0">
          <span>{m?.port_of_loading || "INMUN1"}</span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" strokeWidth={2} />
          <span>{m?.port_of_discharge || "USLAX"}</span>
        </div>
      </div>

      {/* ── Right Zone: Sync + 2-Part Split Button + New Audit CTA ── */}
      <div className="flex items-center gap-3 whitespace-nowrap shrink-0">
        {/* 1. Sync Status Button */}
        {token && (
          <button
            type="button"
            onClick={onSync}
            disabled={isSyncing}
            title="Click to sync session status from supplier"
            className="text-xs text-slate-500 hover:text-slate-800 font-medium px-2 py-1.5 rounded-lg hover:bg-slate-100 transition-colors inline-flex items-center gap-1.5 border border-transparent hover:border-slate-200 cursor-pointer whitespace-nowrap shrink-0"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-slate-500 shrink-0 ${isSyncing ? "animate-spin text-indigo-600" : ""}`}
              strokeWidth={1.75}
            />
            <span className="font-mono text-[11px] whitespace-nowrap">
              {lastSynced ? `Synced ${lastSynced}` : "Sync"}
            </span>
          </button>
        )}

        {/* 2. Supplier Action: If Cleared (and not reopened), show Reopen for Revision + View Supplier Portal; else Split Button */}
        {unresolvedCount === 0 && !data.reopened_for_revision ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isReopening}
              onClick={handleReopen}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg px-3 py-1.5 whitespace-nowrap transition-colors cursor-pointer disabled:opacity-50"
              title="Reopen shipment packet for supplier revision"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-amber-600 ${isReopening ? "animate-spin" : ""}`} />
              <span>{isReopening ? "Reopening..." : "Reopen for Revision"}</span>
            </button>
            <a
              href={`/upload/${token}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 border border-slate-200 hover:bg-slate-50 rounded-lg px-3 py-1.5 whitespace-nowrap transition-colors"
              title="Open Supplier Revision Portal in new tab"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" strokeWidth={1.75} />
              <span>View Supplier Portal</span>
            </a>
          </div>
        ) : (
          <div className="relative inline-flex items-center rounded-lg shadow-2xs shrink-0 whitespace-nowrap">
            {/* Main Action: Copy Revision Link */}
              <button
                type="button"
                disabled={!token}
                onClick={handleCopy}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium text-xs px-3 py-2 rounded-l-lg inline-flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
                title="Copy zero-login supplier revision URL to clipboard"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-300 shrink-0" strokeWidth={2} />
                    <span className="whitespace-nowrap">Link Copied!</span>
                  </>
                ) : (
                  <>
                    <Link2 className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
                    <span className="whitespace-nowrap">Copy Revision Link</span>
                  </>
                )}
              </button>

              {/* Attached Right Chevron: Opens WhatsApp / Email Notice Popover */}
              <button
                type="button"
                disabled={!token}
                onClick={() => setShowPopover((prev) => !prev)}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium text-xs px-2 py-2 rounded-r-lg border-l border-indigo-500 inline-flex items-center transition-all cursor-pointer shrink-0 whitespace-nowrap"
                title="Options: Copy WhatsApp / Email Discrepancy Notice"
              >
                <ChevronDown
                  className={`w-3.5 h-3.5 text-indigo-200 transition-transform ${showPopover ? "rotate-180" : ""}`}
                />
              </button>

            {/* Notice & Share Popover */}
            {showPopover && token && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setShowPopover(false)}
                />
                <div className="absolute right-0 top-12 z-40 w-[420px] bg-white border border-slate-200 rounded-xl shadow-xl p-5 space-y-4 whitespace-normal font-sans text-left">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <img src="/logo.png" alt="PortGate" className="w-5 h-5 rounded object-contain" />
                      <span className="font-semibold text-sm text-slate-900">
                        Supplier Revision & Notice
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
                    Share this zero-login link with your exporter to inspect discrepancies
                    and upload corrected Tally Commercial Invoice / Packing List.
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                      <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-0.5">
                        Session Token
                      </div>
                      <div className="font-mono font-bold text-slate-800 text-[11px] truncate">
                        {token}
                      </div>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                      <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-0.5">
                        Current Revision
                      </div>
                      <div className="font-mono font-bold text-indigo-600 text-[11px]">
                        Rev v{rev} (Active)
                      </div>
                    </div>
                  </div>

                  {/* Security Status & Regeneration Bar */}
                  <div className="flex flex-col gap-2 bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${isRevoked ? "bg-rose-500" : "bg-emerald-500"}`} />
                        <span className="text-xs font-medium text-slate-700">
                          {isRevoked ? "Link Revoked by Buyer" : "Link Active · Expires in 7 days"}
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled={isRotating}
                        onClick={() => handleRotate(false)}
                        className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer disabled:opacity-50"
                      >
                        {isRotating ? "Updating..." : "Revoke & Regenerate Magic Link"}
                      </button>
                    </div>
                    <div className="flex items-center justify-end border-t border-slate-200/60 pt-1.5">
                      <button
                        type="button"
                        disabled={isExtending}
                        onClick={handleExtendExpiry}
                        className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 hover:underline cursor-pointer disabled:opacity-50 inline-flex items-center gap-1"
                      >
                        <RefreshCw className={`w-3 h-3 ${isExtending ? "animate-spin" : ""}`} />
                        <span>{isExtending ? "Extending..." : "Extend Link Expiry (+7 Days)"}</span>
                      </button>
                    </div>
                  </div>

                  {/* 1. Raw Magic Link */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-700">
                      Public Supplier Portal URL
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={revisionUrl || ""}
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-700 select-all focus:outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={handleCopy}
                        className="bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
                      >
                        {copied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" strokeWidth={2} />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Link2 className="w-3.5 h-3.5" strokeWidth={2} />
                            <span>Copy Link</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* 2. Message / Email Discrepancy Brief */}
                  <div className="space-y-1.5 pt-3 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold text-slate-700 flex items-center gap-1.5">
                        <MessageSquareText className="w-3.5 h-3.5 text-indigo-600" />
                        <span>WhatsApp / Email Notice Preview</span>
                      </label>
                      <button
                        type="button"
                        onClick={handleCopyBrief}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors inline-flex items-center gap-1 cursor-pointer"
                      >
                        {copiedBrief ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-600 font-semibold">Copied Notice!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Notice</span>
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="text-[11px] font-mono text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2.5 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto select-all">
                      {briefText}
                    </pre>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* 3. New Shipment Audit Button */}
        <button
          type="button"
          onClick={onOpenUploadModal}
          className="border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs px-3 py-2 rounded-lg shadow-2xs inline-flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0"
          title="Upload 3-PDF packet for compliance linting"
        >
          <UploadCloud className="w-3.5 h-3.5 text-slate-500 shrink-0" strokeWidth={1.75} />
          <span className="whitespace-nowrap">New Audit</span>
        </button>

        {/* 4. Auth User Status Badge */}
        {user ? (
          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg">
              <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="max-w-[120px] truncate">{user.email}</span>
            </span>
            <button
              type="button"
              onClick={() => signOut()}
              className="text-xs text-slate-500 hover:text-slate-800 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" />
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs px-2.5 py-1.5 rounded-lg shadow-2xs transition-all cursor-pointer whitespace-nowrap shrink-0"
            title="Sign in to save workspace"
          >
            <LogIn className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span className="hidden sm:inline">Sign In</span>
          </Link>
        )}
      </div>
    </header>
  );
}
