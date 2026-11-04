import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UploadPacketModal } from "../layout/UploadPacketModal";
import * as api from "@/lib/api";
import { mockActiveAuditV1 } from "@/test/fixtures";

describe("UploadPacketModal Component", () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(api, "runAudit").mockResolvedValue(mockActiveAuditV1);
  });

  it("renders all 3 direct PDF dropzones, 5% tolerance band, and no simulation mode toggle", () => {
    render(
      <UploadPacketModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    // 1. Dropzones
    expect(screen.getByText(/1\. Buyer Purchase Order \(PDF\)/i)).toBeInTheDocument();
    expect(screen.getByText(/2\. Commercial Invoice \(PDF\)/i)).toBeInTheDocument();
    expect(screen.getByText(/3\. Packing List \(PDF\)/i)).toBeInTheDocument();

    // 2. Tolerance band input default 5%
    expect(screen.getByText(/Split-Shipment Tolerance Band/i)).toBeInTheDocument();
    const toleranceInput = screen.getByRole("spinbutton");
    expect(toleranceInput).toHaveValue(5);

    // 3. Guarantee NO "Quick Simulation Mode" toggle exists
    expect(screen.queryByText(/simulation mode/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/quick simulation/i)).not.toBeInTheDocument();
  });

  it("keeps Execute 3-Way Audit disabled initially and when only 1 or 2 PDFs are uploaded", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <UploadPacketModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const submitBtn = screen.getByRole("button", { name: /execute 3-way audit/i });
    expect(submitBtn).toBeDisabled();

    const fileInputs = container.querySelectorAll<HTMLInputElement>('input[type="file"]');
    expect(fileInputs.length).toBe(3);

    const poFile = new File(["%PDF dummy po"], "po.pdf", { type: "application/pdf" });
    const invFile = new File(["%PDF dummy inv"], "inv.pdf", { type: "application/pdf" });
    const plFile = new File(["%PDF dummy pl"], "pl.pdf", { type: "application/pdf" });

    // Upload only PO (1 of 3)
    await user.upload(fileInputs[0], poFile);
    expect(submitBtn).toBeDisabled();

    // Upload Invoice (2 of 3)
    await user.upload(fileInputs[1], invFile);
    expect(submitBtn).toBeDisabled();

    // Upload Packing List (3 of 3) -> should enable!
    await user.upload(fileInputs[2], plFile);
    expect(submitBtn).toBeEnabled();
  });

  it("submits 3 PDF files and tolerance, calls runAudit, and triggers onSuccess callback", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <UploadPacketModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    const fileInputs = container.querySelectorAll<HTMLInputElement>('input[type="file"]');
    const poFile = new File(["%PDF dummy po"], "po.pdf", { type: "application/pdf" });
    const invFile = new File(["%PDF dummy inv"], "inv.pdf", { type: "application/pdf" });
    const plFile = new File(["%PDF dummy pl"], "pl.pdf", { type: "application/pdf" });

    await user.upload(fileInputs[0], poFile);
    await user.upload(fileInputs[1], invFile);
    await user.upload(fileInputs[2], plFile);

    const submitBtn = screen.getByRole("button", { name: /execute 3-way audit/i });
    expect(submitBtn).toBeEnabled();

    await user.click(submitBtn);

    await waitFor(() => {
      expect(api.runAudit).toHaveBeenCalled();
    });

    const formDataPassed = vi.mocked(api.runAudit).mock.calls[0][0];
    expect(formDataPassed.get("tolerance_pct")).toBe("5");
    expect(formDataPassed.get("po_pdf")).toBeTruthy();
    expect(formDataPassed.get("inv_pdf")).toBeTruthy();
    expect(formDataPassed.get("pl_pdf")).toBeTruthy();

    expect(mockOnSuccess).toHaveBeenCalledWith(mockActiveAuditV1);
    expect(mockOnClose).toHaveBeenCalled();
  });
});

