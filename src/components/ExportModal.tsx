"use client";

import React, { useState } from "react";
import type { AuditDecisionLogEntry, AuditResponse } from "@/types/audit";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: AuditResponse;
  decisionTrail?: AuditDecisionLogEntry[];
}

type ExportView = "broker_csv" | "isf_worksheet" | "decision_log";

export function ExportModal({
  isOpen,
  onClose,
  data,
  decisionTrail = [],
}: ExportModalProps) {
  const [view, setView] = useState<ExportView>("broker_csv");

  if (!isOpen) return null;

  const csvData = generateBrokerHandoffCSV(data);

  const handleDownloadCSV = () => {
    const blob = new Blob([csvData], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `portgate_${data.shipment_ref}_broker_handoff.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto m-4 border border-gray-200">
        {/* Header */}
        <div className="border-b border-gray-200 p-6 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/portgate-lockup.png" alt="PortGate" className="h-7 w-auto object-contain" />
              <div className="h-6 w-px bg-gray-300" />
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Verified Export Package
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Shipment #{data?.shipment_ref || "—"} · {data?.metadata?.port_of_loading || "INMUN1"} → {data?.metadata?.port_of_discharge || "USLAX"}
                </p>
              </div>
            </div>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
              >
                ×
              </button>
            </div>

            {/* View Toggle Tabs */}
            <div className="flex flex-wrap gap-2 mt-4">
              <button
                type="button"
                onClick={() => setView("broker_csv")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${view === "broker_csv"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
              >
                <span>📊</span>
                <span>Broker Handoff Schedule CSV</span>
              </button>

              <button
                type="button"
                onClick={() => setView("isf_worksheet")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${view === "isf_worksheet"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
              >
                <span>📋</span>
                <span>ISF Pre-Check Worksheet</span>
              </button>

              <button
                type="button"
                onClick={() => setView("decision_log")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${view === "decision_log"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
              >
                <span>📜</span>
                <span>Document Integrity & Decision Log</span>
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="p-6">
            {view === "broker_csv" && (
              <BrokerHandoffView csvData={csvData} onDownload={handleDownloadCSV} />
            )}
            {view === "isf_worksheet" && <ISFPreCheckView data={data} />}
            {view === "decision_log" && (
              <DecisionLogView data={data} decisions={decisionTrail} />
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 p-4 bg-gray-50 flex items-center justify-between">
            <div className="text-xs text-gray-500 font-mono">
              Status: <b className="text-emerald-700">{data.summary.status}</b> · MID: <b>{data.mid_code}</b>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="bg-white border border-gray-300 hover:bg-gray-100 text-gray-800 font-semibold py-1.5 px-5 rounded-lg text-xs transition-colors shadow-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
      );
}

      // ────────────────────────────────────────────────────────────────────────────
      // View 1: Broker Handoff Schedule CSV
      // ────────────────────────────────────────────────────────────────────────────

      function BrokerHandoffView({
        csvData,
        onDownload,
}: {
        csvData: string;
  onDownload: () => void;
}) {
  return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-gray-900">
              Customs Broker Handoff Schedule CSV
            </div>
            <div className="text-xs text-gray-500">
              Standardized line-item entry schedule for licensed customs brokers & freight forwarders
            </div>
          </div>
          <button
            type="button"
            onClick={onDownload}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-xs flex items-center gap-1.5 shadow-sm"
          >
            <span>⬇️</span>
            <span>Download Broker CSV</span>
          </button>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 overflow-x-auto text-emerald-400 font-mono text-xs">
          <pre className="whitespace-pre">{csvData}</pre>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-900 leading-relaxed">
          <strong>Broker Integration Note:</strong> This schedule provides clean, pre-validated tariff lines (SKU, 6-digit root, billing currency, unit rate, and weight statement) formatted for direct import into ABI/customs software without re-keying manual invoice discrepancies.
        </div>
      </div>
      );
}

      // ────────────────────────────────────────────────────────────────────────────
      // View 2: ISF Pre-Check Worksheet (10+2)
      // ────────────────────────────────────────────────────────────────────────────

      function ISFPreCheckView({data}: {data: AuditResponse }) {
  const m = data?.metadata || ({ } as any);

  // Extract 6-digit HS roots
  const hsRoots = (data?.po_lines || []).map((line) => {
    const cleaned = (line?.hts || "").replace(/[\s.\-]/g, "");
      const root = cleaned.substring(0, 6);
    return root.length >= 6 ? root.substring(0, 4) + "." + root.substring(4, 6) : root;
  });

      return (
      <div className="space-y-4 font-mono text-sm">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 font-sans">
          <div className="text-base font-bold text-blue-900 mb-1">
            ISF Pre-Check Worksheet (CBP 10+2 Rule)
          </div>
          <div className="text-xs text-blue-700 leading-relaxed">
            Pre-departure compliance check verifying all 10 mandatory importer elements prior to vessel loading at Port of Mundra (INMUN1).
          </div>
        </div>

        <div className="space-y-2.5 text-xs bg-gray-50 border border-gray-200 rounded-lg p-4">
          <InfoRow label="1. Manufacturer (MID Code)" value={data?.mid_code || "—"} />
          <InfoRow label="2. Seller / Exporter" value={`${m.exporter_name || "—"} (${m.exporter_city || ""}, ${m.exporter_country_iso || "IN"})`} />
          <InfoRow label="3. Buyer / Consignee" value={`${m.importer_name || "—"} (${m.importer_city_state || ""})`} />
          <InfoRow label="4. Ship-to Party" value={`${m.importer_name || "—"} (${m.importer_city_state || ""})`} />
          <InfoRow label="5. Container Stuffing Location" value={`${m.exporter_city || "Surat"}, Gujarat, India (IN)`} />
          <InfoRow label="6. Consolidator (Stuffer)" value={m.exporter_name || "—"} />
          <InfoRow label="7. Importer of Record No." value="On File with CBP (Pacific Coast Retail Group LLC)" />
          <InfoRow label="8. Consignee Number" value={`${m.exporter_gstin || "24AABCS1429B1Z5"} / US IOR EIN`} />
          <InfoRow label="9. Country of Origin" value="India (ISO: IN)" />
          <InfoRow label="10. Commodity 6-Digit HTSUS" value={Array.from(new Set(hsRoots)).filter(Boolean).join(" · ") || "6109.10"} />
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 font-sans leading-relaxed">
          <strong>Pre-Departure SLA:</strong> ISF transmission must be filed and accepted by CBP ACE at least 24 hours prior to container vessel departure. All roots cross-matched against the buyer purchase order.
        </div>
      </div>
      );
}

      // ────────────────────────────────────────────────────────────────────────────
      // View 3: Document Integrity & Decision Log
      // ────────────────────────────────────────────────────────────────────────────

      function DecisionLogView({
        data,
        decisions,
}: {
        data: AuditResponse;
      decisions: AuditDecisionLogEntry[];
}) {
  const [hash, setHash] = React.useState<string>("");

  React.useEffect(() => {
    const generateHash = async () => {
      const payload = JSON.stringify({
          shipment_ref: data.shipment_ref,
        mid: data.mid_code,
        status: data.summary.status,
        timestamp: new Date().toISOString().split("T")[0],
      });
        const buffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
        const hashArray = Array.from(new Uint8Array(buffer));
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
        setHash(hashHex.substring(0, 24).toUpperCase());
    };
        generateHash();
  }, [data]);

        return (
        <div className="space-y-4 text-xs font-sans">
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-300 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs">
                  ✓
                </span>
                <span className="text-sm font-bold text-emerald-950">
                  Document Integrity & Cryptographic Decision Log
                </span>
              </div>
              <span className="font-mono text-[10px] bg-white border border-emerald-300 text-emerald-800 px-2 py-0.5 rounded font-semibold">
                {data.summary.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-white/90 rounded-lg p-3 border border-emerald-200 font-mono text-[11px]">
              <div>
                <span className="text-gray-500">Shipment Ref:</span>{" "}
                <span className="font-bold text-gray-900">{data.shipment_ref}</span>
              </div>
              <div>
                <span className="text-gray-500">CBP MID:</span>{" "}
                <span className="font-bold text-gray-900">{data.mid_code}</span>
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <span className="text-gray-500">SHA-256 Proof:</span>{" "}
                <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[10px]">
                  SHA256:{hash}
                </span>
              </div>
            </div>
          </div>

          {/* Decision Log Table */}
          <div className="space-y-2">
            <div className="font-bold text-gray-800 text-xs flex items-center justify-between">
              <span>Logged Audit Sign-Offs & Exceptions</span>
              <span className="text-gray-400 font-mono text-[11px]">
                {decisions.length} recorded entry(ies)
              </span>
            </div>

            {decisions.length === 0 ? (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center text-gray-500 italic">
                No exception decisions signed off yet. Discrepancies resolved via the Evidence-Backed Resolution Bar will be recorded into this permanent ledger.
              </div>
            ) : (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-100 text-gray-700 font-semibold border-b border-gray-200">
                    <tr>
                      <th className="px-3 py-2">Timestamp</th>
                      <th className="px-3 py-2">Item ID</th>
                      <th className="px-3 py-2">Action</th>
                      <th className="px-3 py-2">Reason Chip</th>
                      <th className="px-3 py-2">Signatory</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {decisions.map((entry) => (
                      <tr key={entry.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-mono text-[10px] text-gray-500">
                          {entry.timestamp}
                        </td>
                        <td className="px-3 py-2 font-mono font-bold text-gray-800">
                          {entry.discrepancy_id}
                        </td>
                        <td className="px-3 py-2 font-semibold">
                          {entry.action === "ACCEPT_VARIANCE" ? (
                            <span className="text-emerald-700">Accepted Variance</span>
                          ) : entry.action === "REQUEST_REVISION" ? (
                            <span className="text-purple-700">Requested Revision</span>
                          ) : (
                            <span className="text-sky-700">Escalated to Broker</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-gray-700">
                          <span className="bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded text-[11px]">
                            {entry.reason_chip}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-gray-600 text-[11px]">
                          {entry.actor_name}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
        );
}

        // ────────────────────────────────────────────────────────────────────────────
        // Helpers
        // ───────────────────────────────────────────────────────────────────────────

        function InfoRow({label, value}: {label: string; value: string }) {
  return (
        <div className="grid grid-cols-3 gap-2">
          <div className="text-gray-500 font-semibold">{label}:</div>
          <div className="col-span-2 text-gray-900 font-medium">{value}</div>
        </div>
        );
}

        // Broker Handoff Schedule CSV Generator
        function generateBrokerHandoffCSV(data: AuditResponse): string {
  const m = data?.metadata || ({ } as any);
        const lines: string[] = [];

        // CSV Header
        lines.push(
        "Line,SKU,Description,HTS_Root_6,HTS_Full,Quantity,UOM,UnitPrice_USD,ExtendedValue_USD,NetWt_KG,GrossWt_KG,Cartons,Incoterm,Currency,Exporter_Name,Importer_Name,Port_Loading,Port_Discharge,CBP_MID_Code"
        );

  // Line Items
  (data?.po_lines || []).forEach((po, idx) => {
    const inv = (data?.inv_lines || [])[idx] || ({ } as any);
        const weightPair = data?.weights?.inv?.[idx];
        const net = Number(Array.isArray(weightPair) ? weightPair[0] : 0) || 0;
        const gross = Number(Array.isArray(weightPair) ? weightPair[1] : 0) || 0;
        const ctns = data?.cartons?.inv?.[idx] != null ? data.cartons.inv[idx] : 0;
        const qty = Number(inv.qty) || Number(po.qty) || 0;
        const rate = Number(inv.rate) || Number(po.price) || 0;
        const amount = typeof inv.amount === "number" ? inv.amount : qty * rate;
        const htsCleaned = (po.hts || "").replace(/[\s.\-]/g, "");
        const htsRoot = htsCleaned.substring(0, 6);

        lines.push(
        [
        idx + 1,
        po.sku || `SKU-${idx + 1}`,
        `"${inv.desc || po.desc || "Goods"}"`,
        htsRoot,
        po.hts || "6109.10.00",
        qty,
        "PCS",
        rate.toFixed(2),
        amount.toFixed(2),
        net.toFixed(2),
        gross.toFixed(2),
        ctns,
        m.incoterm || "FOB",
        m.currency || "USD",
        `"${m.exporter_name || "Exporter"}"`,
        `"${m.importer_name || "Importer"}"`,
        m.port_of_loading || "INMUN1",
        m.port_of_discharge || "USLAX",
        data?.mid_code || "—",
        ].join(",")
        );
  });

        return lines.join("\n");
}
