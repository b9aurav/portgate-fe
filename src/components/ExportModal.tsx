"use client";

import React, { useState } from "react";
import type { AuditResponse } from "@/types/audit";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: AuditResponse;
}

export function ExportModal({ isOpen, onClose, data }: ExportModalProps) {
  const [view, setView] = useState<"isf" | "csv">("isf");

  if (!isOpen) return null;

  const csvData = generateCargoWiseCSV(data);

  const handleDownload = () => {
    const blob = new Blob([csvData], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `portgate_${data.shipment_ref}_cargowise.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto m-4">
        {/* Header */}
        <div className="border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Export Documents</h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            >
              ×
            </button>
          </div>
          {/* View Toggle */}
          <div className="flex gap-2 mt-4">
            <button
              type="button"
              onClick={() => setView("isf")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                view === "isf"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              ISF (10+2) Preview
            </button>
            <button
              type="button"
              onClick={() => setView("csv")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                view === "csv"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              CargoWise CSV
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          {view === "isf" && <ISFView data={data} />}
          {view === "csv" && <CSVView csvData={csvData} onDownload={handleDownload} />}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium py-2 px-6 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ISF (10+2) Importer Security Filing Preview
function ISFView({ data }: { data: AuditResponse }) {
  const m = data.metadata;

  // Extract 6-digit HS roots
  const hsRoots = data.po_lines.map((line) => {
    const cleaned = line.hts.replace(/[\s.\-]/g, "");
    const root = cleaned.substring(0, 6);
    return root.substring(0, 4) + "." + root.substring(4, 6);
  });

  return (
    <div className="space-y-4 font-mono text-sm">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="text-lg font-bold text-blue-900 mb-2">
          ISF (10+2) Importer Security Filing
        </div>
        <div className="text-xs text-blue-700">
          Data required for US CBP Importer Security Filing (10+2 rule). Must be transmitted to CBP
          at least 24 hours before vessel departure.
        </div>
      </div>

      <div className="space-y-3 text-xs">
        <InfoRow label="Seller (Exporter)" value={m.exporter_name} />
        <InfoRow label="Seller Address" value={`${m.exporter_street}, ${m.exporter_city}, ${m.exporter_state}, ${m.exporter_postal}, ${m.exporter_country_iso}`} />
        <InfoRow label="Buyer (Importer)" value={m.importer_name} />
        <InfoRow label="Buyer Address" value={m.importer_city_state} />
        <InfoRow label="Importer of Record (IOR)" value={m.importer_name} />
        <InfoRow label="Manufacturer MID Code" value={data.mid_code} />
        <InfoRow label="Country of Origin" value={m.exporter_country_iso} />
        <InfoRow label="Port of Loading" value={m.port_of_loading} />
        <InfoRow label="Port of Discharge" value={m.port_of_discharge} />
        <InfoRow label="Shipment Ref" value={data.shipment_ref} />
        <InfoRow
          label="6-Digit HS/HTS Tariff Codes"
          value={hsRoots.join(", ")}
        />
        <InfoRow label="Container Stuffing Location" value={`${m.exporter_city}, ${m.exporter_country_iso}`} />
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-xs text-yellow-800">
        <strong>Note:</strong> This preview shows the data required for ISF filing. Your customs
        broker or freight forwarder will submit this to CBP via ABI (Automated Broker Interface).
      </div>
    </div>
  );
}

// CargoWise CSV Preview & Download
function CSVView({ csvData, onDownload }: { csvData: string; onDownload: () => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-gray-700">
          CargoWise One Entry CSV Preview
        </div>
        <button
          type="button"
          onClick={onDownload}
          className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
        >
          ⬇️ Download CSV
        </button>
      </div>

      <div className="bg-gray-50 border border-gray-300 rounded-lg p-4 overflow-x-auto">
        <pre className="text-xs font-mono whitespace-pre">{csvData}</pre>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs text-blue-800">
        <strong>Usage:</strong> Import this CSV into CargoWise One via the Customs Entry module.
        All line-item data (SKU, HTS, Qty, Price, Weight) is formatted for direct ingestion.
      </div>
    </div>
  );
}

// Helper: Info Row
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="text-gray-500 font-semibold">{label}:</div>
      <div className="col-span-2 text-gray-900">{value}</div>
    </div>
  );
}

// CargoWise CSV Generator
function generateCargoWiseCSV(data: AuditResponse): string {
  const m = data.metadata;
  const lines: string[] = [];

  // CSV Header
  lines.push(
    "Line,SKU,Description,HTS,Qty,UnitPrice,Amount,NetWt_KG,GrossWt_KG,Cartons,Incoterm,Currency,Seller,Buyer,POL,POD,MID"
  );

  // Line Items
  data.po_lines.forEach((po, idx) => {
    const inv = data.inv_lines[idx];
    const [net, gross] = data.weights.inv[idx];
    const ctns = data.cartons.inv[idx];
    const amount = inv.qty * inv.rate;

    lines.push(
      [
        idx + 1,
        po.sku,
        `"${inv.desc}"`,
        po.hts,
        inv.qty,
        inv.rate.toFixed(2),
        amount.toFixed(2),
        net.toFixed(2),
        gross.toFixed(2),
        ctns,
        m.incoterm,
        m.currency,
        `"${m.exporter_name}"`,
        `"${m.importer_name}"`,
        m.port_of_loading,
        m.port_of_discharge,
        data.mid_code,
      ].join(",")
    );
  });

  return lines.join("\n");
}
