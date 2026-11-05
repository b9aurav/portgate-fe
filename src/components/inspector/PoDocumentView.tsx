"use client";

import React from "react";
import { Hl } from "@/components/HighlightCell";
import type { AuditResponse } from "@/lib/types";

interface PoDocumentViewProps {
  data: AuditResponse;
}

export function PoDocumentView({ data }: PoDocumentViewProps) {
  const m = data?.metadata || ({} as any);
  const poLines = data?.po_lines || [];
  const po = data?.packet?.buyer_po;
  const sellerName = po?.supplier_name || po?.vendor_name || m?.po_supplier_name || "—";
  const sellerAddress = po?.supplier_address || m?.po_supplier_address || "";
  const buyerName = po?.buyer_name || m?.importer_name || "Pacific Coast Retail Group LLC";

  return (
    <div className="space-y-6 font-mono text-xs">
      {/* Document Header */}
      <div className="border-b-2 border-slate-900 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xl font-bold tracking-tight text-slate-900">
              PURCHASE ORDER
            </div>
            <div className="text-[11px] text-slate-500 font-sans mt-0.5">
              US Buyer Commercial Contract · Authoritative Line Schedule
            </div>
          </div>
          <div className="text-right text-xs space-y-0.5">
            <div>
              <span className="text-slate-500">PO Number: </span>
              <Hl id="po-number" className="font-bold text-slate-900">
                {po?.po_number || m?.po_number || "PO-9921"}
              </Hl>
            </div>
            <div>
              <span className="text-slate-500">Shipment Ref: </span>
              <span className="font-bold text-slate-900">{data?.shipment_ref || "—"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Exporter & Importer Entity Grid */}
      <div className="grid grid-cols-2 gap-6 bg-slate-50/70 border border-slate-200 rounded-lg p-4">
        <div>
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">
            SELLER (EXPORTER / BENEFICIARY)
          </div>
          <div className="font-bold text-slate-900">{sellerName}</div>
          {sellerAddress ? (
            <div className="text-slate-600 whitespace-pre-line">{sellerAddress}</div>
          ) : (
            <>
              <div className="text-slate-600">{m?.exporter_street || ""}</div>
              <div className="text-slate-600">
                {[m?.exporter_city, m?.exporter_state, m?.exporter_postal].filter(Boolean).join(", ")}
              </div>
              <div className="text-slate-600">{m?.exporter_country_iso || "IN"}</div>
            </>
          )}
        </div>
        <div>
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">
            Buyer (Importer / Consignee)
          </div>
          <div className="font-bold text-slate-900">{buyerName}</div>
          <div className="text-slate-600">{m?.importer_city_state || "Los Angeles, CA"}</div>
          <div className="text-slate-600">United States</div>
        </div>
      </div>

      {/* Commercial Terms Strip */}
      <div className="grid grid-cols-3 gap-4 bg-slate-100/60 border border-slate-200 rounded-lg p-3">
        <div>
          <div className="text-[10px] text-slate-500 font-sans uppercase">Incoterm</div>
          <div className="font-semibold text-slate-800">
            {m?.po_incoterm || m?.incoterm || "FOB"}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-slate-500 font-sans uppercase">Contract Currency</div>
          <div className="font-semibold text-slate-800">
            {m?.po_currency || m?.currency || "USD"}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-slate-500 font-sans uppercase">Declared Port of Loading</div>
          <div className="font-semibold text-slate-800">
            {m?.port_of_loading || "INMUN1"}
          </div>
        </div>
      </div>

      {/* Line Items Table */}
      <div>
        <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2 font-sans">
          Contract Line Schedule
        </div>
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-100/80 text-left text-slate-700 font-semibold border-b border-slate-200">
                <th className="px-2.5 py-2 w-8">#</th>
                <th className="px-2.5 py-2">SKU</th>
                <th className="px-2.5 py-2">Item Description</th>
                <th className="px-2.5 py-2">HTS Root (US)</th>
                <th className="px-2.5 py-2 text-right">Order Qty</th>
                <th className="px-2.5 py-2 text-right">Prior Shipped</th>
                <th className="px-2.5 py-2 text-right">Open Balance</th>
                <th className="px-2.5 py-2 text-right">Unit Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {poLines.map((line, idx) => {
                const i = idx + 1;
                const qtyNum = Number(line.qty) || 0;
                const priorNum = Number(line.prior) || 0;
                const openNum = Number(line.open) || qtyNum;
                const priceNum = Number(line.price) || 0;

                return (
                  <tr key={idx} className="hover:bg-slate-50/60">
                    <td className="px-2.5 py-2 text-slate-400">{i}</td>
                    <td className="px-2.5 py-2 font-semibold text-slate-800">{line.sku || "—"}</td>
                    <td className="px-2.5 py-2 text-slate-700">{line.desc || "—"}</td>
                    <td className="px-2.5 py-2">
                      <Hl id={`po-hts${i}`}>{line.hts || "—"}</Hl>
                    </td>
                    <td className="px-2.5 py-2 text-right text-slate-700">
                      {qtyNum.toLocaleString()} PCS
                    </td>
                    <td className="px-2.5 py-2 text-right text-slate-400">
                      {priorNum.toLocaleString()}
                    </td>
                    <td className="px-2.5 py-2 text-right font-medium text-slate-800">
                      <Hl id={`po-open${i}`}>{openNum.toLocaleString()} PCS</Hl>
                    </td>
                    <td className="px-2.5 py-2 text-right font-semibold text-slate-900">
                      <Hl id={`po-price${i}`}>${priceNum.toFixed(2)}</Hl>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-3 border-t border-slate-200 text-[11px] text-slate-400 font-sans">
        This Purchase Order constitutes the locked commercial baseline issued by {m?.importer_name || "US Buyer"}.
      </div>
    </div>
  );
}

