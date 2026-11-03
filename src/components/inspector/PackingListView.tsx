"use client";

import React from "react";
import { Hl } from "@/components/HighlightCell";
import type { AuditResponse } from "@/lib/types";

interface PackingListViewProps {
  data: AuditResponse;
}

export function PackingListView({ data }: PackingListViewProps) {
  const m = data?.metadata || ({} as any);
  const invLines = data?.inv_lines || [];
  const plWeights = data?.weights?.pl || [];
  const plCartons = data?.cartons?.pl || [];

  return (
    <div className="space-y-6 font-mono text-xs">
      {/* Header */}
      <div className="border-b-2 border-slate-900 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xl font-bold tracking-tight text-slate-900">
              PACKING LIST
            </div>
            <div className="text-[11px] text-slate-500 font-sans mt-0.5">
              Physical Cargo Schedule & Container Packing Statement
            </div>
          </div>
          <div className="text-right text-xs space-y-0.5">
            <div>
              <span className="text-slate-500">Document No: </span>
              <span className="font-bold text-slate-900">{m?.packing_list_no || "PL-2026-441"}</span>
            </div>
            <div>
              <span className="text-slate-500">Shipment Ref: </span>
              <span className="font-bold text-slate-900">{data?.shipment_ref || "—"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Shipper & Consignee */}
      <div className="grid grid-cols-2 gap-6 bg-slate-50/70 border border-slate-200 rounded-lg p-4">
        <div>
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">
            SHIPPER / EXPORTER OF RECORD
          </div>
          <div className="font-bold text-slate-900">{m?.exporter_name || "—"}</div>
          <div className="text-slate-600">
            {[m?.exporter_city, m?.exporter_state, m?.exporter_country_iso].filter(Boolean).join(", ")}
          </div>
        </div>
        <div>
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">
            Consignee / Importer
          </div>
          <div className="font-bold text-slate-900">{m?.importer_name || "—"}</div>
          <div className="text-slate-600">{m?.importer_city_state || ""}</div>
        </div>
      </div>

      {/* Port Routing */}
      <div className="grid grid-cols-2 gap-4 bg-slate-100/60 border border-slate-200 rounded-lg p-3">
        <div>
          <span className="text-slate-500 font-sans">Port of Loading: </span>
          <span className="font-bold text-slate-800">{m?.port_of_loading || "INMUN1"}</span>
        </div>
        <div>
          <span className="text-slate-500 font-sans">Port of Discharge: </span>
          <span className="font-bold text-slate-800">{m?.port_of_discharge || "USLAX"}</span>
        </div>
      </div>

      {/* Packing Details Table */}
      <div>
        <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2 font-sans">
          Carton & Weight Breakdown
        </div>
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-100/80 text-left text-slate-700 font-semibold border-b border-slate-200">
                <th className="px-2.5 py-2 w-8">#</th>
                <th className="px-2.5 py-2">Item Description</th>
                <th className="px-2.5 py-2 text-right">Carton Count</th>
                <th className="px-2.5 py-2 text-right">Net Weight (KG)</th>
                <th className="px-2.5 py-2 text-right">Gross Weight (KG)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invLines.map((line, idx) => {
                const i = idx + 1;
                const w = plWeights[idx];
                const netNum = Number(Array.isArray(w) ? w[0] : 0) || 0;
                const grossNum = Number(Array.isArray(w) ? w[1] : 0) || 0;
                const ctns = plCartons[idx] != null ? plCartons[idx] : 0;

                return (
                  <tr key={idx} className="hover:bg-slate-50/60">
                    <td className="px-2.5 py-2 text-slate-400">{i}</td>
                    <td className="px-2.5 py-2 font-medium text-slate-800">{line.desc || "—"}</td>
                    <td className="px-2.5 py-2 text-right font-medium">
                      <Hl id={`pl-ct${i}`}>{ctns} CTNS</Hl>
                    </td>
                    <td className="px-2.5 py-2 text-right text-slate-700">
                      <Hl id={`pl-net${i}`}>{netNum.toFixed(2)} KG</Hl>
                    </td>
                    <td className="px-2.5 py-2 text-right text-slate-700">
                      <Hl id={`pl-gross${i}`}>{grossNum.toFixed(2)} KG</Hl>
                    </td>
                  </tr>
                );
              })}
              <tr className="bg-slate-100/80 font-bold border-t border-slate-200">
                <td colSpan={2} className="px-2.5 py-2 text-right text-slate-700">
                  Total Packed Cargo:
                </td>
                <td className="px-2.5 py-2 text-right font-bold text-slate-900">
                  <Hl id="pl-ctns">
                    {m?.total_cartons != null
                      ? m.total_cartons
                      : plCartons.length > 0
                      ? plCartons.reduce((s, n) => s + (Number(n) || 0), 0)
                      : 0} CTNS
                  </Hl>
                </td>
                <td className="px-2.5 py-2 text-right font-bold text-slate-900">
                  <Hl id="pl-net-wt">
                    {plWeights
                      .reduce((s, w) => s + (Array.isArray(w) ? Number(w[0]) || 0 : 0), 0)
                      .toFixed(2)}{" "}
                    KG
                  </Hl>
                </td>
                <td className="px-2.5 py-2 text-right font-bold text-slate-900">
                  <Hl id="pl-gross-wt">
                    {plWeights
                      .reduce((s, w) => s + (Array.isArray(w) ? Number(w[1]) || 0 : 0), 0)
                      .toFixed(2)}{" "}
                    KG
                  </Hl>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-3 border-t border-slate-200 text-[11px] text-slate-400 font-sans">
        Physical cargo manifest for shipment {data?.shipment_ref || "—"}. Declared weights verified by scale tally.
      </div>
    </div>
  );
}

