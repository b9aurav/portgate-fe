"use client";

import React, { useState } from "react";
import type { AuditResponse } from "@/types/audit";
import { useHighlight } from "@/context/HighlightContext";
import { applySupplierFix } from "@/lib/defaultPacket";

type Phase = "idle" | "run" | "done";

interface AuditSidebarProps {
  data: AuditResponse | null;
  phase: Phase;
  tolerancePct: number;
  setTolerancePct: (pct: number) => void;
  onRunAudit: (mock: boolean) => Promise<void>;
  onUpload: () => void;
  onExport: () => void;
  isFixed: boolean;
  setIsFixed: (fixed: boolean) => void;
  setData: (data: AuditResponse) => void;
}

export function AuditSidebar({
  data,
  phase,
  tolerancePct,
  setTolerancePct,
  onRunAudit,
  onUpload,
  onExport,
  isFixed,
  setIsFixed,
  setData,
}: AuditSidebarProps) {
  const { setHighlight, setActiveTab } = useHighlight();

  if (phase === "idle") {
    return (
      <div className="h-full overflow-y-auto bg-white p-6 space-y-6">
        {/* Value Proposition */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 space-y-2">
          <div className="text-lg font-bold text-gray-900">⚡ PortGate</div>
          <div className="text-sm text-gray-700 leading-relaxed">
            Pre-Shipment 3-Way Customs Compliance Engine for the India→US trade corridor. Upload your
            PO, Invoice, and Packing List to run deterministic Rule-1 through Rule-5 audits in
            seconds.
          </div>
          <ul className="text-xs text-gray-600 space-y-1 pl-4">
            <li>✓ 6-digit HS/HTS international root parity</li>
            <li>✓ Unit price & extended line math verification</li>
            <li>✓ Split-shipment PO balance & tolerance</li>
            <li>✓ Net vs gross weight plausibility & carton parity</li>
            <li>✓ Indian export header checks (GSTIN, IEC, LUT ARN)</li>
          </ul>
        </div>

        {/* Tolerance Selector */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Split-Shipment Tolerance (%)
          </label>
          <input
            type="number"
            min="0"
            max="25"
            step="0.1"
            value={tolerancePct}
            onChange={(e) => setTolerancePct(parseFloat(e.target.value) || 5.0)}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="text-xs text-gray-500">
            Quantities within this band emit WARN; above it emit CRIT.
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => onRunAudit(true)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            ⚡ Run Live 3-Way Compliance Audit
          </button>
          <button
            type="button"
            onClick={onUpload}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium py-2 px-4 rounded-lg transition-colors"
          >
            📄 Upload Custom PDF Packet
          </button>
        </div>
      </div>
    );
  }

  if (phase === "run") {
    return (
      <div className="h-full overflow-y-auto bg-gray-900 text-green-400 p-6 font-mono text-sm space-y-2">
        <TerminalLine text="[PortGate] Initializing compliance engine..." delay={0} />
        <TerminalLine text="[PortGate] Uploading 3 PDF documents to Gemini..." delay={500} />
        <TerminalLine text="[PortGate] Extracting structured shipment packet..." delay={1000} />
        <TerminalLine text="[PortGate] Running deterministic Rule-1 through Rule-5..." delay={1500} />
        <TerminalLine text="[PortGate] Awaiting backend response..." delay={2000} />
      </div>
    );
  }

  if (phase === "done" && data) {
    const isBlocked = data.summary.status === "BLOCKED";
    const canExport = isFixed || !isBlocked;

    return (
      <div className="h-full overflow-y-auto bg-white p-6 space-y-6">
        {/* Status Summary */}
        <div
          className={`rounded-lg p-4 ${
            isBlocked
              ? "bg-red-50 border-2 border-red-600"
              : "bg-green-50 border-2 border-green-600"
          }`}
        >
          <div
            className={`text-xl font-bold ${isBlocked ? "text-red-900" : "text-green-900"}`}
          >
            {isBlocked ? "🚫 BLOCKED" : "✓ COMPLIANT"}
          </div>
          <div className="text-sm text-gray-700 mt-1">
            {data.summary.critical_count} critical · {data.summary.warning_count} warning ·{" "}
            {data.summary.passed_count} passed
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          {isBlocked && !isFixed && (
            <button
              type="button"
              onClick={() => {
                const fixed = applySupplierFix(data);
                setData(fixed);
                setIsFixed(true);
              }}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              🔧 Simulate Supplier Fix in Tally
            </button>
          )}
          <button
            type="button"
            onClick={onExport}
            disabled={!canExport}
            className={`w-full font-semibold py-2 px-4 rounded-lg transition-colors ${
              canExport
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            📦 Export CargoWise CSV & ISF (10+2)
          </button>
        </div>

        {/* Discrepancies */}
        {data.items.length > 0 && (
          <div className="space-y-3">
            <div className="text-sm font-bold text-gray-700">Discrepancies</div>
            {data.items.map((item) => (
              <div
                key={item.id}
                className={`border-l-4 rounded-lg p-3 cursor-pointer transition-all hover:shadow-md ${
                  item.sev === "crit"
                    ? "border-red-600 bg-red-50 hover:bg-red-100"
                    : "border-amber-500 bg-amber-50 hover:bg-amber-100"
                }`}
                onClick={() => {
                  setHighlight(item.id, item.cells, item.sev, item.locs[0]?.[0] || "inv");
                  setActiveTab(item.locs[0]?.[0] || "inv");
                }}
              >
                <div className="flex items-start gap-2">
                  <div
                    className={`text-xs font-bold px-2 py-0.5 rounded ${
                      item.sev === "crit"
                        ? "bg-red-600 text-white"
                        : "bg-amber-600 text-white"
                    }`}
                  >
                    {item.id}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-gray-900">{item.title}</div>
                    <div className="text-xs text-gray-600 mt-1 line-clamp-2">{item.body}</div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {item.locs.map(([key, label], idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveTab(key);
                            setHighlight(item.id, item.cells, item.sev, key);
                          }}
                          className="text-xs bg-white border border-gray-300 hover:bg-gray-50 px-2 py-1 rounded"
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Passed Checks */}
        {data.passed.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-bold text-gray-700">Passed Checks</div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-1">
              {data.passed.map((check, idx) => (
                <div key={idx} className="text-xs text-green-800 flex items-start gap-2">
                  <span className="text-green-600">✓</span>
                  <span>{check}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}

// Terminal animation component
function TerminalLine({ text, delay }: { text: string; delay: number }) {
  const [show, setShow] = useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  if (!show) return null;
  return <div className="animate-pulse">{text}</div>;
}
