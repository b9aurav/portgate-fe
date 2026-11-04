import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BuyerWorkbenchPage from "../[token]/page";
import * as api from "@/lib/api";
import { mockActiveAuditV1, mockClearedAuditV2, mockShipmentList } from "@/test/fixtures";

describe("Buyer Exception Workbench (/shipments/[token])", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(api, "getShipments").mockResolvedValue([...mockShipmentList]);
    vi.spyOn(api, "getSession").mockResolvedValue(mockActiveAuditV1);
    vi.spyOn(api, "getShipment").mockImplementation((token: string) => api.getSession(token));
    vi.spyOn(api, "patchDiscrepancy").mockResolvedValue(mockClearedAuditV2);
    vi.spyOn(api, "reopenShipment").mockResolvedValue(mockActiveAuditV1);
    vi.spyOn(api, "extendLinkExpiry").mockResolvedValue(mockActiveAuditV1);
  });

  it("TopNavbar: renders breadcrumb switcher, Copy Revision Link when active, and View Supplier Portal when cleared", async () => {
    const user = userEvent.setup();

    // 1. Test Active State (mockActiveAuditV1, unresolved_count = 3 > 0)
    const { unmount } = render(<BuyerWorkbenchPage />);

    await waitFor(() => {
      expect(screen.getByText("All Shipments")).toBeInTheDocument();
    });

    // Check switcher dropdown showing shipment ref and rev
    expect(screen.getByText("#SHP-2026-8841")).toBeInTheDocument();
    expect(screen.getByText("Rev v1")).toBeInTheDocument();

    // Primary Copy Revision Link button must be visible when unresolved_count > 0
    const copyLinkBtn = screen.getByRole("button", { name: /copy revision link/i });
    expect(copyLinkBtn).toBeInTheDocument();

    // View Supplier Portal link should NOT be shown
    expect(screen.queryByText("View Supplier Portal")).not.toBeInTheDocument();

    // Clicking dropdown chevron opens WhatsApp / Email notice preview
    const chevronBtn = screen.getByTitle(/copy whatsapp \/ email discrepancy notice/i);
    await user.click(chevronBtn);
    expect(screen.getByText(/whatsapp \/ email notice preview/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /copy notice/i })).toBeInTheDocument();

    unmount();

    // 2. Test Cleared State (mockClearedAuditV2, unresolved_count = 0)
    vi.mocked(api.getSession).mockResolvedValue(mockClearedAuditV2);
    render(<BuyerWorkbenchPage />);

    await waitFor(() => {
      expect(screen.getByText("Rev v2")).toBeInTheDocument();
    });

    // Copy Revision Link split button must be HIDDEN when unresolved_count === 0
    expect(screen.queryByRole("button", { name: /copy revision link/i })).not.toBeInTheDocument();

    // "Reopen for Revision" button and subtle "View Supplier Portal" link must be SHOWN
    expect(screen.getByRole("button", { name: /reopen for revision/i })).toBeInTheDocument();
    const portalLink = screen.getByRole("link", { name: /view supplier portal/i });
    expect(portalLink).toBeInTheDocument();
    expect(portalLink).toHaveAttribute("href", expect.stringContaining("/upload/"));
  });

  it("DocumentTabs: shows error count badges when active, and 0 error badges (emerald checkmarks) when cleared", async () => {
    // 1. Active State (mockActiveAuditV1 has 2 critical, 1 warning)
    const { unmount } = render(<BuyerWorkbenchPage />);

    await waitFor(() => {
      expect(screen.getByText("Critical (2)")).toBeInTheDocument();
    });

    // Check tabs show numeric error badges: PO has 1, Invoice has 3, PL has 1
    const poTabActive = screen.getByRole("button", { name: /1 · buyer purchase order/i });
    const invTabActive = screen.getByRole("button", { name: /2 · commercial invoice/i });
    const plTabActive = screen.getByRole("button", { name: /3 · packing list/i });
    expect(within(poTabActive).getByText("1")).toBeInTheDocument();
    expect(within(invTabActive).getByText("3")).toBeInTheDocument();
    expect(within(plTabActive).getByText("1")).toBeInTheDocument();

    // Check extraction confidence pill
    expect(screen.getByTestId("extraction-confidence-pill")).toBeInTheDocument();
    expect(screen.getByText(/99.4% Extraction Confidence/i)).toBeInTheDocument();

    // Unmount and render Cleared State
    unmount();
    vi.mocked(api.getSession).mockResolvedValue(mockClearedAuditV2);
    render(<BuyerWorkbenchPage />);

    await waitFor(() => {
      expect(screen.getByText("Rev v2")).toBeInTheDocument();
    });

    // In cleared state, no tab should have a numeric badge like "1", "2", or "3"
    const poTab = screen.getByRole("button", { name: /1 · buyer purchase order/i });
    const invTab = screen.getByRole("button", { name: /2 · commercial invoice/i });
    const plTab = screen.getByRole("button", { name: /3 · packing list/i });

    // Numeric badge spans have text of positive numbers; verify none exist
    expect(within(poTab).queryByText(/^[1-9]\d*$/)).not.toBeInTheDocument();
    expect(within(invTab).queryByText(/^[1-9]\d*$/)).not.toBeInTheDocument();
    expect(within(plTab).queryByText(/^[1-9]\d*$/)).not.toBeInTheDocument();
  });

  it("DiscrepancyQueue: computes unresolved counts for filter tabs and toggles diff banner View in Resolved", async () => {
    const user = userEvent.setup();
    // Audit with Revision 2, 4 auto-resolved items and 1 remaining unresolved warning
    const rev2WithUnresolved = {
      ...mockClearedAuditV2,
      summary: {
        ...mockClearedAuditV2.summary,
        status: "ACTION_REQUIRED" as const,
        warning_count: 1,
        unresolved_count: 1,
      },
      items: [
        ...mockClearedAuditV2.items,
        mockActiveAuditV1.items[2], // DISC-QTY-2 unresolved warning
      ],
    };
    vi.mocked(api.getSession).mockResolvedValue(rev2WithUnresolved);

    render(<BuyerWorkbenchPage />);

    await waitFor(() => {
      expect(screen.getByText("All (1)")).toBeInTheDocument();
    });

    // Counters count only unresolved items for All, Critical, Warning, and total resolved for Resolved
    expect(screen.getByText("All (1)")).toBeInTheDocument();
    expect(screen.getByText("Critical (0)")).toBeInTheDocument();
    expect(screen.getByText("Warning (1)")).toBeInTheDocument();
    expect(screen.getByText("Resolved (5)")).toBeInTheDocument();

    // Verify green diff banner
    expect(screen.getByText(/rev v2: 4 conflicts cleared by supplier/i)).toBeInTheDocument();

    // When on "All (1)" tab: View in Resolved button should be visible
    const viewResolvedBtn = screen.getByRole("button", { name: /view in resolved/i });
    expect(viewResolvedBtn).toBeInTheDocument();

    // Click "View in Resolved ->" (switches filter to RESOLVED)
    await user.click(viewResolvedBtn);

    // In Resolved view, "View in Resolved ->" button is auto-hidden
    expect(screen.queryByRole("button", { name: /view in resolved/i })).not.toBeInTheDocument();
  });

  it("Accepting a commercial variance patches the resolution, transitions status to CLEARED, and enables export", async () => {
    const user = userEvent.setup();

    // Create a scenario where only DISC-QTY-2 is unresolved
    const singleVarianceAudit = {
      ...mockActiveAuditV1,
      summary: {
        ...mockActiveAuditV1.summary,
        critical_count: 0,
        warning_count: 1,
        unresolved_count: 1,
      },
      items: [
        mockActiveAuditV1.items[2], // DISC-QTY-2 (COMMERCIAL_VARIANCE)
      ],
    };
    vi.mocked(api.getSession).mockResolvedValue(singleVarianceAudit);

    render(<BuyerWorkbenchPage />);

    await waitFor(() => {
      expect(screen.getByText("Accept Variance")).toBeInTheDocument();
    });

    // Click "Accept Variance" on the commercial variance card
    const acceptBtn = screen.getByRole("button", { name: /accept variance/i });
    await user.click(acceptBtn);

    // Reason chip selection appears
    expect(screen.getByText(/select variance approval reason:/i)).toBeInTheDocument();

    // Confirm sign-off
    const confirmBtn = screen.getByRole("button", { name: /confirm sign-off/i });
    await user.click(confirmBtn);

    // Verify patchDiscrepancy called with ACCEPTED_EXCEPTION
    await waitFor(() => {
      expect(api.patchDiscrepancy).toHaveBeenCalledWith(
        singleVarianceAudit.session_token,
        "DISC-QTY-2",
        expect.objectContaining({
          resolution_state: "ACCEPTED_EXCEPTION",
          actor_role: "BUYER_WORKBENCH",
        })
      );
    });

    // Summary banner transitions to CLEARED WITH EXCEPTIONS
    await waitFor(() => {
      expect(screen.getByText("CLEARED WITH EXCEPTIONS")).toBeInTheDocument();
    });

    // Export button is enabled
    const exportBtn = screen.getByRole("button", { name: /export broker worksheet & isf schedule/i });
    expect(exportBtn).toBeEnabled();
  });

  it("Customs Clearance Package Modal: opens and switches between CSV, ISF 10+2, and Decision Log tabs", async () => {
    const user = userEvent.setup();
    vi.mocked(api.getSession).mockResolvedValue(mockClearedAuditV2);

    render(<BuyerWorkbenchPage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /export broker worksheet & isf schedule/i })).toBeEnabled();
    });

    const openExportBtn = screen.getByRole("button", { name: /export broker worksheet & isf schedule/i });
    await user.click(openExportBtn);

    // Modal title & Compliance Notice
    expect(screen.getByText("Pre-Entry Broker Handoff & ISF Worksheet")).toBeInTheDocument();
    expect(screen.getByText(/Compliance Advisory:/i)).toBeInTheDocument();

    // 1. Initial tab: Broker Handoff Schedule CSV
    expect(screen.getByRole("button", { name: /broker handoff schedule csv/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /download broker csv/i })).toBeInTheDocument();

    // 2. Switch to ISF Pre-Check Worksheet (10+2)
    const isfTab = screen.getByRole("button", { name: /isf pre-check worksheet/i });
    await user.click(isfTab);
    expect(screen.getByText(/7\. Importer of Record No\./i)).toBeInTheDocument();
    expect(screen.getByText(/buyer \/ consignee/i)).toBeInTheDocument();

    // 3. Switch to Document Hash & Exception Audit Log
    const logTab = screen.getByRole("button", { name: /document hash & exception audit log/i });
    await user.click(logTab);

    // Verify SHA-256 proof badge
    expect(screen.getByText(/sha-256 proof:/i)).toBeInTheDocument();
    expect(screen.getByText(/sha256:/i)).toBeInTheDocument();

    // Verify signed-off exception ledger
    expect(screen.getByText("Logged Audit Sign-Offs & Exceptions")).toBeInTheDocument();
    expect(screen.getAllByText("Approved PO Amendment #2").length).toBeGreaterThanOrEqual(1);
  });

  it("Reopened State: displays amber review banner, keeps resolved items strictly in Resolved tab, and avoids conflicting green banner", async () => {
    const reopenedAudit = {
      ...mockClearedAuditV2,
      reopened_for_revision: true,
      auto_resolved_in_latest_rev: ["DISC-CARTONS", "DISC-MATH-3", "DISC-WEIGHT-INV", "DISC-HS-1"],
      summary: {
        ...mockClearedAuditV2.summary,
        status: "AWAITING_SUPPLIER_REVISION" as const,
        unresolved_count: 0,
      },
    };

    vi.mocked(api.getSession).mockResolvedValue(reopenedAudit);
    render(<BuyerWorkbenchPage />);

    await waitFor(() => {
      expect(screen.getByText(/⚠️ Packet Reopened for Supplier Revision — Active Review Mode/i)).toBeInTheDocument();
    });

    // Green cleared diff banner must NOT be displayed
    expect(screen.queryByText(/conflicts cleared by supplier/i)).not.toBeInTheDocument();

    // Tab counts: All (0), Critical (0), Warning (0), Resolved (5)
    expect(screen.getByRole("button", { name: /^All \(0\)$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Critical \(0\)$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Warning \(0\)$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Resolved \(5\)$/i })).toBeInTheDocument();

    // Summary Card displays AWAITING SUPPLIER REVISION
    expect(screen.getByText("AWAITING SUPPLIER REVISION")).toBeInTheDocument();
  });
});
