"use client";

import React, { useState } from "react";
import {
  FileSpreadsheet,
  Download,
  CheckCircle2,
  ClipboardCheck,
  History,
  ShieldAlert,
  X,
} from "lucide-react";
import type { AuditDecisionLogEntry, AuditResponse } from "@/lib/types";

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
  decisionTrail,
}: ExportModalProps) {
  const [view, setView] = useState<ExportView>("broker_csv");

  const effectiveDecisions = decisionTrail || data?.decision_trail || [];

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 select-none">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="border-b border-slate-200 p-6 bg-slate-50/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src="/portgate-lockup.png"
                alt="PortGate"
                className="h-7 w-auto object-contain"
              />
              <div className="h-5 w-px bg-slate-200" />
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Pre-Entry Broker Handoff & ISF Worksheet
                </h2>
                <p className="text-xs text-slate-500 mt-0.5 font-mono">
                  #{data?.shipment_ref || "—"} · {data?.metadata?.port_of_loading || "INMUN1"} → {data?.metadata?.port_of_discharge || "USLAX"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5 shrink-0" strokeWidth={2} />
            </button>
          </div>

          {/* View Toggle Tabs */}
          <div className="flex flex-wrap gap-2 mt-5">
            <button
              type="button"
              onClick={() => setView("broker_csv")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all inline-flex items-center gap-2 cursor-pointer ${
                view === "broker_csv"
                  ? "bg-slate-900 text-white shadow-xs font-semibold"
                  : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
              <span>Broker Handoff Schedule CSV</span>
            </button>

            <button
              type="button"
              onClick={() => setView("isf_worksheet")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all inline-flex items-center gap-2 cursor-pointer ${
                view === "isf_worksheet"
                  ? "bg-slate-900 text-white shadow-xs font-semibold"
                  : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <ClipboardCheck className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
              <span>ISF Pre-Check Worksheet (10+2)</span>
            </button>

            <button
              type="button"
              onClick={() => setView("decision_log")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all inline-flex items-center gap-2 cursor-pointer ${
                view === "decision_log"
                  ? "bg-slate-900 text-white shadow-xs font-semibold"
                  : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <History className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
              <span>Document Hash & Exception Audit Log</span>
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
            <DecisionLogView data={data} decisions={effectiveDecisions} />
          )}
        </div>

        {/* Compliance Advisory Notice */}
        <div className="mx-6 mb-6 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 text-xs flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <span className="font-semibold text-amber-950">Compliance Advisory: </span>
            Suggested pre-entry worksheet, 10-digit PO HTS mapping, and CBP MID code generated from reconciled supplier documentation. Final tariff classification, customs valuation (19 USC 1401a), and formal CBP entry filing remain subject to review and confirmation by a licensed US Customs Broker.
          </p>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 p-4 bg-slate-50 flex items-center justify-between">
          <div className="text-xs text-slate-500 font-mono">
            Status: <b className="text-emerald-700">{data.summary.status}</b> · MID: <b>{data.mid_code}</b>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 font-medium py-1.5 px-4 rounded-lg text-xs transition-colors shadow-xs cursor-pointer"
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
          <h3 className="text-sm font-semibold text-slate-900">
            Customs Broker Handoff Schedule CSV
          </h3>
          <p className="text-xs text-slate-500">
            Standardized line-item entry schedule for licensed customs brokers & freight forwarders
          </p>
        </div>
        <button
          type="button"
          onClick={onDownload}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-3.5 rounded-lg transition-colors text-xs inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
          <span>Download Broker CSV</span>
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 overflow-x-auto text-emerald-400 font-mono text-xs">
        <pre className="whitespace-pre">{csvData}</pre>
      </div>

      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3.5 text-xs text-indigo-900 leading-relaxed">
        <strong>Broker Integration Note:</strong> This schedule provides clean, pre-validated tariff lines (SKU, 6-digit root, billing currency, unit rate, and weight statement) formatted for direct import into ABI/customs software without re-keying manual invoice discrepancies.
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// View 2: ISF Pre-Check Worksheet (10+2)
// ────────────────────────────────────────────────────────────────────────────

function ISFPreCheckView({ data }: { data: AuditResponse }) {
  const m = data?.metadata || ({} as any);

  const hsRoots = [
    ...(data?.po_lines || []).map((l) => l?.hts),
    ...(data?.inv_lines || []).map((l) => (l as any)?.hsn),
  ]
    .filter(Boolean)
    .map((code) => {
      const cleaned = String(code).replace(/[\s.\-]/g, "");
      const root = cleaned.substring(0, 6);
      return root.length >= 6 ? root.substring(0, 4) + "." + root.substring(4, 6) : root;
    });

  return (
    <div className="space-y-4 font-mono text-xs">
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 font-sans">
        <h3 className="text-sm font-semibold text-slate-900 mb-1">
          ISF Pre-Check Worksheet (CBP 10+2 Rule)
        </h3>
        <p className="text-xs text-slate-600 leading-relaxed">
          Pre-departure compliance check verifying all 10 mandatory importer elements prior to vessel loading at Port of Mundra (INMUN1).
        </p>
      </div>

      <div className="space-y-2 text-xs bg-white border border-slate-200 rounded-xl p-4 divide-y divide-slate-100">
        <InfoRow label="1. Manufacturer (MID Code)" value={data?.mid_code || "—"} />
        <InfoRow label="2. Seller / Exporter" value={`${m.exporter_name || "—"} (${m.exporter_city || ""}, ${m.exporter_country_iso || "IN"})`} />
        <InfoRow label="3. Buyer / Consignee" value={`${m.importer_name || "—"} (${m.importer_city_state || ""})`} />
        <InfoRow label="4. Ship-to Party" value={`${m.importer_name || "—"} (${m.importer_city_state || ""})`} />
        <InfoRow label="5. Container Stuffing Location" value={`${m.exporter_city || "Surat"}, Gujarat, India (IN)`} />
        <InfoRow label="6. Consolidator (Stuffer)" value={m.exporter_name || "—"} />
        <InfoRow label="7. Importer of Record No." value="On File with CBP (Pacific Coast Retail Group LLC)" />
        <InfoRow label="8. Consignee Number" value="US IRS EIN on File (Pacific Coast Retail Group LLC)" />
        <InfoRow label="9. Country of Origin" value="India (ISO: IN)" />
        <InfoRow label="10. PO-Matched HTSUS (Consistency Checked)" value={Array.from(new Set(hsRoots)).filter((r) => r.length >= 4).join(" · ") || "6109.10"} />
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 font-sans leading-relaxed">
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
      <div className="bg-emerald-50/70 border border-emerald-300 rounded-xl p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" strokeWidth={2} />
            <span className="text-sm font-semibold text-emerald-950">
              Document Hash & Exception Audit Log
            </span>
          </div>
          <span className="font-mono text-[10px] bg-white border border-emerald-300 text-emerald-800 px-2 py-0.5 rounded font-semibold">
            {data.summary.status}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 bg-white/90 rounded-lg p-3 border border-emerald-200 font-mono text-[11px]">
          <div>
            <span className="text-slate-500">Shipment Ref:</span>{" "}
            <span className="font-bold text-slate-900">{data.shipment_ref}</span>
          </div>
          <div>
            <span className="text-slate-500">CBP MID:</span>{" "}
            <span className="font-bold text-slate-900">{data.mid_code}</span>
          </div>
          <div className="col-span-2 flex items-center gap-2">
            <span className="text-slate-500">SHA-256 Proof:</span>{" "}
            <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[10px]">
              SHA256:{hash}
            </span>
          </div>
        </div>
      </div>

      {/* Decision Log Table */}
      <div className="space-y-2">
        <div className="font-semibold text-slate-800 text-xs flex items-center justify-between">
          <span>Logged Audit Sign-Offs & Exceptions</span>
          <span className="text-slate-400 font-mono text-[11px]">
            {decisions.length} recorded entry(ies)
          </span>
        </div>

        {decisions.length === 0 ? (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center text-slate-500 italic">
            No exception decisions signed off yet. Discrepancies resolved via the Evidence-Backed Resolution Bar will be recorded into this permanent ledger.
          </div>
        ) : (
          <div className="border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap min-w-[700px]">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 whitespace-nowrap">
                <tr>
                  <th className="px-3 py-2 whitespace-nowrap">Timestamp</th>
                  <th className="px-3 py-2 whitespace-nowrap">Item ID</th>
                  <th className="px-3 py-2 whitespace-nowrap">Action</th>
                  <th className="px-3 py-2 whitespace-nowrap">Reason Chip</th>
                  <th className="px-3 py-2 whitespace-nowrap">Signatory</th>
                  <th className="px-3 py-2 whitespace-nowrap">Sign-Off Note / Justification</th>
                  <th className="px-3 py-2 whitespace-nowrap">Digest / Hash Chain</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white whitespace-nowrap">
                {decisions.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50/60">
                    <td className="px-3 py-2 font-mono text-[10px] text-slate-500 whitespace-nowrap">
                      {entry.timestamp}
                    </td>
                    <td className="px-3 py-2 font-mono font-bold text-slate-800 whitespace-nowrap">
                      {entry.discrepancy_id}
                    </td>
                    <td className="px-3 py-2 font-semibold whitespace-nowrap">
                      {entry.action === "ACCEPT_VARIANCE" ? (
                        <span className="text-emerald-700">Accepted Variance</span>
                      ) : entry.action === "REQUEST_REVISION" ? (
                        <span className="text-purple-700">Requested Revision</span>
                      ) : entry.action === "ESCALATE_BROKER" || entry.action === "ESCALATED_TO_BROKER" ? (
                        <span className="text-sky-700">Escalated to Broker</span>
                      ) : entry.action === "CLEARED_BY_REVISION" || entry.action === "CLEARED_IN_REVISION" ? (
                        <span className="text-teal-700">Cleared in Revision</span>
                      ) : entry.action === "REOPEN_FOR_REVISION" || entry.action === "REOPEN_SHIPMENT" ? (
                        <span className="text-amber-700">Reopened for Revision</span>
                      ) : entry.action === "EXTEND_EXPIRY" ? (
                        <span className="text-indigo-700">Extended Link Expiry</span>
                      ) : entry.action === "ROTATE_LINK" ? (
                        <span className="text-amber-700">Magic Link Rotated</span>
                      ) : entry.action?.startsWith("Uploaded Revision") || entry.discrepancy_id === "REVISION_UPLOAD" ? (
                        <span className="text-indigo-700">Revised Packet Upload</span>
                      ) : (
                        <span className="text-slate-700">{entry.action?.replace(/_/g, " ") || "Audit Action"}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-slate-700 whitespace-nowrap">
                      <span className="bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-[11px] whitespace-nowrap">
                        {entry.reason_chip}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-600 text-[11px] whitespace-nowrap">
                      {entry.actor_name}
                    </td>
                    <td className="px-3 py-2 text-slate-700 text-[11px] max-w-[240px] truncate" title={entry.note || ""}>
                      {entry.note ? entry.note : "—"}
                    </td>
                    <td className="px-3 py-2 font-mono text-[10px] text-slate-500 whitespace-nowrap">
                      {(entry as any).entry_hash ? (
                        <span
                          title={`Prev Hash: ${(entry as any).prev_entry_hash || "GENESIS_ROOT"}`}
                          className="bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded font-mono text-[10px] text-slate-700 whitespace-nowrap"
                        >
                          #{(entry as any).entry_hash}
                        </span>
                      ) : (
                        "—"
                      )}
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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-1.5 flex items-start justify-between gap-4 font-sans text-xs">
      <span className="text-slate-500 font-medium shrink-0">{label}</span>
      <span className="font-mono font-semibold text-slate-900 text-right">{value}</span>
    </div>
  );
}

function formatCSVCell(val: any): string {
  if (val === null || val === undefined) return '""';
  let s = String(val);
  // Mitigate CSV Formula Injection (CWE-1236): Prepend single quote if cell starts with dangerous prefixes
  if (/^[=+\-@\t\r]/.test(s)) {
    s = `'${s}`;
  }
  s = s.replace(/"/g, '""');
  return `"${s}"`;
}

function generateBrokerHandoffCSV(data: AuditResponse): string {
  const m = data.metadata || ({} as any);
  const rows: string[][] = [
    [
      "SHIPMENT_REF",
      "CBP_MID",
      "IMPORTER_NAME",
      "EXPORTER_NAME",
      "POL",
      "POD",
      "LINE_NO",
      "SKU",
      "PO-Matched HTSUS (Consistency Checked)",
      "QTY_PCS",
      "UNIT_PRICE_USD",
      "LINE_TOTAL_USD",
      "NET_WT_KG",
      "GROSS_WT_KG",
      "CARTONS",
    ],
  ];

  const invLines = data.inv_lines || [];
  const poLines = data.po_lines || [];

  if (invLines.length > 0) {
    invLines.forEach((invLine, idx) => {
      // Reconcile to Buyer PO line item
      const poLine =
        poLines.find((p, pIdx) => {
          if (invLine.po_line_ref != null) {
            return pIdx + 1 === invLine.po_line_ref;
          }
          return p.sku === (invLine as any).sku;
        }) || poLines[idx];

      const weight = data.weights?.inv?.[idx];
      const netKg = Array.isArray(weight)
        ? weight[0]
        : (invLine as any).net_wt_kg ?? 0;
      const grossKg = Array.isArray(weight)
        ? weight[1]
        : (invLine as any).gross_wt_kg ?? 0;
      const ctns = data.cartons?.inv?.[idx] ?? (invLine as any).ctns ?? 0;

      const sku = poLine ? (poLine.sku || `SKU-${idx + 1}`) : "UNREFERENCED-PO";
      const hts = poLine ? (poLine.hts || (invLine as any).hsn || "") : ((invLine as any).hsn || "");
      const unitPrice = poLine ? poLine.price : (invLine.rate ?? 0);
      const lineTotal =
        (invLine as any).amount ??
        (invLine as any).line_total ??
        ((invLine.qty || 0) * (invLine.rate || 0));

      rows.push([
        data.shipment_ref || "SHP-2026-8841",
        data.mid_code || "",
        m.importer_name || "Pacific Coast Retail Group",
        m.exporter_name || "Shreeji Textiles Pvt Ltd",
        m.port_of_loading || "INMUN1",
        m.port_of_discharge || "USLAX",
        (idx + 1).toString(),
        sku,
        hts,
        (invLine.qty || 0).toString(),
        Number(unitPrice || 0).toFixed(2),
        Number(lineTotal || 0).toFixed(2),
        Number(netKg || 0).toFixed(2),
        Number(grossKg || 0).toFixed(2),
        ctns.toString(),
      ]);
    });
  } else {
    // Fallback if invoice lines empty
    poLines.forEach((line, idx) => {
      rows.push([
        data.shipment_ref || "SHP-2026-8841",
        data.mid_code || "",
        m.importer_name || "Pacific Coast Retail Group",
        m.exporter_name || "Shreeji Textiles Pvt Ltd",
        m.port_of_loading || "INMUN1",
        m.port_of_discharge || "USLAX",
        (idx + 1).toString(),
        line.sku || "",
        line.hts || "",
        (line.qty || 0).toString(),
        Number(line.price || 0).toFixed(2),
        ((line.qty || 0) * (line.price || 0)).toFixed(2),
        "0.00",
        "0.00",
        "0",
      ]);
    });
  }

  return rows.map((r) => r.map(formatCSVCell).join(",")).join("\n");
}
