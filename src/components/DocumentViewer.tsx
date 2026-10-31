"use client";

import React from "react";
import { useHighlight } from "@/context/HighlightContext";
import { Hl } from "./HighlightCell";
import type { AuditDecisionLogEntry, AuditResponse } from "@/types/audit";

interface DocumentViewerProps {
  data: AuditResponse;
  isFixed: boolean;
  decisionTrail?: AuditDecisionLogEntry[];
}

export function DocumentViewer({ data, isFixed, decisionTrail = [] }: DocumentViewerProps) {
  const { activeTab, setActiveTab } = useHighlight();

  const tabs = [
    { key: "po", label: "1 · Buyer PO" },
    { key: "inv", label: "2 · Tally Invoice" },
    { key: "pl", label: "3 · Packing List" },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 bg-white">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "border-b-2 border-blue-600 text-blue-600 font-semibold"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Document Content */}
      <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
        {activeTab === "po" && <PODocument data={data} />}
        {activeTab === "inv" && (
          <InvDocument data={data} isFixed={isFixed} decisionTrail={decisionTrail} />
        )}
        {activeTab === "pl" && <PLDocument data={data} />}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// PO Document (US Buyer Purchase Order)
// ────────────────────────────────────────────────────────────────────────────

function PODocument({ data }: { data: AuditResponse }) {
  const m = data?.metadata || ({} as any);
  const poLines = data?.po_lines || [];

  return (
    <div className="mx-auto max-w-4xl bg-white shadow-lg rounded border border-gray-300 p-8 space-y-6 font-mono text-sm">
      {/* ERP Header */}
      <div className="border-b-2 border-gray-800 pb-4">
        <div className="text-2xl font-bold text-gray-900 mb-1">PURCHASE ORDER</div>
        <div className="text-gray-600">
          PO Number: <span className="font-semibold text-gray-900">{m?.po_number || "—"}</span>
        </div>
        <div className="text-gray-600">
          Shipment Ref: <span className="font-semibold text-gray-900">{data?.shipment_ref || "—"}</span>
        </div>
      </div>

      {/* Seller / Buyer */}
      <div className="grid grid-cols-2 gap-6">
        <div>
          <div className="text-xs font-bold text-gray-500 uppercase mb-1">Seller (Exporter)</div>
          <div className="font-semibold text-gray-900">{m?.exporter_name || "—"}</div>
          <div className="text-gray-700">{m?.exporter_street || ""}</div>
          <div className="text-gray-700">
            {[m?.exporter_city, m?.exporter_state, m?.exporter_postal].filter(Boolean).join(", ")}
          </div>
          <div className="text-gray-700">{m?.exporter_country_iso || "IN"}</div>
        </div>
        <div>
          <div className="text-xs font-bold text-gray-500 uppercase mb-1">Buyer (Importer)</div>
          <div className="font-semibold text-gray-900">{m?.importer_name || "—"}</div>
          <div className="text-gray-700">{m?.importer_city_state || ""}</div>
        </div>
      </div>

      {/* Terms */}
      <div className="grid grid-cols-3 gap-4 bg-gray-50 p-3 rounded">
        <div>
          <div className="text-xs text-gray-500">Incoterm</div>
          <div className="font-semibold">{m?.po_incoterm || m?.incoterm || "FOB"}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Currency</div>
          <div className="font-semibold">{m?.po_currency || m?.currency || "USD"}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Port of Loading</div>
          <div className="font-semibold">{m?.port_of_loading || "INMUN1"}</div>
        </div>
      </div>

      {/* Line Items */}
      <div>
        <div className="text-xs font-bold text-gray-500 uppercase mb-2">Line Items</div>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 text-xs text-left">
              <th className="border border-gray-300 px-2 py-1">#</th>
              <th className="border border-gray-300 px-2 py-1">SKU</th>
              <th className="border border-gray-300 px-2 py-1">Description</th>
              <th className="border border-gray-300 px-2 py-1">HTS</th>
              <th className="border border-gray-300 px-2 py-1 text-right">Total Qty</th>
              <th className="border border-gray-300 px-2 py-1 text-right">Prior</th>
              <th className="border border-gray-300 px-2 py-1 text-right">Open Balance</th>
              <th className="border border-gray-300 px-2 py-1 text-right">Unit Price</th>
            </tr>
          </thead>
          <tbody>
            {poLines.map((line, idx) => {
              const i = idx + 1;
              const qtyNum = Number(line.qty) || 0;
              const priorNum = Number(line.prior) || 0;
              const openNum = Number(line.open) || qtyNum;
              const priceNum = Number(line.price) || 0;
              return (
                <tr key={idx} className="text-xs">
                  <td className="border border-gray-300 px-2 py-1">{i}</td>
                  <td className="border border-gray-300 px-2 py-1">{line.sku || "—"}</td>
                  <td className="border border-gray-300 px-2 py-1">{line.desc || "—"}</td>
                  <td className="border border-gray-300 px-2 py-1">
                    <Hl id={`po-hts${i}`}>{line.hts || "—"}</Hl>
                  </td>
                  <td className="border border-gray-300 px-2 py-1 text-right">
                    {qtyNum.toLocaleString()} PCS
                  </td>
                  <td className="border border-gray-300 px-2 py-1 text-right">
                    {priorNum.toLocaleString()}
                  </td>
                  <td className="border border-gray-300 px-2 py-1 text-right">
                    <Hl id={`po-open${i}`}>{openNum.toLocaleString()} PCS</Hl>
                  </td>
                  <td className="border border-gray-300 px-2 py-1 text-right">
                    <Hl id={`po-price${i}`}>${priceNum.toFixed(2)}</Hl>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="text-xs text-gray-500 pt-4 border-t border-gray-200">
        This Purchase Order is issued by {m?.importer_name || "Buyer"} and constitutes the binding
        agreement for the shipment described above.
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Invoice Document (Indian Tally Prime Commercial Invoice)
// ────────────────────────────────────────────────────────────────────────────

function InvDocument({
  data,
  isFixed,
  decisionTrail = [],
}: {
  data: AuditResponse;
  isFixed: boolean;
  decisionTrail?: AuditDecisionLogEntry[];
}) {
  const m = data?.metadata || ({} as any);
  const invLines = data?.inv_lines || [];
  const invWeights = data?.weights?.inv || [];
  const invCartons = data?.cartons?.inv || [];

  const showCertificate =
    isFixed ||
    data?.summary?.status === "CLEAR" ||
    data?.summary?.status === "VERIFIED_CLEAN" ||
    data?.summary?.status === "CLEARED_WITH_EXCEPTIONS" ||
    (data?.items?.length > 0 &&
      data.items.every((it) => it.resolution_state && it.resolution_state !== "UNRESOLVED"));

  return (
    <div className="mx-auto max-w-5xl bg-white shadow-lg rounded border border-gray-300 p-8 space-y-4 font-mono text-sm">
      {/* Tally Prime Header */}
      <div className="border-b-2 border-gray-800 pb-3">
        <div className="text-2xl font-bold text-gray-900 mb-1">COMMERCIAL INVOICE</div>
        <div className="text-xs text-gray-500">Generated by Tally Prime — India GST Compliant</div>
      </div>

      {/* Exporter Details */}
      <div className="bg-blue-50 p-3 rounded">
        <div className="font-bold text-gray-900 mb-1">{m?.exporter_name || "—"}</div>
        <div className="text-xs text-gray-700">{m?.exporter_street || ""}</div>
        <div className="text-xs text-gray-700">
          {[m?.exporter_city, m?.exporter_state, m?.exporter_postal, m?.exporter_country_iso]
            .filter(Boolean)
            .join(", ")}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-gray-500">GSTIN:</span>{" "}
            <span className="font-semibold">{m?.exporter_gstin || "—"}</span>
          </div>
          <div>
            <span className="text-gray-500">IEC:</span>{" "}
            <span className="font-semibold">{m?.exporter_iec || "—"}</span>
          </div>
          <div className="col-span-2">
            <span className="text-gray-500">LUT ARN:</span>{" "}
            <Hl id="inv-lut" className="font-semibold">
              {m?.exporter_lut_arn || "(Missing / Not Provided)"}
            </Hl>
          </div>
        </div>
      </div>

      {/* Invoice Metadata + MID Badge */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1 text-xs">
          <div>
            <span className="text-gray-500">Invoice No:</span>{" "}
            <span className="font-semibold">{m?.invoice_no || "—"}</span>
          </div>
          <div>
            <span className="text-gray-500">Date:</span>{" "}
            <span className="font-semibold">{m?.invoice_date || "—"}</span>
          </div>
          <div>
            <span className="text-gray-500">Buyer PO:</span>{" "}
            <span className="font-semibold">{m?.po_number || "—"}</span>
          </div>
          <div>
            <span className="text-gray-500">Incoterm:</span>{" "}
            <span className="font-semibold">{m?.incoterm || "—"}</span>
          </div>
          <div>
            <span className="text-gray-500">Currency:</span>{" "}
            <span className="font-semibold">{m?.currency || "USD"}</span>
          </div>
        </div>
        <div className="flex items-center justify-end">
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white px-4 py-3 rounded-lg shadow-md text-center">
            <div className="text-xs font-semibold uppercase tracking-wide">US CBP MID Code</div>
            <div className="text-2xl font-bold tracking-wider mt-1">{data?.mid_code || "—"}</div>
          </div>
        </div>
      </div>

      {/* Consignee */}
      <div className="bg-gray-50 p-3 rounded text-xs">
        <div className="text-gray-500 font-semibold mb-1">Consignee (Buyer)</div>
        <div className="font-semibold text-gray-900">{m?.importer_name || "—"}</div>
        <div className="text-gray-700">{m?.importer_city_state || ""}</div>
      </div>

      {/* Line Items */}
      <div>
        <div className="text-xs font-bold text-gray-500 uppercase mb-2">Line Items</div>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 text-xs text-left">
              <th className="border border-gray-300 px-2 py-1">#</th>
              <th className="border border-gray-300 px-2 py-1">Description</th>
              <th className="border border-gray-300 px-2 py-1">HSN/SAC</th>
              <th className="border border-gray-300 px-2 py-1 text-right">Qty (PCS)</th>
              <th className="border border-gray-300 px-2 py-1 text-right">Rate (USD)</th>
              <th className="border border-gray-300 px-2 py-1 text-right">Amount (USD)</th>
            </tr>
          </thead>
          <tbody>
            {invLines.map((line, idx) => {
              const i = idx + 1;
              const qtyNum = Number(line.qty) || 0;
              const rateNum = Number(line.rate) || 0;
              const amountNum = typeof line.amount === "number" ? line.amount : qtyNum * rateNum;
              return (
                <tr key={idx} className="text-xs">
                  <td className="border border-gray-300 px-2 py-1">{i}</td>
                  <td className="border border-gray-300 px-2 py-1">{line.desc || "—"}</td>
                  <td className="border border-gray-300 px-2 py-1">
                    <Hl id={`inv-hsn${i}`}>{line.hsn || "—"}</Hl>
                  </td>
                  <td className="border border-gray-300 px-2 py-1 text-right">
                    <Hl id={`inv-qty${i}`}>{qtyNum.toLocaleString()}</Hl>
                  </td>
                  <td className="border border-gray-300 px-2 py-1 text-right">
                    <Hl id={`inv-rate${i}`}>{rateNum.toFixed(2)}</Hl>
                  </td>
                  <td className="border border-gray-300 px-2 py-1 text-right">
                    <Hl id={`inv-amt${i}`}>
                      {amountNum.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </Hl>
                  </td>
                </tr>
              );
            })}
            <tr className="bg-gray-50 text-xs italic text-gray-500">
              <td colSpan={6} className="border border-gray-300 px-2 py-1">
                IGST @ 0% (Export Under LUT/Bond) — Stripped by PortGate
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Weight & Carton Statement */}
      <div>
        <div className="text-xs font-bold text-gray-500 uppercase mb-2">
          Weight & Carton Statement
        </div>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 text-xs text-left">
              <th className="border border-gray-300 px-2 py-1">#</th>
              <th className="border border-gray-300 px-2 py-1 text-right">Net Wt (KG)</th>
              <th className="border border-gray-300 px-2 py-1 text-right">Gross Wt (KG)</th>
              <th className="border border-gray-300 px-2 py-1 text-right">Cartons</th>
            </tr>
          </thead>
          <tbody>
            {invWeights.map((w, idx) => {
              const i = idx + 1;
              const netNum = Number(Array.isArray(w) ? w[0] : 0) || 0;
              const grossNum = Number(Array.isArray(w) ? w[1] : 0) || 0;
              const ctns = invCartons[idx] != null ? invCartons[idx] : 0;
              return (
                <tr key={idx} className="text-xs">
                  <td className="border border-gray-300 px-2 py-1">{i}</td>
                  <td className="border border-gray-300 px-2 py-1 text-right">
                    <Hl id={`inv-net${i}`}>{netNum.toFixed(2)}</Hl>
                  </td>
                  <td className="border border-gray-300 px-2 py-1 text-right">
                    <Hl id={`inv-gross${i}`}>{grossNum.toFixed(2)}</Hl>
                  </td>
                  <td className="border border-gray-300 px-2 py-1 text-right">{ctns}</td>
                </tr>
              );
            })}
            <tr className="bg-gray-100 font-bold text-xs">
              <td colSpan={3} className="border border-gray-300 px-2 py-1 text-right">
                Total Cartons:
              </td>
              <td className="border border-gray-300 px-2 py-1 text-right">
                <Hl id="inv-ctns">{invCartons.reduce((s, n) => s + (Number(n) || 0), 0)}</Hl>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Document Integrity & Decision Log (if fixed, clear, or resolved) */}
      {showCertificate && (
        <DocumentIntegrityDecisionLog data={data} decisions={decisionTrail} />
      )}

      {/* Footer Declaration */}
      <div className="text-xs text-gray-500 pt-4 border-t border-gray-200">
        We hereby certify that this invoice shows the actual value of the goods described and that
        all information is true and correct. Export under LUT/Bond ARN: {m?.exporter_lut_arn || "—"}.
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Packing List Document
// ────────────────────────────────────────────────────────────────────────────

function PLDocument({ data }: { data: AuditResponse }) {
  const m = data?.metadata || ({} as any);

  const invLines = data?.inv_lines || [];
  const plWeights = data?.weights?.pl || [];
  const plCartons = data?.cartons?.pl || [];

  return (
    <div className="mx-auto max-w-4xl bg-white shadow-lg rounded border border-gray-300 p-8 space-y-4 font-mono text-sm">
      {/* Header */}
      <div className="border-b-2 border-gray-800 pb-3">
        <div className="text-2xl font-bold text-gray-900 mb-1">PACKING LIST</div>
        <div className="text-xs text-gray-600">
          Document No: <span className="font-semibold">{m?.packing_list_no || "—"}</span>
        </div>
      </div>

      {/* Shipper / Consignee */}
      <div className="grid grid-cols-2 gap-4 text-xs">
        <div>
          <div className="text-gray-500 font-semibold mb-1">Shipper (Exporter)</div>
          <div className="font-semibold text-gray-900">{m?.exporter_name || "—"}</div>
          <div className="text-gray-700">
            {[m?.exporter_city, m?.exporter_state, m?.exporter_country_iso].filter(Boolean).join(", ")}
          </div>
        </div>
        <div>
          <div className="text-gray-500 font-semibold mb-1">Consignee (Buyer)</div>
          <div className="font-semibold text-gray-900">{m?.importer_name || "—"}</div>
          <div className="text-gray-700">{m?.importer_city_state || ""}</div>
        </div>
      </div>

      {/* Ports */}
      <div className="bg-gray-50 p-3 rounded text-xs space-y-1">
        <div>
          <span className="text-gray-500">Port of Loading:</span>{" "}
          <span className="font-semibold">{m?.port_of_loading || "INMUN1"}</span>
        </div>
        <div>
          <span className="text-gray-500">Port of Discharge:</span>{" "}
          <span className="font-semibold">{m?.port_of_discharge || "USLAX"}</span>
        </div>
      </div>

      {/* Line Items */}
      <div>
        <div className="text-xs font-bold text-gray-500 uppercase mb-2">Packing Details</div>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 text-xs text-left">
              <th className="border border-gray-300 px-2 py-1">#</th>
              <th className="border border-gray-300 px-2 py-1">Description</th>
              <th className="border border-gray-300 px-2 py-1 text-right">Cartons</th>
              <th className="border border-gray-300 px-2 py-1 text-right">Net Wt (KG)</th>
              <th className="border border-gray-300 px-2 py-1 text-right">Gross Wt (KG)</th>
            </tr>
          </thead>
          <tbody>
            {invLines.map((line, idx) => {
              const i = idx + 1;
              const w = plWeights[idx];
              const netNum = Number(Array.isArray(w) ? w[0] : 0) || 0;
              const grossNum = Number(Array.isArray(w) ? w[1] : 0) || 0;
              const ctns = plCartons[idx] != null ? plCartons[idx] : 0;
              return (
                <tr key={idx} className="text-xs">
                  <td className="border border-gray-300 px-2 py-1">{i}</td>
                  <td className="border border-gray-300 px-2 py-1">{line.desc || "—"}</td>
                  <td className="border border-gray-300 px-2 py-1 text-right">
                    <Hl id={`pl-ct${i}`}>{ctns}</Hl>
                  </td>
                  <td className="border border-gray-300 px-2 py-1 text-right">{netNum.toFixed(2)}</td>
                  <td className="border border-gray-300 px-2 py-1 text-right">{grossNum.toFixed(2)}</td>
                </tr>
              );
            })}
            <tr className="bg-gray-100 font-bold text-xs">
              <td colSpan={2} className="border border-gray-300 px-2 py-1 text-right">
                Total:
              </td>
              <td className="border border-gray-300 px-2 py-1 text-right">
                <Hl id="pl-ctns">{plCartons.reduce((s, n) => s + (Number(n) || 0), 0)} CTNS</Hl>
              </td>
              <td className="border border-gray-300 px-2 py-1 text-right">
                {plWeights.reduce((s, w) => s + (Array.isArray(w) ? Number(w[0]) || 0 : 0), 0).toFixed(2)} KG
              </td>
              <td className="border border-gray-300 px-2 py-1 text-right">
                {plWeights.reduce((s, w) => s + (Array.isArray(w) ? Number(w[1]) || 0 : 0), 0).toFixed(2)} KG
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="text-xs text-gray-500 pt-4 border-t border-gray-200">
        This packing list accompanies shipment {data?.shipment_ref || "—"} and contains accurate weight
        and carton information.
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Document Integrity & Decision Log (replaces former compliance certificate)
// ────────────────────────────────────────────────────────────────────────────

function DocumentIntegrityDecisionLog({
  data,
  decisions = [],
}: {
  data: AuditResponse;
  decisions?: AuditDecisionLogEntry[];
}) {
  const m = data?.metadata || ({} as any);
  const now = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="mt-6 p-4 bg-emerald-50 border-2 border-emerald-500 rounded-lg text-xs space-y-2">
      <div className="flex items-center justify-between">
        <div className="font-bold text-emerald-900 text-sm flex items-center gap-1.5">
          <span>✓</span>
          <span>COMPLIANCE CLEARANCE RECORD</span>
        </div>
        <div className="font-mono text-[10px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded">
          {now}
        </div>
      </div>
      <div className="text-emerald-800 leading-relaxed">
        This shipment packet ({data?.shipment_ref || "—"}) has completed pre-shipment compliance
        auditing. All line items, weights, and classification roots have been resolved or cleared with
        authorized evidence notes on file.
      </div>
      {decisions.length > 0 && (
        <div className="mt-2 pt-2 border-t border-emerald-200 space-y-1">
          <div className="text-[10px] font-bold text-emerald-900 uppercase">
            Logged Buyer Sign-Offs ({decisions.length})
          </div>
          {decisions.map((d) => (
            <div key={d.id} className="text-[11px] text-emerald-900 flex items-center gap-1">
              <span>•</span>
              <span className="font-semibold">{d.title}:</span>
              <span>{d.reason_chip}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
