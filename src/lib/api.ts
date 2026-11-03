/**
 * api.ts — Centralized API service for PortGate compliance engine.
 * Communicates with the FastAPI backend (/api/audit, /api/links/{token}, etc.).
 */

import type {
  AuditResponse,
  HealthResponse,
  PatchResolutionPayload,
  ShipmentListItem,
} from "./types";

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
 * Check backend health and configuration
 */
export async function getHealth(): Promise<HealthResponse> {
  const res = await fetch(`${API_BASE}/api/health`, {
    cache: "no-store",
  });
  return handleResponse<HealthResponse>(res);
}

/**
 * Fetch all active shipments for the multi-shipment dashboard queue.
 */
export async function getShipments(): Promise<ShipmentListItem[]> {
  const res = await fetch(`${API_BASE}/api/shipments`, {
    cache: "no-store",
  });
  return handleResponse<ShipmentListItem[]>(res);
}

/**
 * Delete a shipment audit session by session_token.
 */
export async function deleteShipment(token: string): Promise<{ status: string; deleted_token: string }> {
  const res = await fetch(`${API_BASE}/api/shipments/${token}`, {
    method: "DELETE",
  });
  return handleResponse<{ status: string; deleted_token: string }>(res);
}

/**
 * Run initial 3-way pre-shipment compliance audit.
 * Sends po_pdf, inv_pdf, pl_pdf, tolerance_pct, mock.
 */
export async function runAudit(formData: FormData): Promise<AuditResponse> {
  const res = await fetch(`${API_BASE}/api/audit`, {
    method: "POST",
    body: formData,
  });
  return handleResponse<AuditResponse>(res);
}

/**
 * Fetch dynamic session state by public token.
 */
export async function getSession(token: string): Promise<AuditResponse> {
  const res = await fetch(`${API_BASE}/api/links/${token}`, {
    cache: "no-store",
  });
  return handleResponse<AuditResponse>(res);
}

/**
 * Re-audit session with revised supplier documents.
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
  const res = await fetch(
    `${API_BASE}/api/links/${token}/discrepancies/${discrepancyId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  return handleResponse<AuditResponse>(res);
}

