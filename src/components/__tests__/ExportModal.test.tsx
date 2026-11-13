import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ExportModal } from "../ExportModal";
import { mockActiveAuditV1 } from "@/test/fixtures";
import { AuditResponse } from "@/lib/types";

describe("ExportModal Component & Customs Data Exports", () => {
  const sampleAudit: AuditResponse = {
    ...mockActiveAuditV1,
    metadata: {
      ...mockActiveAuditV1.metadata,
      importer_name: "Pacific Coast Retail Group LLC",
      exporter_name: "Shreeji Textiles Pvt Ltd",
      exporter_gstin: "24AABCS1429B1Z5",
      exporter_city: "Surat",
      exporter_country_iso: "IN",
    },
    po_lines: [
      {
        sku: "=cmd|' /C calc'!A0",
        desc: "Cotton Crew Neck T-Shirt",
        hts: "6109.10.0012",
        qty: 1000,
        prior: 0,
        open: 1000,
        price: 5.5,
      },
    ],
    inv_lines: [
      {
        desc: "Cotton Crew Neck T-Shirt",
        hsn: "6109.10.00",
        qty: 1000,
        rate: 5.5,
        po_line_ref: 1,
      },
      {
        desc: "Polished Ceramic Tiles (Unordered)",
        hsn: "6907.21.00",
        qty: 50,
        rate: 12.0,
      },
    ],
    decision_trail: [
      {
        id: "DEC-1",
        discrepancy_id: "DISC-CARTONS",
        title: "Carton Parity Conflict",
        previous_state: "UNRESOLVED",
        new_state: "ACCEPTED_EXCEPTION",
        action: "ACCEPT_VARIANCE",
        reason_chip: "Commercial Agreement",
        note: "Accepted 10 ctn split tolerance per buyer email agreement dated 2026-10-15.",
        actor_role: "BUYER_WORKBENCH",
        actor_name: "Import Specialist Jane Doe",
        timestamp: "14:22:01",
      },
    ],
  };

  it("renders ISF 10+2 pre-check with US IRS EIN on file and dynamic HTS-6 roots (CHAOS-03)", () => {
    render(<ExportModal isOpen={true} onClose={() => {}} data={sampleAudit} />);

    // Switch to ISF worksheet tab
    const isfTab = screen.getByRole("button", { name: /ISF Pre-Check Worksheet/i });
    fireEvent.click(isfTab);

    // Verify Element 8 uses US IRS EIN on file (never Indian exporter GSTIN)
    expect(screen.getByText("8. Consignee Number")).toBeInTheDocument();
    expect(
      screen.getByText("US IRS EIN on File (Pacific Coast Retail Group LLC)")
    ).toBeInTheDocument();

    // Verify Element 10 dynamically computes 6-digit roots from lines
    expect(screen.getByText("10. PO-Matched HTSUS (Consistency Checked)")).toBeInTheDocument();
    expect(screen.getByText(/6109\.10 · 6907\.21/i)).toBeInTheDocument();
  });

  it("renders Decision Log with substantive Sign-Off Note / Justification column (CHAOS-09)", () => {
    render(<ExportModal isOpen={true} onClose={() => {}} data={sampleAudit} />);

    // Switch to Decision Log tab
    const logTab = screen.getByRole("button", { name: /Document Hash & Exception Audit Log/i });
    fireEvent.click(logTab);

    expect(screen.getByText("Sign-Off Note / Justification")).toBeInTheDocument();
    expect(
      screen.getByText(/Accepted 10 ctn split tolerance per buyer email agreement/i)
    ).toBeInTheDocument();
  });

  it("sanitizes CSV formula injection characters and maps unreferenced invoice lines (CHAOS-01 & CHAOS-08)", () => {
    const { container } = render(
      <ExportModal isOpen={true} onClose={() => {}} data={sampleAudit} />
    );

    // Click download button to generate CSV
    const csvPre = container.querySelector("pre");
    expect(csvPre).toBeInTheDocument();
    const csvContent = csvPre?.textContent || "";

    // CHAOS-08: Leading '=' formula injection should be escaped with leading single quote "'"
    expect(csvContent).toContain("\"'=cmd|' /C calc'!A0\"");

    // CHAOS-01: Line 2 (unreferenced ceramic tiles) should be mapped as UNREFERENCED-PO with HSN 6907.21.00
    expect(csvContent).toContain("UNREFERENCED-PO");
    expect(csvContent).toContain("6907.21.00");
  });
});
