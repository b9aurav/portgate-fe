"use client";

import React from "react";
import { PoDocumentView } from "./PoDocumentView";
import { InvoiceDocumentView } from "./InvoiceDocumentView";
import { PackingListView } from "./PackingListView";
import type { AuditDecisionLogEntry, AuditResponse } from "@/lib/types";

interface DocumentCanvasProps {
  activeTab: string;
  data: AuditResponse;
  isFixed?: boolean;
  decisionTrail?: AuditDecisionLogEntry[];
}

export function DocumentCanvas({
  activeTab,
  data,
  isFixed = false,
  decisionTrail = [],
}: DocumentCanvasProps) {
  return (
    <div className="flex-1 overflow-y-auto bg-slate-100/70 p-6">
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-8 max-w-5xl mx-auto my-2 transition-all">
        {activeTab === "po" && <PoDocumentView data={data} />}
        {activeTab === "inv" && (
          <InvoiceDocumentView
            data={data}
            isFixed={isFixed}
            decisionTrail={decisionTrail}
          />
        )}
        {activeTab === "pl" && <PackingListView data={data} />}
      </div>
    </div>
  );
}

