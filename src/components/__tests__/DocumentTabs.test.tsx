import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { DocumentTabs, itemTouchesDoc } from "../inspector/DocumentTabs";
import type { AuditResponse, DiscrepancyItem } from "@/lib/types";
import { mockActiveAuditV1 } from "@/test/fixtures";

describe("DocumentTabs & itemTouchesDoc (BUG-01 Regression Tests)", () => {
  describe("itemTouchesDoc: Discrepancy-to-document mapping", () => {
    it("DISC-SUPPLIER-MISMATCH with explicit source docs & cells touches po and inv, but NEVER pl", () => {
      const item: Partial<DiscrepancyItem> = {
        id: "DISC-SUPPLIER-MISMATCH",
        source_doc_a: "Buyer PO",
        source_doc_b: "Commercial Invoice",
        cells: ["po-seller", "inv-exporter"],
        locs: [["po", "Buyer PO"], ["inv", "Commercial Invoice"]],
      };

      expect(itemTouchesDoc(item, "po")).toBe(true);
      expect(itemTouchesDoc(item, "inv")).toBe(true);
      expect(itemTouchesDoc(item, "pl")).toBe(false);
    });

    it("DISC-WEIGHT-INV with invoice-only cells touches inv, but NEVER pl or po", () => {
      const item: Partial<DiscrepancyItem> = {
        id: "DISC-WEIGHT-INV",
        source_doc_a: "Commercial Invoice",
        cells: ["inv-net-wt3", "inv-gross-wt3"],
        locs: [["inv", "Commercial Invoice"]],
      };

      expect(itemTouchesDoc(item, "inv")).toBe(true);
      expect(itemTouchesDoc(item, "pl")).toBe(false);
      expect(itemTouchesDoc(item, "po")).toBe(false);
    });

    it("Fallback ID matching: DISC-SUPPLIER-MISMATCH does not match pl via substring 'PL'", () => {
      // No cells, source docs, or locs provided — tests fallback regex
      const fallbackSupplierItem = {
        id: "DISC-SUPPLIER-MISMATCH",
      };

      expect(itemTouchesDoc(fallbackSupplierItem, "po")).toBe(true);
      expect(itemTouchesDoc(fallbackSupplierItem, "inv")).toBe(true);
      expect(itemTouchesDoc(fallbackSupplierItem, "pl")).toBe(false);
    });

    it("Fallback ID matching: DISC-PO-MISMATCH touches po and inv, but NEVER pl", () => {
      const fallbackPoMismatch = {
        id: "DISC-PO-MISMATCH",
      };

      expect(itemTouchesDoc(fallbackPoMismatch, "po")).toBe(true);
      expect(itemTouchesDoc(fallbackPoMismatch, "inv")).toBe(true);
      expect(itemTouchesDoc(fallbackPoMismatch, "pl")).toBe(false);
    });

    it("Fallback ID matching: DISC-WEIGHT-INV does not touch pl", () => {
      const fallbackWeightInv = {
        id: "DISC-WEIGHT-INV",
      };

      expect(itemTouchesDoc(fallbackWeightInv, "inv")).toBe(true);
      expect(itemTouchesDoc(fallbackWeightInv, "pl")).toBe(false);
      expect(itemTouchesDoc(fallbackWeightInv, "po")).toBe(false);
    });

    it("Fallback ID matching: DISC-CARTONS correctly touches inv and pl", () => {
      const fallbackCartons = {
        id: "DISC-CARTONS",
      };

      expect(itemTouchesDoc(fallbackCartons, "po")).toBe(false);
      expect(itemTouchesDoc(fallbackCartons, "inv")).toBe(true);
      expect(itemTouchesDoc(fallbackCartons, "pl")).toBe(true);
    });
  });

  describe("DocumentTabs component: badge counter accuracy", () => {
    it("does NOT increment Packing List badge counter when discrepancies only affect PO and Invoice", () => {
      const mockData: AuditResponse = {
        ...mockActiveAuditV1,
        discrepancies: [
          {
            id: "DISC-SUPPLIER-MISMATCH",
            category: "DETERMINISTIC_CONFLICT",
            severity: "CRITICAL",
            sev: "crit",
            title: "Supplier Name Discrepancy",
            body: "Exporter does not match PO vendor.",
            impact: "CBP hold",
            fix: "Update vendor details",
            source_doc_a: "Buyer PO",
            source_doc_b: "Commercial Invoice",
            cells: ["po-seller", "inv-exporter"],
            locs: [["po", "Buyer PO"], ["inv", "Commercial Invoice"]],
            resolution_state: "UNRESOLVED",
          },
          {
            id: "DISC-WEIGHT-INV",
            category: "DETERMINISTIC_CONFLICT",
            severity: "CRITICAL",
            sev: "crit",
            title: "Line #3 Weight Inversion",
            body: "Net weight exceeds gross weight on invoice.",
            impact: "Customs hold",
            fix: "Fix weights",
            source_doc_a: "Commercial Invoice",
            cells: ["inv-net-wt3"],
            locs: [["inv", "Commercial Invoice"]],
            resolution_state: "UNRESOLVED",
          },
        ],
        items: [],
      };

      render(
        <DocumentTabs
          activeTab="po"
          setActiveTab={() => {}}
          data={mockData}
        />
      );

      const poTab = screen.getByRole("button", { name: /1 · buyer purchase order/i });
      const invTab = screen.getByRole("button", { name: /2 · commercial invoice/i });
      const plTab = screen.getByRole("button", { name: /3 · packing list/i });

      // PO should show badge "1"
      expect(within(poTab).getByText("1")).toBeInTheDocument();

      // Invoice should show badge "2"
      expect(within(invTab).getByText("2")).toBeInTheDocument();

      // Packing List must NOT show any numeric badge counter
      expect(within(plTab).queryByText("1")).not.toBeInTheDocument();
      expect(within(plTab).queryByText("2")).not.toBeInTheDocument();
      // Instead, PL tab shows clean emerald state (0 unresolved errors)
      expect(within(plTab).queryByRole("status")).not.toBeInTheDocument();
    });
  });
});
