import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ShipmentQueueDashboard from "../page";
import * as api from "@/lib/api";
import * as AuthContextModule from "@/context/AuthContext";
import { mockShipmentList } from "@/test/fixtures";
import { mockRouter } from "@/test/setup";

describe("Shipment Queue Dashboard (Command Center)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(api, "getShipments").mockResolvedValue([...mockShipmentList]);
    vi.spyOn(api, "deleteShipment").mockResolvedValue({ status: "success", deleted_token: "shp_action_1" });
    vi.spyOn(api, "resetWorkspace").mockResolvedValue({ status: "success", owner_id: "sandbox_default", message: "Reset ok" });
  });

  it("renders accurate KPI strip counts and total USD under audit", async () => {
    render(<ShipmentQueueDashboard />);

    // Wait for table to finish loading
    await waitFor(() => {
      expect(screen.queryByText(/loading shipment queue/i)).not.toBeInTheDocument();
    });

    // 1. Total Active KPI
    expect(screen.getByText("Total Active")).toBeInTheDocument();
    // 3 total shipments in mockShipmentList
    const totalShipmentElements = screen.getAllByText("3");
    expect(totalShipmentElements.length).toBeGreaterThan(0);

    // 2. Total USD: 34620 + 18500 + 25000 = $78,120.00
    expect(screen.getByText(/\$78,120\.00/)).toBeInTheDocument();

    // 3. Action Required: 1
    expect(screen.getByText("Action Required")).toBeInTheDocument();

    // 4. Awaiting Supplier: 1
    expect(screen.getByText("Awaiting Supplier")).toBeInTheDocument();

    // 5. Cleared for Customs: 1
    expect(screen.getByText("Cleared for Customs")).toBeInTheDocument();

    // Verify all 3 rows are initially present
    expect(screen.getByText("#SHP-2026-8841")).toBeInTheDocument();
    expect(screen.getByText("#SHP-2026-9021")).toBeInTheDocument();
    expect(screen.getByText("#SHP-2026-7712")).toBeInTheDocument();
  });

  it("filters table rows when clicking KPI cards or filter tabs", async () => {
    const user = userEvent.setup();
    render(<ShipmentQueueDashboard />);

    await waitFor(() => {
      expect(screen.getByText("#SHP-2026-8841")).toBeInTheDocument();
    });

    // Click "Action Required" filter tab
    const actionTab = screen.getByRole("button", { name: /action required/i });
    await user.click(actionTab);

    // Should only show #SHP-2026-8841
    expect(screen.getByText("#SHP-2026-8841")).toBeInTheDocument();
    expect(screen.queryByText("#SHP-2026-9021")).not.toBeInTheDocument();
    expect(screen.queryByText("#SHP-2026-7712")).not.toBeInTheDocument();

    // Click "Cleared" filter tab
    const clearedTab = screen.getByRole("button", { name: /cleared/i });
    await user.click(clearedTab);

    // Should only show #SHP-2026-7712
    expect(screen.queryByText("#SHP-2026-8841")).not.toBeInTheDocument();
    expect(screen.queryByText("#SHP-2026-9021")).not.toBeInTheDocument();
    expect(screen.getByText("#SHP-2026-7712")).toBeInTheDocument();

    // Reset back to All
    const allTab = screen.getByRole("button", { name: /^all/i });
    await user.click(allTab);
    expect(screen.getByText("#SHP-2026-8841")).toBeInTheDocument();
    expect(screen.getByText("#SHP-2026-9021")).toBeInTheDocument();
    expect(screen.getByText("#SHP-2026-7712")).toBeInTheDocument();
  });

  it("filters rows in real-time using search input", async () => {
    const user = userEvent.setup();
    render(<ShipmentQueueDashboard />);

    await waitFor(() => {
      expect(screen.getByText("#SHP-2026-8841")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search by po #/i);

    // Filter by PO number "PO-PCR-45012"
    await user.type(searchInput, "PO-PCR-45012");
    expect(screen.getByText("#SHP-2026-8841")).toBeInTheDocument();
    expect(screen.queryByText("#SHP-2026-9021")).not.toBeInTheDocument();
    expect(screen.queryByText("#SHP-2026-7712")).not.toBeInTheDocument();

    // Clear and filter by supplier "Surat"
    await user.clear(searchInput);
    await user.type(searchInput, "Surat");
    expect(screen.queryByText("#SHP-2026-8841")).not.toBeInTheDocument();
    expect(screen.queryByText("#SHP-2026-9021")).not.toBeInTheDocument();
    expect(screen.getByText("#SHP-2026-7712")).toBeInTheDocument();

    // Search something nonexistent
    await user.clear(searchInput);
    await user.type(searchInput, "NONEXISTENT_QUERY_123");
    expect(screen.getByText("No shipments found")).toBeInTheDocument();
  });

  it("navigates to shipment workbench on row click", async () => {
    const user = userEvent.setup();
    render(<ShipmentQueueDashboard />);

    await waitFor(() => {
      expect(screen.getByText("#SHP-2026-8841")).toBeInTheDocument();
    });

    const row = screen.getByText("#SHP-2026-8841").closest("tr");
    expect(row).not.toBeNull();
    await user.click(row!);

    expect(mockRouter.push).toHaveBeenCalledWith("/shipments/shp_action_1");
  });

  it("shows Copy Supplier Magic Link only when unresolved_count > 0, and hides it when unresolved_count === 0", async () => {
    render(<ShipmentQueueDashboard />);

    await waitFor(() => {
      expect(screen.getByText("#SHP-2026-8841")).toBeInTheDocument();
    });

    // Row 1 (unresolved_count = 3): Copy button must be visible
    const row1 = screen.getByText("#SHP-2026-8841").closest("tr")!;
    const copyBtnRow1 = within(row1).getByTitle("Copy Supplier Magic Link");
    expect(copyBtnRow1).toBeInTheDocument();

    // Row 2 (unresolved_count = 1): Copy button must be visible
    const row2 = screen.getByText("#SHP-2026-9021").closest("tr")!;
    const copyBtnRow2 = within(row2).getByTitle("Copy Supplier Magic Link");
    expect(copyBtnRow2).toBeInTheDocument();

    // Row 3 (unresolved_count = 0, CLEARED_WITH_EXCEPTIONS): Copy button must be HIDDEN
    const row3 = screen.getByText("#SHP-2026-7712").closest("tr")!;
    expect(within(row3).queryByTitle("Copy Supplier Magic Link")).not.toBeInTheDocument();
  });

  it("deleting a shipment calls deleteShipment and stops event propagation", async () => {
    const user = userEvent.setup();
    render(<ShipmentQueueDashboard />);

    await waitFor(() => {
      expect(screen.getByText("#SHP-2026-8841")).toBeInTheDocument();
    });

    const row1 = screen.getByText("#SHP-2026-8841").closest("tr")!;
    const deleteBtn = within(row1).getByTitle("Delete test shipment run");

    await user.click(deleteBtn);

    // Must call API delete
    expect(api.deleteShipment).toHaveBeenCalledWith("shp_action_1");
    // Must NOT trigger row click navigation
    expect(mockRouter.push).not.toHaveBeenCalled();
    // Row is optimistically removed from view
    expect(screen.queryByText("#SHP-2026-8841")).not.toBeInTheDocument();
  });

  it("clicking Reset Sandbox calls resetWorkspace and re-fetches shipments", async () => {
    const user = userEvent.setup();
    render(<ShipmentQueueDashboard />);

    await waitFor(() => {
      expect(screen.getByText("#SHP-2026-8841")).toBeInTheDocument();
    });

    const resetBtn = screen.getByTitle("Reset sandbox to initial clean demo state");
    await user.click(resetBtn);

    expect(api.resetWorkspace).toHaveBeenCalled();
    expect(api.getShipments).toHaveBeenCalledTimes(2); // Initial mount + after reset
  });

  it("renders Private Sandbox and Sign In button when anonymous, and user email + Sign Out when authenticated", async () => {
    // 1. Anonymous state (default)
    const { unmount } = render(<ShipmentQueueDashboard />);
    await waitFor(() => {
      expect(screen.getByText("Private Sandbox")).toBeInTheDocument();
    });
    expect(screen.getByText("Reset Sandbox")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /sign in \/ save workspace/i })).toHaveAttribute("href", "/login");
    unmount();

    // 2. Authenticated state
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: { email: "importer@pacificcoast.com" } as any,
      session: { access_token: "mock_jwt" } as any,
      isLoading: false,
      signOut: vi.fn(),
      claimWorkspace: vi.fn(),
    });

    render(<ShipmentQueueDashboard />);
    await waitFor(() => {
      expect(screen.getByText("importer@pacificcoast.com")).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument();
    expect(screen.queryByText("Private Sandbox")).not.toBeInTheDocument();
  });
});
