import { describe, it, expect, beforeEach, vi } from "vitest";
import { getWorkspaceId } from "../workspace";
import {
  fetchShipments,
  getShipments,
  auditPacket,
  runAudit,
  deleteShipment,
  resetWorkspace,
  fetchSessionByToken,
  getSession,
  reAuditSupplierPacket,
  reAudit,
  patchDiscrepancy,
  claimWorkspace,
} from "../api";
import { supabase } from "../supabase";

describe("Workspace Sandbox ID & API Header Attachment", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("generates a sandbox_<uuid> ID on first call, persists in localStorage, and returns same ID on subsequent calls", () => {
    expect(localStorage.getItem("portgate_workspace_id")).toBeNull();

    const id1 = getWorkspaceId();
    expect(id1).toMatch(/^sandbox_[a-f0-9-]+$/);
    expect(localStorage.getItem("portgate_workspace_id")).toBe(id1);

    const id2 = getWorkspaceId();
    expect(id2).toBe(id1);
    expect(localStorage.getItem("portgate_workspace_id")).toBe(id1);
  });

  it("attaches X-Workspace-Id header to buyer endpoints", async () => {
    const wsId = getWorkspaceId();

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ([]),
      text: async () => "",
    });
    vi.stubGlobal("fetch", mockFetch);

    // 1. fetchShipments / getShipments
    await fetchShipments();
    expect(mockFetch).toHaveBeenLastCalledWith(
      expect.stringContaining("/api/shipments"),
      expect.objectContaining({
        headers: expect.objectContaining({
          "X-Workspace-Id": wsId,
        }),
      })
    );

    // 2. deleteShipment
    await deleteShipment("shp_123");
    expect(mockFetch).toHaveBeenLastCalledWith(
      expect.stringContaining("/api/shipments/shp_123"),
      expect.objectContaining({
        method: "DELETE",
        headers: expect.objectContaining({
          "X-Workspace-Id": wsId,
        }),
      })
    );

    // 3. resetWorkspace
    await resetWorkspace();
    expect(mockFetch).toHaveBeenLastCalledWith(
      expect.stringContaining("/api/workspace/reset"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "X-Workspace-Id": wsId,
        }),
      })
    );

    // 4. auditPacket / runAudit
    const formData = new FormData();
    formData.append("mock", "true");
    await auditPacket(formData);
    expect(mockFetch).toHaveBeenLastCalledWith(
      expect.stringContaining("/api/audit"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "X-Workspace-Id": wsId,
        }),
        body: formData,
      })
    );

    // 5. patchDiscrepancy
    await patchDiscrepancy("shp_123", "DISC-1", {
      resolution_state: "ACCEPTED_EXCEPTION",
      actor_role: "BUYER_WORKBENCH",
    });
    expect(mockFetch).toHaveBeenLastCalledWith(
      expect.stringContaining("/api/links/shp_123/discrepancies/DISC-1"),
      expect.objectContaining({
        method: "PATCH",
        headers: expect.objectContaining({
          "X-Workspace-Id": wsId,
          "Content-Type": "application/json",
        }),
      })
    );
  });

  it("supplier magic link endpoints work via token parameter without requiring localStorage", async () => {
    // Clear localStorage to simulate fresh zero-login supplier session
    localStorage.clear();

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ session_token: "shp_supplier_token" }),
      text: async () => "",
    });
    vi.stubGlobal("fetch", mockFetch);

    // 1. fetchSessionByToken / getSession
    const session = await fetchSessionByToken("shp_supplier_token");
    expect(session.session_token).toBe("shp_supplier_token");
    expect(mockFetch).toHaveBeenLastCalledWith(
      expect.stringContaining("/api/links/shp_supplier_token"),
      expect.objectContaining({
        cache: "no-store",
      })
    );

    // 2. reAuditSupplierPacket / reAudit
    const form = new FormData();
    form.append("mock", "true");
    await reAuditSupplierPacket("shp_supplier_token", form);
    expect(mockFetch).toHaveBeenLastCalledWith(
      expect.stringContaining("/api/links/shp_supplier_token/re-audit"),
      expect.objectContaining({
        method: "POST",
        body: form,
      })
    );
  });

  it("attaches Authorization Bearer token alongside X-Workspace-Id when Supabase session is active and tests claimWorkspace", async () => {
    const wsId = getWorkspaceId();
    const token = "jwt_access_token_xyz";

    vi.spyOn(supabase.auth, "getSession").mockResolvedValue({
      data: {
        session: { access_token: token } as any,
      },
      error: null,
    });

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: "success", claimed_count: 2, owner_id: "user_test_1" }),
      text: async () => "",
    });
    vi.stubGlobal("fetch", mockFetch);

    // 1. getShipments attaches Bearer token
    await getShipments();
    expect(mockFetch).toHaveBeenLastCalledWith(
      expect.stringContaining("/api/shipments"),
      expect.objectContaining({
        headers: expect.objectContaining({
          "X-Workspace-Id": wsId,
          Authorization: `Bearer ${token}`,
        }),
      })
    );

    // 2. claimWorkspace attaches Bearer token and X-Workspace-Id
    const claimRes = await claimWorkspace();
    expect(claimRes.claimed_count).toBe(2);
    expect(mockFetch).toHaveBeenLastCalledWith(
      expect.stringContaining("/api/workspace/claim"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "X-Workspace-Id": wsId,
          Authorization: `Bearer ${token}`,
        }),
      })
    );
  });
});

