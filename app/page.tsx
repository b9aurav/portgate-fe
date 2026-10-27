"use client";

import React, { useState, useEffect } from "react";
import { HighlightProvider } from "@/context/HighlightContext";
import { DocumentViewer } from "@/components/DocumentViewer";
import { AuditSidebar } from "@/components/AuditSidebar";
import { UploadModal } from "@/components/UploadModal";
import { ExportModal } from "@/components/ExportModal";
import { DEFAULT_AUDIT_PACKET } from "@/lib/defaultPacket";
import type { AuditResponse, HealthResponse } from "@/types/audit";

type Phase = "idle" | "run" | "done";

export default function HomePage() {
  const [data, setData] = useState<AuditResponse>(DEFAULT_AUDIT_PACKET);
  const [phase, setPhase] = useState<Phase>("done");
  const [tolerancePct, setTolerancePct] = useState(5.0);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [isFixed, setIsFixed] = useState(false);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [auditCount, setAuditCount] = useState(0); // Track number of audits run

  // Poll backend health on mount
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const response = await fetch(`${apiUrl}/api/health`);
        if (response.ok) {
          const healthData: HealthResponse = await response.json();
          setHealth(healthData);
        }
      } catch (err) {
        console.error("Health check failed:", err);
      }
    };
    checkHealth();
  }, []);

  const handleRunAudit = async (mock: boolean) => {
    setPhase("run");
    setIsFixed(false);

    // Simulate delay for terminal animation
    await new Promise((resolve) => setTimeout(resolve, 2500));

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const formData = new FormData();
      
      // Create a more substantial dummy PDF (backend checks 'if not data')
      const dummyPdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj
4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
100 700 Td
(Mock PDF) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000214 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
308
%%EOF`;
      
      const poFile = new File([dummyPdfContent], "po.pdf", { type: "application/pdf" });
      const invFile = new File([dummyPdfContent], "inv.pdf", { type: "application/pdf" });
      const plFile = new File([dummyPdfContent], "pl.pdf", { type: "application/pdf" });
      
      formData.append("po_pdf", poFile);
      formData.append("inv_pdf", invFile);
      formData.append("pl_pdf", plFile);
      formData.append("tolerance_pct", tolerancePct.toString());
      formData.append("mock", mock.toString());
      
      console.log("FormData entries:", Array.from(formData.entries()).map(([key, value]) => ({
        key,
        value: value instanceof File ? `File: ${value.name} (${value.size} bytes)` : value
      })));

      const response = await fetch(`${apiUrl}/api/audit`, {
        method: "POST",
        body: formData,
        // Let browser set Content-Type with boundary automatically
        // Don't add headers: { 'Content-Type': 'multipart/form-data' } - it will break the boundary
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Audit request failed");
      }

      const auditData: AuditResponse = await response.json();
      setData(auditData);
      setPhase("done");
    } catch (err) {
      console.error("Audit failed:", err);
      alert(`Audit failed: ${err instanceof Error ? err.message : "Unknown error"}`);
      setPhase("done");
    }
  };

  const handleUploadSuccess = (auditData: AuditResponse) => {
    console.log("handleUploadSuccess called with:", {
      shipment_ref: auditData.shipment_ref,
      summary: auditData.summary,
      items_count: auditData.items.length,
      mid_code: auditData.mid_code,
    });
    console.log("Current data before update:", {
      shipment_ref: data.shipment_ref,
      summary: data.summary,
      items_count: data.items.length,
    });
    setData(auditData);
    setPhase("done");
    setIsFixed(false);
    setAuditCount((prev) => prev + 1); // Increment counter to force UI refresh indicator
  };

  const m = data.metadata;

  return (
    <HighlightProvider>
      <div className="flex flex-col h-screen bg-gray-100">
        {/* Top Navigation Bar */}
        <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="text-2xl font-bold text-blue-600">PortGate</div>
            <div className="text-sm text-gray-600">
              <span className="font-semibold">#{data.shipment_ref}</span> ·{" "}
              {m.port_of_loading} → {m.port_of_discharge}
              {auditCount > 0 && <span className="ml-2 text-xs text-gray-400">(audit #{auditCount})</span>}
            </div>
            <div
              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                data.summary.status === "BLOCKED"
                  ? "bg-red-100 text-red-800"
                  : "bg-green-100 text-green-800"
              }`}
            >
              {data.summary.status}
            </div>
            {health && (
              <div
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  health.status === "ok"
                    ? "bg-blue-100 text-blue-800"
                    : "bg-gray-100 text-gray-600"
                }`}
                title={`Backend: ${health.gemini_model}, API Key: ${health.api_key_configured ? "✓" : "✗"}`}
              >
                Backend: {health.status.toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setUploadModalOpen(true)}
              className="bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium py-2 px-4 rounded-lg transition-colors text-sm"
            >
              + Upload Custom Packet
            </button>
            <button
              type="button"
              onClick={() => handleRunAudit(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
            >
              ⚡ Run Live 3-Way Audit
            </button>
          </div>
        </nav>

        {/* Main Workspace: Split-Screen Layout */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Pane: Document Viewer */}
          <div className="flex-1 overflow-hidden">
            <DocumentViewer data={data} isFixed={isFixed} />
          </div>

          {/* Right Pane: Audit Sidebar */}
          <div className="w-96 border-l border-gray-200 overflow-hidden">
            <AuditSidebar
              data={data}
              phase={phase}
              tolerancePct={tolerancePct}
              setTolerancePct={setTolerancePct}
              onRunAudit={handleRunAudit}
              onUpload={() => setUploadModalOpen(true)}
              onExport={() => setExportModalOpen(true)}
              isFixed={isFixed}
              setIsFixed={setIsFixed}
              setData={setData}
            />
          </div>
        </div>

        {/* Modals */}
        <UploadModal
          isOpen={uploadModalOpen}
          onClose={() => setUploadModalOpen(false)}
          onSuccess={handleUploadSuccess}
          tolerancePct={tolerancePct}
        />
        <ExportModal
          isOpen={exportModalOpen}
          onClose={() => setExportModalOpen(false)}
          data={data}
        />
      </div>
    </HighlightProvider>
  );
}
