"use client";

import React from "react";
import { useHighlight } from "@/context/HighlightContext";
import { Hl } from "./HighlightCell";
import type { AuditResponse } from "@/types/audit";

interface DocumentViewerProps {
  data: AuditResponse;
  isFixed: boolean;
}

export function DocumentViewer({ data, isFixed }: DocumentViewerProps) {
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
                ? "border-b-2 border-blue-600 text-blue-600"
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
        {activeTab === "inv" && <InvDocument data={data} isFixed={isFixed} />}
        {activeTab === "pl" && <PLDocument data={data} />}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// PO Document (US Buyer Purchase Order)
// ────────────────────────────────────────────────────────────────────────────

function PODocument({ data }: { data: AuditResponse }) {
  const m = data.metadata;

  return (
    <div className="mx-auto max-w-4xl bg-white shadow-lg rounded border border-gray-300 p-8 space-y-6 font-mono text-sm">
      {/* ERP Header */}
      <div className="border-b-2 border-gray-800 pb-4">
        <div className="text-2xl font-bold text-gray-900 mb-1">PURCHASE ORDER</div>
        <div className="text-gray-600">
          PO Number: <span className="font-semibold text-gray-900">{m.po_number}</span>
        </div>
        <div className="text-gray-600">
          Shipment Ref: <span className="font-semibold text-gray-900">{data.shipment_ref}</span>
        </div>
      </div>

      {/* Seller / Buyer */}
      <div className="grid grid-cols-2 gap-6">
        <div>
          <div className="text-xs font-bold text-gray-500 uppercase mb-1">Seller (Exporter)</div>
          <div className="font-semibold text-gray-900">{m.exporter_name}</div>
          <div className="text-gray-700">{m.exporter_street}</div>
          <div className="text-gray-700">
            {m.exporter_city}, {m.exporter_state} {m.exporter_postal}
          </div>
          <div className="text-gray-700">{m.exporter_country_iso}</div>
        </div>
        <div>
          <div className="text-xs font-bold text-gray-500 uppercase mb-1">Buyer (Importer)</div>
          <div className="font-semibold text-gray-900">{m.importer_name}</div>
          <div className="text-gray-700">{m.importer_city_state}</div>
        </div>
      </div>

      {/* Terms */}
      <div className="grid grid-cols-3 gap-4 bg-gray-50 p-3 rounded">
        <div>
          <div className="text-xs text-gray-500">Incoterm</div>
          <div className="font-semibold">{m.po_incoterm || m.incoterm}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Currency</div>
          <div className="font-semibold">{m.po_currency || m.currency}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Port of Loading</div>
          <div className="font-semibold">{m.port_of_loading}</div>
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
            {data.po_lines.map((line, idx) => {
              const i = idx + 1;
              return (
                <tr key={idx} className="text-xs">
                  <td className="border border-gray-300 px-2 py-1">{i}</td>
                  <td className="border border-gray-300 px-2 py-1">{line.sku}</td>
                  <td className="border border-gray-300 px-2 py-1">{line.desc}</td>
                  <td className="border border-gray-300 px-2 py-1">
                    <Hl id={`po-hts${i}`}>{line.hts}</Hl>
                  </td>
                  <td className="border border-gray-300 px-2 py-1 text-right">
                    {line.qty.toLocaleString()} PCS
                  </td>
                  <td className="border border-gray-300 px-2 py-1 text-right">
                    {line.prior.toLocaleString()}
                  </td>
                  <td className="border border-gray-300 px-2 py-1 text-right">
                    <Hl id={`po-open${i}`}>{line.open.toLocaleString()} PCS</Hl>
                  </td>
                  <td className="border border-gray-300 px-2 py-1 text-right">
                    <Hl id={`po-price${i}`}>${line.price.toFixed(2)}</Hl>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="text-xs text-gray-500 pt-4 border-t border-gray-200">
        This Purchase Order is issued by {m.importer_name} and constitutes the buyer's binding
        agreement for the shipment described above.
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Invoice Document (Indian Tally Prime Commercial Invoice)
// ────────────────────────────────────────────────────────────────────────────

function InvDocument({ data, isFixed }: { data: AuditResponse; isFixed: boolean }) {
  const m = data.metadata;
  const showCertificate = isFixed || data.summary.status === "CLEAR";

  return (
    <div className="mx-auto max-w-5xl bg-white shadow-lg rounded border border-gray-300 p-8 space-y-4 font-mono text-sm">
      {/* Tally Prime Header */}
      <div className="border-b-2 border-gray-800 pb-3">
        <div className="text-2xl font-bold text-gray-900 mb-1">COMMERCIAL INVOICE</div>
        <div className="text-xs text-gray-500">Generated by Tally Prime — India GST Compliant</div>
      </div>

      {/* Exporter Details */}
      <div className="bg-blue-50 p-3 rounded">
        <div className="font-bold text-gray-900 mb-1">{m.exporter_name}</div>
        <div className="text-xs text-gray-700">{m.exporter_street}</div>
        <div className="text-xs text-gray-700">
          {m.exporter_city}, {m.exporter_state} {m.exporter_postal}, {m.exporter_country_iso}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-gray-500">GSTIN:</span>{" "}
            <span className="font-semibold">{m.exporter_gstin}</span>
          </div>
          <div>
            <span className="text-gray-500">IEC:</span>{" "}
            <span className="font-semibold">{m.exporter_iec}</span>
          </div>
          <div className="col-span-2">
            <span className="text-gray-500">LUT ARN:</span>{" "}
            <span className="font-semibold">{m.exporter_lut_arn || "(Missing)"}</span>
          </div>
        </div>
      </div>

      {/* Invoice Metadata + MID Badge */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1 text-xs">
          <div>
            <span className="text-gray-500">Invoice No:</span>{" "}
            <span className="font-semibold">{m.invoice_no}</span>
          </div>
          <div>
            <span className="text-gray-500">Date:</span>{" "}
            <span className="font-semibold">{m.invoice_date}</span>
          </div>
          <div>
            <span className="text-gray-500">Buyer PO:</span>{" "}
            <span className="font-semibold">{m.po_number}</span>
          </div>
          <div>
            <span className="text-gray-500">Incoterm:</span>{" "}
            <span className="font-semibold">{m.incoterm}</span>
          </div>
          <div>
            <span className="text-gray-500">Currency:</span>{" "}
            <span className="font-semibold">{m.currency}</span>
          </div>
        </div>
        <div className="flex items-center justify-end">
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white px-4 py-3 rounded-lg shadow-md text-center">
            <div className="text-xs font-semibold uppercase tracking-wide">US CBP MID Code</div>
            <div className="text-2xl font-bold tracking-wider mt-1">{data.mid_code}</div>
          </div>
        </div>
      </div>

      {/* Consignee */}
      <div className="bg-gray-50 p-3 rounded text-xs">
        <div className="text-gray-500 font-semibold mb-1">Consignee (Buyer)</div>
        <div className="font-semibold text-gray-900">{m.importer_name}</div>
        <div className="text-gray-700">{m.importer_city_state}</div>
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
            {data.inv_lines.map((line, idx) => {
              const i = idx + 1;
              const amount = line.qty * line.rate;
              return (
                <tr key={idx} className="text-xs">
                  <td className="border border-gray-300 px-2 py-1">{i}</td>
                  <td className="border border-gray-300 px-2 py-1">{line.desc}</td>
                  <td className="border border-gray-300 px-2 py-1">
                    <Hl id={`inv-hsn${i}`}>{line.hsn}</Hl>
                  </td>
                  <td className="border border-gray-300 px-2 py-1 text-right">
                    <Hl id={`inv-qty${i}`}>{line.qty.toLocaleString()}</Hl>
                  </td>
                  <td className="border border-gray-300 px-2 py-1 text-right">
                    <Hl id={`inv-rate${i}`}>{line.rate.toFixed(2)}</Hl>
                  </td>
                  <td className="border border-gray-300 px-2 py-1 text-right">
                    <Hl id={`inv-amt${i}`}>{amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Hl>
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
            {data.weights.inv.map(([net, gross], idx) => {
              const i = idx + 1;
              const ctns = data.cartons.inv[idx];
              return (
                <tr key={idx} className="text-xs">
                  <td className="border border-gray-300 px-2 py-1">{i}</td>
                  <td className="border border-gray-300 px-2 py-1 text-right">
                    <Hl id={`inv-net${i}`}>{net.toFixed(2)}</Hl>
                  </td>
                  <td className="border border-gray-300 px-2 py-1 text-right">
                    <Hl id={`inv-gross${i}`}>{gross.toFixed(2)}</Hl>
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
                <Hl id="inv-ctns">{data.cartons.inv.reduce((s, n) => s + n, 0)}</Hl>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Compliance Certificate (if fixed or clear) */}
      {showCertificate && <ComplianceCertificate data={data} />}

      {/* Footer Declaration */}
      <div className="text-xs text-gray-500 pt-4 border-t border-gray-200">
        We hereby certify that this invoice shows the actual value of the goods described and that
        all information is true and correct. Export under LUT/Bond ARN: {m.exporter_lut_arn}.
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Packing List Document
// ────────────────────────────────────────────────────────────────────────────

function PLDocument({ data }: { data: AuditResponse }) {
  const m = data.metadata;

  return (
    <div className="mx-auto max-w-4xl bg-white shadow-lg rounded border border-gray-300 p-8 space-y-4 font-mono text-sm">
      {/* Header */}
      <div className="border-b-2 border-gray-800 pb-3">
        <div className="text-2xl font-bold text-gray-900 mb-1">PACKING LIST</div>
        <div className="text-xs text-gray-600">
          Document No: <span className="font-semibold">{m.packing_list_no}</span>
        </div>
      </div>

      {/* Shipper / Consignee */}
      <div className="grid grid-cols-2 gap-4 text-xs">
        <div>
          <div className="text-gray-500 font-semibold mb-1">Shipper (Exporter)</div>
          <div className="font-semibold text-gray-900">{m.exporter_name}</div>
          <div className="text-gray-700">
            {m.exporter_city}, {m.exporter_state}, {m.exporter_country_iso}
          </div>
        </div>
        <div>
          <div className="text-gray-500 font-semibold mb-1">Consignee (Buyer)</div>
          <div className="font-semibold text-gray-900">{m.importer_name}</div>
          <div className="text-gray-700">{m.importer_city_state}</div>
        </div>
      </div>

      {/* Ports */}
      <div className="bg-gray-50 p-3 rounded text-xs space-y-1">
        <div>
          <span className="text-gray-500">Port of Loading:</span>{" "}
          <span className="font-semibold">{m.port_of_loading}</span>
        </div>
        <div>
          <span className="text-gray-500">Port of Discharge:</span>{" "}
          <span className="font-semibold">{m.port_of_discharge}</span>
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
            {data.inv_lines.map((line, idx) => {
              const i = idx + 1;
              const [net, gross] = data.weights.pl[idx];
              const ctns = data.cartons.pl[idx];
              return (
                <tr key={idx} className="text-xs">
                  <td className="border border-gray-300 px-2 py-1">{i}</td>
                  <td className="border border-gray-300 px-2 py-1">{line.desc}</td>
                  <td className="border border-gray-300 px-2 py-1 text-right">
                    <Hl id={`pl-ct${i}`}>{ctns}</Hl>
                  </td>
                  <td className="border border-gray-300 px-2 py-1 text-right">{net.toFixed(2)}</td>
                  <td className="border border-gray-300 px-2 py-1 text-right">{gross.toFixed(2)}</td>
                </tr>
              );
            })}
            <tr className="bg-gray-100 font-bold text-xs">
              <td colSpan={2} className="border border-gray-300 px-2 py-1 text-right">
                Total:
              </td>
              <td className="border border-gray-300 px-2 py-1 text-right">
                <Hl id="pl-ctns">{data.cartons.pl.reduce((s, n) => s + n, 0)} CTNS</Hl>
              </td>
              <td className="border border-gray-300 px-2 py-1 text-right">
                {data.weights.pl.reduce((s, [n]) => s + n, 0).toFixed(2)} KG
              </td>
              <td className="border border-gray-300 px-2 py-1 text-right">
                {data.weights.pl.reduce((s, [, g]) => s + g, 0).toFixed(2)} KG
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="text-xs text-gray-500 pt-4 border-t border-gray-200">
        This packing list accompanies shipment {data.shipment_ref} and contains accurate weight and
        carton information.
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Compliance Certificate (shown when isFixed or status === "CLEAR")
// ────────────────────────────────────────────────────────────────────────────

function ComplianceCertificate({ data }: { data: AuditResponse }) {
  const [hash, setHash] = React.useState<string>("");

  React.useEffect(() => {
    const generateHash = async () => {
      const payload = JSON.stringify({
        shipment_ref: data.shipment_ref,
        mid: data.mid_code,
        status: data.summary.status,
      });
      const buffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
      const hashArray = Array.from(new Uint8Array(buffer));
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
      setHash(hashHex.substring(0, 16).toUpperCase());
    };
    generateHash();
  }, [data]);

  return (
    <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-600 rounded-lg p-4 space-y-2">
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
          ✓
        </div>
        <div>
          <div className="text-sm font-bold text-green-900">
            PortGate Compliance Certificate
          </div>
          <div className="text-xs text-green-700">
            3-Way Pre-Shipment Audit — India→US Corridor
          </div>
        </div>
      </div>
      <div className="bg-white rounded p-2 text-xs font-mono space-y-1">
        <div>
          <span className="text-gray-500">Shipment Ref:</span>{" "}
          <span className="font-semibold">{data.shipment_ref}</span>
        </div>
        <div>
          <span className="text-gray-500">MID Code:</span>{" "}
          <span className="font-semibold">{data.mid_code}</span>
        </div>
        <div>
          <span className="text-gray-500">Status:</span>{" "}
          <span className="font-semibold text-green-700">{data.summary.status}</span>
        </div>
        <div>
          <span className="text-gray-500">SHA-256 Hash:</span>{" "}
          <span className="font-semibold text-gray-900">{hash}</span>
        </div>
      </div>
      <div className="text-xs text-green-800 leading-relaxed">
        This shipment has been verified by PortGate's deterministic compliance engine against all
        5 rule categories. All critical discrepancies have been resolved, and the packet is cleared
        for CBP entry filing.
      </div>
    </div>
  );
}
