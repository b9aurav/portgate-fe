import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import SupplierPortalPage from "../[token]/page";
import * as api from "@/lib/api";
import { mockActiveAuditV1, mockClearedAuditV2 } from "@/test/fixtures";

// Mock API module
vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    getSession: vi.fn(),
    reAudit: vi.fn(),
  };
});

describe("Supplier Magic Link Revision Portal (/upload/[token])", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Active State: renders 2 dropzones, keeps Buyer PO locked, enables submit when files are selected, and calls reAudit", async () => {
    const user = userEvent.setup();
    const token = "shp_test_token";

    vi.mocked(api.getSession).mockResolvedValue({
      ...mockActiveAuditV1,
      session_token: token,
    });

    vi.mocked(api.reAudit).mockResolvedValue({
      ...mockClearedAuditV2,
      session_token: token,
    });

    render(<SupplierPortalPage />);

    // Wait for session data to load
    await waitFor(() => {
      expect(screen.getByText("#SHP-2026-8841")).toBeInTheDocument();
    });

    // Verify header status and locked exporter banner
    expect(screen.getByText("ACTION REQUIRED")).toBeInTheDocument();
    expect(screen.getAllByText(/shreeji/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Rev v1")).toBeInTheDocument();

    // Verify 2-file revision dropzone header
    expect(screen.getByText("Upload Corrected Documents")).toBeInTheDocument();
    expect(
      screen.getByText(/2-file revision dropzone · locked buyer po baseline/i)
    ).toBeInTheDocument();

    // Verify the 2 specific dropzones are rendered
    expect(screen.getByText("Commercial Invoice PDF")).toBeInTheDocument();
    expect(screen.getByText("Final Packing List PDF")).toBeInTheDocument();

    // Crucial Guardrail: Ensure there is NO Buyer PO dropzone in the revision portal
    expect(screen.queryByText(/Buyer Purchase Order PDF/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Upload Purchase Order/i)).not.toBeInTheDocument();

    // Submit button is disabled before selecting any files
    const submitBtn = screen.getByRole("button", {
      name: /run revision audit against locked buyer po/i,
    });
    expect(submitBtn).toBeDisabled();

    // Find the 2 file input elements
    const fileInputs = document.querySelectorAll('input[type="file"]') as NodeListOf<HTMLInputElement>;
    expect(fileInputs.length).toBe(2);

    const dummyInvoice = new File(["dummy invoice"], "inv_revised.pdf", {
      type: "application/pdf",
    });
    const dummyPL = new File(["dummy pl"], "pl_revised.pdf", {
      type: "application/pdf",
    });

    // Upload revised files
    fireEvent.change(fileInputs[0], { target: { files: [dummyInvoice] } });
    fireEvent.change(fileInputs[1], { target: { files: [dummyPL] } });

    // File names should appear in dropzone preview
    await waitFor(() => {
      expect(screen.getByText("inv_revised.pdf")).toBeInTheDocument();
      expect(screen.getByText("pl_revised.pdf")).toBeInTheDocument();
    });

    // Button is now enabled
    expect(submitBtn).toBeEnabled();

    // Click submit to run re-audit
    await user.click(submitBtn);

    // Verify api.reAudit was called with the token and FormData containing both files
    await waitFor(() => {
      expect(api.reAudit).toHaveBeenCalledWith(token, expect.any(FormData));
    });

    const calledFormData = vi.mocked(api.reAudit).mock.calls[0][1] as FormData;
    expect(calledFormData.get("invoice_file")).toBeTruthy();
    expect(calledFormData.get("packing_list_file")).toBeTruthy();

    // After re-audit completes, portal updates to Rev v2 Cleared state
    await waitFor(() => {
      expect(screen.getByText("Rev v2 Final")).toBeInTheDocument();
      expect(screen.getByText("Shipment Packet Verified & Locked")).toBeInTheDocument();
    });
  });

  it("Cleared State: locks portal, hides dropzones and re-audit button, and displays verified confirmation card", async () => {
    const token = "shp_test_token";

    vi.mocked(api.getSession).mockResolvedValue({
      ...mockClearedAuditV2,
      session_token: token,
      summary: {
        ...mockClearedAuditV2.summary,
        status: "CLEARED_WITH_EXCEPTIONS",
        unresolved_count: 0,
      },
    });

    render(<SupplierPortalPage />);

    // Wait for cleared session data to load
    await waitFor(() => {
      expect(screen.getByText("Shipment Packet Verified & Locked")).toBeInTheDocument();
    });

    // Emerald confirmation card header and badge
    expect(screen.getByText("Rev v2 Final")).toBeInTheDocument();
    expect(
      screen.getByText(/all pre-shipment discrepancies have been resolved and signed off/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/no further document uploads are permitted/i)
    ).toBeInTheDocument();

    // Guardrail: Dropzones and Re-audit button must NOT be rendered in cleared state
    expect(screen.queryByText("Upload Corrected Documents")).not.toBeInTheDocument();
    expect(screen.queryByText("Commercial Invoice PDF")).not.toBeInTheDocument();
    expect(screen.queryByText("Final Packing List PDF")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: /run revision audit against locked buyer po/i,
      })
    ).not.toBeInTheDocument();
  });

  it("Expired/Invalid Token: renders friendly error screen when session is not found", async () => {
    vi.mocked(api.getSession).mockRejectedValue(new Error("Session not found"));

    render(<SupplierPortalPage />);

    await waitFor(() => {
      expect(screen.getByText("Audit Session Not Found or Expired")).toBeInTheDocument();
    });

    expect(
      screen.getByRole("link", { name: /return to shipments queue/i })
    ).toHaveAttribute("href", "/");
  });

  it("Revoked Link: renders lockout screen when buyer has revoked the magic link", async () => {
    const token = "shp_revoked_token";
    vi.mocked(api.getSession).mockResolvedValue({
      ...mockActiveAuditV1,
      session_token: token,
      link_revoked: true,
    });

    render(<SupplierPortalPage />);

    await waitFor(() => {
      expect(screen.getByText("Link Revoked by Buyer")).toBeInTheDocument();
    });

    expect(
      screen.getByText(/this supplier revision link has been revoked or expired/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /return to shipments queue/i })
    ).toHaveAttribute("href", "/");
  });
});
