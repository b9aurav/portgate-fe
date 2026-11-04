/**
 * api.ts — Centralized API service for PortGate compliance engine.
 * Communicates with the FastAPI backend (/api/audit, /api/links/{token}, etc.).
 * Attaches X-Workspace-Id for per-browser sandbox isolation on buyer routes.
 */

import type {
  AuditResponse,
  HealthResponse,
  PatchResolutionPayload,
  ShipmentListItem,
} from "./types";
import { getWorkspaceId } from "./workspace";
import { supabase } from "./supabase";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  detail?: string;

  constructor(message: string, status: number, detail?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = "An error occurred";
    try {
      const errJson = await res.json();
      detail = errJson.detail || JSON.stringify(errJson);
    } catch {
      detail = await res.text();
    }
    throw new ApiError(detail, res.status, detail);
  }
  return res.json();
}

/**
 * Builds request headers attaching X-Workspace-Id and Supabase Authorization Bearer token when logged in.
 */
export async function getAuthHeaders(extra: Record<string, string> = {}): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    "X-Workspace-Id": getWorkspaceId(),
    ...extra,
  };
  try {
    const { data } = await supabase.auth.getSession();
    if (data?.session?.access_token) {
      headers["Authorization"] = `Bearer ${data.session.access_token}`;
    }
  } catch {
    // If Supabase is unreachable or in mock mode, proceed with X-Workspace-Id
  }
  return headers;
}

/**
 * Check backend health and configuration
 */
export async function getHealth(): Promise<HealthResponse> {
  const res = await fetch(`${API_BASE}/api/health`, {
    cache: "no-store",
  });
  return handleResponse<HealthResponse>(res);
}

/**
 * Fetch all active shipments for the multi-shipment dashboard queue
 * scoped to the current user (or browser's sandbox workspace if anonymous).
 */
export async function getShipments(): Promise<ShipmentListItem[]> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/shipments`, {
    cache: "no-store",
    headers,
  });
  return handleResponse<ShipmentListItem[]>(res);
}

/**
 * Delete a shipment audit session by session_token within the current workspace.
 */
export async function deleteShipment(token: string): Promise<{ status: string; deleted_token: string }> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/shipments/${token}`, {
    method: "DELETE",
    headers,
  });
  return handleResponse<{ status: string; deleted_token: string }>(res);
}

/**
 * Reset current workspace to initial clean demo state.
 */
export async function resetWorkspace(): Promise<{ status: string; owner_id: string; message: string }> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/workspace/reset`, {
    method: "POST",
    headers,
  });
  return handleResponse<{ status: string; owner_id: string; message: string }>(res);
}

/**
 * Migrate anonymous sandbox shipments into authenticated user account.
 */
export async function claimWorkspace(customToken?: string): Promise<{ status: string; claimed_count: number; owner_id: string }> {
  const headers = await getAuthHeaders();
  if (customToken) {
    headers["Authorization"] = `Bearer ${customToken}`;
  }
  const res = await fetch(`${API_BASE}/api/workspace/claim`, {
    method: "POST",
    headers,
  });
  return handleResponse<{ status: string; claimed_count: number; owner_id: string }>(res);
}

/**
 * Run initial 3-way pre-shipment compliance audit.
 * Sends po_pdf, inv_pdf, pl_pdf, tolerance_pct, mock scoped to current workspace.
 */
export async function runAudit(formData: FormData): Promise<AuditResponse> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/api/audit`, {
    method: "POST",
    headers,
    body: formData,
  });
  return handleResponse<AuditResponse>(res);
}

/**
 * Fetch dynamic session state by public token (Public & Zero-Auth).
 */
export async function getSession(token: string): Promise<AuditResponse> {
  const res = await fetch(`${API_BASE}/api/links/${token}`, {
    cache: "no-store",
  });
  return handleResponse<AuditResponse>(res);
}

/**
 * Re-audit session with revised supplier documents (Public & Zero-Auth).
 * Sends invoice_file and/or packing_list_file.
 */
export async function reAudit(
  token: string,
  formData: FormData
): Promise<AuditResponse> {
  const res = await fetch(`${API_BASE}/api/links/${token}/re-audit`, {
    method: "POST",
    body: formData,
  });
  return handleResponse<AuditResponse>(res);
}

/**
 * Update resolution state for a specific discrepancy item.
 */
export async function patchDiscrepancy(
  token: string,
  discrepancyId: string,
  payload: PatchResolutionPayload
): Promise<AuditResponse> {
  const headers = await getAuthHeaders({ "Content-Type": "application/json" });
  const res = await fetch(
    `${API_BASE}/api/links/${token}/discrepancies/${discrepancyId}`,
    {
      method: "PATCH",
      headers,
      body: JSON.stringify(payload),
    }
  );
  return handleResponse<AuditResponse>(res);
}

// Backward-compatible named aliases
export const fetchShipments = getShipments;
export const auditPacket = runAudit;
export const fetchSessionByToken = getSession;
export const reAuditSupplierPacket = reAudit;

